# ADR-0023: Frontend Layering Hardening — Frontera de capas enforceable por budgets monótonos

- Estado: Propuesto
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

`portal-control` gobierna su design system (ADR-0020) y su estado remoto
(ADR-0022) con **budgets monótonos decrecientes** y guardrails ejecutables: el
audit script falla si el drift sube, `design-system-budget.json` está en
`totalIssuesBudget: 0`, y `stateBoundaryGuardrails.test.ts` congela la
whitelist de slices que pueden tocar servicios en exactamente 2 entradas.

**La frontera de capas de la UI quedó fuera de ese modelo.** El estándar sí
está escrito (`frontend/src/features/README.md`: `components` = UI interna,
`containers` = orquestación, `views` = presentación pura, `hooks` = reglas de
negocio), pero **no es enforceable**, y la auditoría del 2026-10-21 (583
archivos, 698 TS/TSX, ~75.8K LOC) confirma la fuga:

1. **La única regla que protege la capa de vista está atada al sufijo del
   archivo.** `frontend/eslint.config.js:174` aplica
   `no-restricted-imports` / `no-restricted-globals` / `no-restricted-properties`
   al glob `src/**/*.view.tsx`. Prohíbe `services/`, `store/`, `react-router`,
   `fetch`, `localStorage`, `sessionStorage` y `window.location` — **pero no
   prohíbe hooks de React**, y **no aplica a `components/*.tsx`**, que es donde
   vive el 75% del código de UI.
2. **95 de 236 componentes no-view (40%) mezclan estado y presentación.**
   De ellos, **56 son "grandes con lógica inline"** (>150 líneas, hooks en el
   cuerpo del componente y sin container/view gemelo): 49 en
   `features/**/components/` y 7 en `components/ui/` (`ReportTable.tsx` 549,
   `DatePicker.tsx` 406, `DatePickerDialog.tsx` 158, `TabNav.tsx` 177,
   `AuditMonthSelector.tsx` 225, `CalendarMonthSelector.tsx` 215,
   `UserManualModal.tsx` 178). **7 de ellos
   tienen la lógica realmente inline** y son los que el spec obliga a partir:
   `features/configuration/components/GlobalVariablesManager.tsx`
   (865 líneas, 19 hooks), `features/supervisor-dashboard/components/RequestsTab.tsx`
   (594, 11), `features/configuration/components/SmtpConfigModal.tsx`
   (427), `features/configuration/components/DeveloperPanel.tsx` (421, 22),
   `features/meters/components/MeterHistory.tsx` (407, 10) y
   `features/governance/components/AuditLogsView.tsx` (405, 10).
   Dos archivos de más de 400 líneas **no** son infracción:
   `features/governance/components/AuditLogFilterPanel.tsx` (457, **0 hooks**:
   presentacional puro) y
   `features/supervisor-dashboard/components/AccountingClosureTab.tsx` (419,
   **1 hook**: `useAccountingClosureTabController`, que ya extrae la lógica).
3. **5 vistas violan la "presentación pura"**:
   `features/design-system/views/DesignSystemCatalog.view.tsx` (517 líneas,
   7 hooks — **es además la entrada de ruta**; el feature no tiene
   `containers/` ni `hooks/`), `features/worker-portal/views/WorkerPortal.view.tsx`
   (506, 2), `components/layout/PersistentLayout.view.tsx` (1 `useRef` del gesto
   de swipe), `features/communications/views/Communications.view.tsx` (124, 1) y
   `features/auth/components/ChangePasswordModal.view.tsx` (89, 1). El quinto
   solo es detectable con **AST**: su hook se llama con genérico
   (`useRef<number | null>(null)`), que un regex no ve.
4. **La capa de componentes bypasea la capa de datos**:
   `features/configuration/components/DeveloperPanel.tsx:249` y
   `features/employee-management/components/ShiftHistoryModal.tsx:60` hacen
   `fetch` crudo, y `components/ui/UserManualModal.tsx:64` hace
   `fetch("/ManualRelojControl.md")` (3 en total);
   `features/governance/components/IntegritySummaryView.tsx:52` hace
   `queryClient.invalidateQueries` inline. **8 componentes importan
   `services/` por valor** (`MFASetupModal`, `DeveloperPanel`,
   `GlobalVariablesManager`, `SeedingProgressModal`, `SmtpConfigModal`,
   `ImportModal`, `ShiftHistoryModal`, `ExportLogsModal`); los `import type`
   quedan permitidos.
5. **El estado de UI puro vive en 3 "hogares"**, con el store global como
   peor infractor: `dashboardSlice` (10 flags de modal, uno de ellos
   `quickActionRecord`, consumido por **dos** features a la vez — `time-control`
   **y** `dashboard`), `quickNotesSlice.isQuickNotesModalOpen` y
   `authSlice.isForcePasswordChangeModalOpen`, conviviendo con ~40 `useState`
   locales en hooks de feature para el mismo concepto.
6. **Capas muertas**: `src/types/contexts.ts` (218 LOC, 0 referencias),
   `src/hooks/useDataRefresher.ts` (`return null`),
   `src/hooks/useLogs.ts` (handlers no-op),
   `src/hooks/useServerTime.ts` (alias puro de `useBusinessNow`),
   `store/slices/notificationSlice.ts` (`loadNotifications` setea `[]` sin
   pedir nada), `store/slices/correctionRequestSlice.ts` (cuerpo vacío, aún
   invocado en `src/hooks/useSocketEvents.ts:114`).
7. **Inversión de capas nominal**: 9 archivos shim de 1 línea en
   `features/*/components/` re-exportan un container, porque **una vista
   importa un container** vía `React.lazy(() => import("../components/X"))`;
   y `features/kiosk/pages/KioskPage.tsx` tiene 3 líneas, violando la regla 1
   del propio `features/README.md`.

El patrón correcto **ya existe y está probado** en 13 features (dashboard,
time-control, logbook, meters, communications, governance, theoretical-shifts,
employee-management, user-management, personnel-management, planning,
shift-calendar, worker-portal): `hooks/use<X>Controller.ts` →
`containers/<X>.container.tsx` (un único elemento JSX: `<XView {...} />`) →
`views/<X>.view.tsx` (presentación pura por props). Los 38 containers
existentes **ninguno** tiene más de un elemento JSX. El problema no es de
diseño: es de **cobertura y de enforcement**.

## Decisión

1. **La frontera de vista pasa de convención a invariante verificable.**
   Se añade a `frontend/eslint.config.js` una regla que prohíbe **cualquier hook
   de React** en `src/**/*.view.tsx` — el patrón es `/^use[A-Z]/` (cubre
   `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useReducer`,
   `useContext`, `useId` y cualquier hook de dominio como `useToasts`) más los
   miembros `React.use*`, de modo que **cualquier** hook queda fuera de una
   vista; y otra que prohíbe JSX de presentación en `src/**/*.container.tsx`
   (un container emite exactamente una vista y nada más; **no** puede emitir
   elementos DOM intrínsecos ni fragmentos con múltiples hijos, pero **sí** puede
   componer otros containers **como props**). Se añade el guardrail
   `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts` con **budgets
   congelados en constantes exportadas**, inicializados al conteo real
   medido y **solo decrecientes** — el mismo patrón que ya gobierna
   `design-system-budget.json` y `stateBoundaryGuardrails.test.ts`:
   `VIEW_HOOK_BUDGET=5` (→ 1 al cerrar T7), `HOOKED_COMPONENT_BUDGET=95`,
   `LARGE_HOOKED_COMPONENT_BUDGET=56`, `SERVICE_IMPORT_BUDGET=8`,
   `RAW_FETCH_BUDGET=3`, `INLINE_CACHE_INVALIDATION_BUDGET=1`. El conteo se
   hace sobre el **AST de TypeScript**, no con expresiones regulares.
   **Crecer cualquier budget falla el CI; reducirlo nunca exige editar el
   test.** La implementación y los conteos verificados están en
   [spec 033](file:///specs/033-frontend-layering-hardening/spec.md).
   La regla de hooks se activa como `error` desde el primer día con una
   **allowlist temporal explícita** para los 5 views offenders, cuya retirada
   está asignada a tareas concretas: así el ratchet de lint 0/0 se respeta
   desde el primer PR sin aplazar la frontera.

2. **El invariante de cobertura es un ratchet, no un fallo duro.** Un
   componente de la capa de componentes que llame hooks de React, supere 150
   líneas y **no** tenga un `.container.tsx` / `.view.tsx` gemelo en el mismo
   feature **es una infracción que se cuenta**, no un CI roto de inmediato: el
   guardrail falla solo cuando el conteo **supera**
   `LARGE_HOOKED_COMPONENT_BUDGET` (baseline 56, verificado: 49 en
   `features/**/components/` + 7 en `components/ui/`). Esto bloquea infracciones
   nuevas y obliga a bajar el conteo con cada migración (56 → 50). No se exige
   llegar a 0 en esta iteración: hacerlo exigiría refactors cosméticos sobre
   componentes legítimos (p. ej. `components/ui/DatePicker.tsx`). Cuando el
   conteo llegue a 0, el budget baja a 0 y el invariante pasa a ser de fallo
   duro **sin cambiar una línea del guardrail**.

3. **El estado de UI efímero vive en su feature.** El store global queda
   reservado a **estado de proceso**: sesión, tema, toasts, cola de sync y
   offset de reloj. Los flags de "modal abierto" migran al feature que los
   muestra, vía `useState` local o un `use*Controller` del feature. Se extiende
   `stateBoundaryGuardrails.test.ts` con un invariante de flags de modal en el
   store, con whitelist explícita y congelada.
   **Tres flags no admiten la migración mecánica**, porque su señal no está en
   el flag sino en su origen, y se resuelven de forma explícita:
   - `authSlice.isForcePasswordChangeModalOpen` se asigna desde la respuesta
     de login (`loginResponse.mustChangePassword === true`): el slice
     **conserva** esa señal **como propiedad de sesión dentro de `currentUser`**
     y el `useAuthModalController` del feature `auth` la lee para abrir el
     modal y la limpia al cambiar la contraseña. Mover el flag a un `useState`
     local perdería la señal y rompería el cambio forzado de contraseña
     (invariante de seguridad de la spec 002).
   - `quickActionRecord` e `isEditTimestampModalOpen` los consumen **dos
     features a la vez** (`QuickActionModal` y `EditTimestampModal` se montan
     en `time-control` y en `dashboard`, que además los importa del feature
     hermano): no hay un "feature consumidor" único, así que
     `EditTimestampModal.container.tsx` deja de leer del store global y
     **recibe props controladas**, y cada container que monta el modal
     instancia su propio hook de estado local.
   - `quickNotesSlice.hasUnreadNotes` no es estado derivado de datos remotos:
     `QuickNote` **no tiene campo read/unread** en la API y la señal se enciende
     solo con el evento WebSocket `quickNote:created` con el modal cerrado. La
     migración preserva esa semántica y cablea el badge de `ToolsPanel` (que se
     monta por el `WIDGET_REGISTRY` del dashboard, sin props) de forma
     explícita, sin inventar una cuarta fuente de verdad.

4. **Las capas muertas se borran, no se anotan.** `src/types/contexts.ts`,
   `useDataRefresher.ts`, `useLogs.ts`, `useServerTime.ts`, los stubs
   `notificationSlice` y `correctionRequestSlice`, los campos
   `syncSlice.conflicts` y `syncSlice.bulkAddRecords` (sin consumidores; la
   cola de escritura offline de la spec 032 **no se toca**
   funcionalmente), los 9 shims de 1 línea y `features/kiosk/pages/KioskPage.tsx`.

5. **El enforcement se apoya en la capa, no en el sufijo.** A futuro, las
   reglas de frontera se expresan contra **globs de carpeta**
   (`features/**/views/**`, `features/**/containers/**`) y no contra el sufijo
   `.view.tsx`, para que un archivo mal nombrado no quede fuera del radar. En
   esta spec se mantiene el sufijo (compatibilidad con los 39 `.view.tsx`
   existentes) pero **se añade el invariante de cobertura de AC3**, que es
   la defensa real contra el archivo mal nombrado.

## Alternativas consideradas

1. **Radix UI / shadcn / MUI como fuente de las primitivas** — descartada
   porque ADR-0020 ya decidió que el diseño es propiedad del producto y
   porque la clasificación de primitivas ya está resuelta y certificada (65 archivos en
   `design-system-certified.json`). Se mantiene.
2. **Reescribir todo el frontend en un framework de componentes** — descartada
   por costo y riesgo: el 38% de componentes con hooks es un problema de
   _ubicación del código_, no de falta de abstracción. Extraer hooks a
   `features/<dominio>/hooks/` resuelve el problema sin reescribir nada.
3. **Migrar los hooks de React fuera de los componentes sin regla ESLint**
   (solo goodness discipline) — descartada porque el repo ya demostró que la
   disciplina sin enforcement se erosiona: el propio
   `features/README.md` declara la regla 2 desde marzo de 2026 y el patrón está
   aplicado en 13 de 19 features. Un ratchet con budget es lo que convierte la
   disciplina en invariante.
4. **Prohibir hooks en `components/**` en bloque** — descartada por
   irreducibilidad: muchos componentes legítimos son interactivos y dependen
   de estado local trivial (`useState` de un input, `useRef` de un canvas de
   virtualización). El criterio correcto no es "cero hooks" sino "cero hooks
   **con estado de dominio o de datos**"; por eso el spec apunta a extraer a
   hooks de dominio y a medir la cobertura con un **budget decreciente**
   (`LARGE_HOOKED_COMPONENT_BUDGET`), en lugar de un ban plano.
   La variante "fallo duro desde el día 1" (todo componente con hooks y >150
   líneas debe tener gemelo) se descartó además por **irreductibilidad
   cuantificada**: el baseline real es **56** componentes, no 6 — llegar a 0
   exigiría refactors cosméticos sobre componentes legítimos como
   `components/ui/DatePicker.tsx` o `components/ui/ReportTable.tsx`.
5. **Dejar el estado de modal en el store global** — descartada porque
   contradice la invariante 4 de `.agents/rules/frontend-performance.md`
   (Zustand para estado de proceso, no para colecciones ni flags de UI) y
   porque `dashboardSlice` ya demonstrated el costo: 10 flags que cruzan
   features y que nadie puede razonar sin leer el slice entero.

## Consecuencias

Positivas:

- La separación UI/UX deja de ser aspiracional y pasa a ser **verificable en
  CI**: cualquier PR que reintroduzca la mezcla falla antes del review.
- Los 6 budgets son un **indicador de progreso objetivo** para el repo, no
  una métrica decorativa.
- El store global queda con un contrato corto y auditable (5 slices de estado
  de proceso), lo que reduce el radio de impacto de cada cambio de estado.
- Se elimina ~700 LOC de código muerto y de indirección (9 shims, 4 hooks
  muertos, 218 LOC de tipos de contexto, 2 stubs de slice).
- El patrón container/view/hook queda **documentado con su excepción**
  (componentes interactivos con estado local trivial), lo que evita el
  backlash de un ban indiscriminado.
- La frontera queda **explícita sobre lo que NO es infracción**: dos archivos
  de más de 400 líneas sin gemelo (`AuditLogFilterPanel.tsx`, con 0 hooks, y
  `AccountingClosureTab.tsx`, que ya delega en `useAccountingClosureTabController`)
  quedan documentados como tales, para que nadie los "descubra" después como
  deuda oculta.

Negativas / costos aceptados:

- **Costo de migración alto pero acotado**: 7 componentes con lógica inline y
  4 vistas se parten. Cada migración es un PR revisable; el repo crece en
  archivos (~30 nuevos) a cambio de que cada archivo tenga una responsabilidad
  única.
- La regla de hooks en `.view.tsx` se activa como `error` desde el primer día
  con una **allowlist temporal explícita** para los 4 offenders; el ruido de
  lint es acotado y su retirada tiene tarea asignada (T7, T8).
- **Riesgo de regresión funcional** en la migración de flags de modal
  (visibilidad y orden de aparición) y, en particular, en los tres casos con
  señal no trivial (cambio forzado de contraseña, modales montados en dos
  features, badge de notas sin leer que solo llega por WebSocket). Se mitiga
  con tests dedicados (auth, dashboard, time-control) y con los 56 tests e2e de
  Playwright, que son el contrato de regresión; los `data-testid` y roles ARIA
  **no se renombran**.
- La expulsión del estado de UI del store rompe cualquier consumidor externo del
  store (no hay ninguno fuera de `frontend/src`); verificado por grep.
- `HOOKED_COMPONENT_BUDGET=95` es alto y solo puede bajar lentamente: el
  spec **no** exige llegar a 0 en esta iteración (exigirlo produciría
  refactors cosméticos); los 7 con lógica inline sí son obligatorios.
- `LARGE_HOOKED_COMPONENT_BUDGET=56` queda en **50** al cierre: es un ratchet
  que bloquea infracciones nuevas, no un objetivo de llegar a 0. El remanente
  se documenta en la evidencia de cierre.

## Referencias

- `frontend/eslint.config.js:174` — bloque actual de `src/**/*.view.tsx` que
  inspired la regla de hooks (AC1, AC2).
- `frontend/src/features/README.md` — las 4 reglas del estándar que este ADR
  vuelve exigibles.
- `frontend/src/tests/guardrails/stateBoundaryGuardrails.test.ts` — patrón
  de budget congelado y whitelist congelada que se replica.
- `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts` — **nuevo**;
  los 6 budgets y los invariantes de cobertura.
- `frontend/src/store/slices/dashboardSlice.ts` — los 10 flags de modal a
  migrar.
- `frontend/src/features/design-system/views/DesignSystemCatalog.view.tsx` —
  el caso raíz: vista con 7 hooks que además es la entrada de ruta.
- `frontend/src/features/configuration/components/GlobalVariablesManager.tsx` —
  el componente más grande del árbol de features (865 líneas, 19 hooks).
- `frontend/src/features/configuration/components/DeveloperPanel.tsx:249` y
  `frontend/src/features/employee-management/components/ShiftHistoryModal.tsx:60`
  — `fetch` crudo en la capa de componentes.
- `frontend/src/features/governance/components/IntegritySummaryView.tsx:52` —
  invalidación de caché inline en un componente.
- `frontend/src/hooks/useSocketEvents.ts:114` — llamada al método vacío del
  slice muerto.
- `frontend/src/types/contexts.ts`, `frontend/src/hooks/useDataRefresher.ts`,
  `frontend/src/hooks/useLogs.ts`, `frontend/src/hooks/useServerTime.ts` —
  capas muertas a eliminar.
- [spec 033](file:///specs/033-frontend-layering-hardening/spec.md) —
  implementación, AC y plan.
- [ADR-0020](0020-design-system-governance.md) — gobernanza del design system
  que este ADR extiende con una tercera frontera.
- [ADR-0022](0022-ui-ux-consolidation.md) — consolidación de superficie UI y
  estado remoto; este ADR cierra la tercera frontera.
