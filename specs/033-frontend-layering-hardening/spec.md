# Spec 033: Frontend Layering Hardening

- Estado: Borrador
- Autor: zer0x
- Fecha: 2026-10-21
- ADR relacionado: [0023-frontend-layering-hardening.md](file:///docs/adr/0023-frontend-layering-hardening.md) (extiende [0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md) y [0022-ui-ux-consolidation.md](file:///docs/adr/0022-ui-ux-consolidation.md))
- Specs hermanos: [031-ui-ux-consolidation](file:///specs/031-ui-ux-consolidation/spec.md) (superficie UI), [032-remote-state-consolidation](file:///specs/032-remote-state-consolidation/spec.md) (estado remoto)

## Problema

La auditoría UI/UX del 2026-10-21 (583 archivos, 698 TS/TSX, ~75.8K LOC en
`frontend/src`) confirma que el diseño del sistema y la gobernanza del estado
remoto están consolidados (specs 031/032 cerradas, ADR-0022 Aceptado), pero
revela un **tercer frente sin blindar: la frontera de capas de la UI**.

El estándar **existe y está escrito**: `frontend/src/features/README.md`
(4 reglas: `components` = UI interna, `containers` = orquestación, `views` =
presentación pura por props, `hooks` = reglas de negocio) más la regla 2 de
`.agents/rules/design-system-governance.md`. El problema es que **ese estándar
no es enforceable**:

1. **La única regla que protege la capa de vista está atada al sufijo del
   archivo, no a la capa.** `frontend/eslint.config.js:174-228` aplica
   `no-restricted-imports` / `no-restricted-globals` / `no-restricted-properties`
   al glob `src/**/*.view.tsx`. Prohíbe `services/`, `store/`, `react-router`,
   `fetch`, `localStorage`, `sessionStorage` y `window.location` — **pero no
   prohíbe hooks de React**. Un archivo `components/X.tsx` (sin sufijo `.view.`)
   **no está cubierto por ninguna regla**: es tierra de nadie.
2. **95 de 236 componentes no-view (40%) mezclan estado y presentación.**
   De ellos, **56 son "grandes con lógica inline"**: >150 líneas, llaman hooks
   de React en el cuerpo del componente y **no tienen un `.container.tsx` /
   `.view.tsx` gemelo** en su feature (49 en `features/**/components/`, 7 en
   `components/ui/`: `ReportTable.tsx` 549, `DatePicker.tsx` 406,
   `DatePickerDialog.tsx` 158, `TabNav.tsx` 177, `AuditMonthSelector.tsx` 225,
   `CalendarMonthSelector.tsx` 215, `UserManualModal.tsx` 178). Los de lógica **realmente inline** (no
   delegan a un hook de controlador) son 7:
   `features/configuration/components/GlobalVariablesManager.tsx` (865 líneas,
   19 hooks), `features/supervisor-dashboard/components/RequestsTab.tsx` (594,
   11), `features/configuration/components/SmtpConfigModal.tsx` (427,
   `useState`+`useEffect`+`useToasts`), `features/configuration/components/DeveloperPanel.tsx`
   (421, 22), `features/meters/components/MeterHistory.tsx` (407, 10),
   `features/governance/components/AuditLogsView.tsx` (405, 10) y la vista
   `features/design-system/views/DesignSystemCatalog.view.tsx` (517, 7).
   **No son violaciones** (aun siendo grandes) los dos archivos de más de 400
   líneas sin lógica inline: `features/governance/components/AuditLogFilterPanel.tsx`
   (457, **0 hooks**: es presentacional puro) y
   `features/supervisor-dashboard/components/AccountingClosureTab.tsx` (419,
   **1 hook**: `useAccountingClosureTabController`, que ya extrae la lógica).
3. **5 vistas violan la "presentación pura"** porque llaman hooks:
   `features/design-system/views/DesignSystemCatalog.view.tsx` (517 líneas, 7
   hooks — además `useId` ×3 y `useToasts` ×1, y **es la entrada de ruta**;
   no existe `containers/` ni `hooks/` en ese feature),
   `features/worker-portal/views/WorkerPortal.view.tsx` (506, 2),
   `components/layout/PersistentLayout.view.tsx` (1 `useRef` para el gesto de
   swipe), `features/communications/views/Communications.view.tsx` (124, 1) y
   `features/auth/components/ChangePasswordModal.view.tsx` (89, 1).
   El quinto (`PersistentLayout`) **no lo detecta un regex**: su hook se
   llama con genérico (`useRef<number | null>(null)`), por lo que el conteo
   del guardrail se hace sobre el **AST de TypeScript**, no sobre texto.
4. **8 componentes importan `services/` por valor** (los `import type` quedan
   permitidos):
   `features/auth/components/MFASetupModal.tsx:2` (`authService`),
   `features/configuration/components/DeveloperPanel.tsx:27-28` (`API_BASE_URL`,
   `authService`), `features/configuration/components/GlobalVariablesManager.tsx:18`
   (`configService`), `features/configuration/components/SeedingProgressModal.tsx:11`
   (`healthService`), `features/configuration/components/SmtpConfigModal.tsx:3`
   (`emailService`), `features/employee-management/components/ImportModal.tsx:3`
   (`importService`), `features/employee-management/components/ShiftHistoryModal.tsx:4-5`,
   `features/governance/components/ExportLogsModal.tsx:3-4`.
   2 de ellos hacen además `fetch` crudo:
   `features/configuration/components/DeveloperPanel.tsx:249` y
   `features/employee-management/components/ShiftHistoryModal.tsx:60`; un
   tercero, fuera de `features/`, hace
   `fetch("/ManualRelojControl.md")` en
   `components/ui/UserManualModal.tsx:64` (asset estático del manual). Y
   `features/governance/components/IntegritySummaryView.tsx:52` hace
   `queryClient.invalidateQueries` inline (gestión imperativa de caché desde
   un componente).
5. **El estado de UI puro vive en 3 "hogares" distintos**, con el store
   global como peor infractor: `dashboardSlice` (10 flags de modal:
   `showReportDetailsModal`, `isAnomaliesModalOpen`, `quickActionRecord`,
   `isEditTimestampModalOpen`…), `quickNotesSlice.isQuickNotesModalOpen` y
   `authSlice.isForcePasswordChangeModalOpen` conviven con ~40 `useState`
   locales en hooks de feature para el mismo concepto. `dashboardSlice`
   además **cruza features**: `quickActionRecord` e
   `isEditTimestampModalOpen` los consumen **dos features a la vez** — los
   modales `QuickActionModal` y `EditTimestampModal` se montan en
   `features/time-control/views/TimeControl.view.tsx:230,268` **y** en
   `features/dashboard/views/Dashboard.view.tsx:153,170` (que además los
   importa del feature hermano: `import { EditTimestampModal, QuickActionModal }
from "../../time-control"`), y `EditTimestampModal.container.tsx` hoy **no
   recibe props**: lee todo del store global.
6. **Capas muertas**: `src/types/contexts.ts` (218 LOC, **0 referencias** en
   todo el árbol), `src/hooks/useDataRefresher.ts` (`return null`),
   `src/hooks/useLogs.ts` (handlers no-op), `src/hooks/useServerTime.ts` (alias
   puro de `useBusinessNow`), `store/slices/notificationSlice.ts`
   (`loadNotifications` setea `[]` sin pedir nada), `store/slices/correctionRequestSlice.ts`
   (cuerpo vacío), `syncSlice.conflicts` y `syncSlice.bulkAddRecords` (sin
   consumidores).
7. **Inversión de capas nominal**: 9 archivos shim de 1 línea en
   `features/*/components/` que re-exportan un container
   (`governance/components/{BackupListModal,SecurityInsightsView,SystemMaintenanceView}`,
   `theoretical-shifts/components/{PatternManager,AssignmentManager,HolidayManager,LeaveManager}`,
   `configuration/components/{EmailCenterView,MasterDataExportView}`). Existen
   porque **una vista importa un container** vía
   `React.lazy(() => import("../components/X"))`.
8. **`features/kiosk/pages/KioskPage.tsx` tiene 3 líneas**
   (`import KioskContainer` + `export default`) y viola la regla 1 del propio
   `features/README.md`: "Si un archivo solo hace `return <XContainer />`, no
   debe existir como `page`".

## Alcance

Dentro (workstream A–D):

- **A. Boundary enforceable (vista pura y container sin JSX)**: regla ESLint que
  prohíbe hooks de React en `src/**/*.view.tsx`; regla ESLint que exige que
  `*.container.tsx` no contenga JSX de presentación; guardrail nuevo
  `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts` con **budgets
  monótonos decrecientes** inicializados al conteo real medido; migración de
  los 4 views que hoy violan la pureza.
- **B. Migración de los contenedores que faltan**: `DesignSystemCatalog`
  (hoy view + route entry) se parte en `containers/` + `views/` + `hooks/`;
  `GlobalVariablesManager`, `RequestsTab`, `SmtpConfigModal`,
  `DeveloperPanel`, `AuditLogsView` y `MeterHistory` se parten en
  `.container.tsx` + `.view.tsx` + hook de dominio; los 5 modales restantes
  que importan `services/` por valor (`MFASetupModal`, `SeedingProgressModal`,
  `ImportModal`, `ExportLogsModal`, `ShiftHistoryModal`) resuelven sus imports
  y su `fetch` crudo desde hooks de dominio; `KioskPage.tsx` (3 líneas)
  se elimina y `App.tsx` apunta al container.
- **C. Unificación del estado de UI**: los flags de modal de
  `dashboardSlice` y `quickNotesSlice` migran a estado local del feature
  (patrón ya dominante en ~40 call sites), **preservando la señal de origen**
  de los tres casos no triviales (cambio forzado de contraseña, modales
  montados en dos features, badge de notas sin leer que solo llega por
  WebSocket); purga de los stubs muertos del store
  (`notificationSlice`, `correctionRequestSlice`, `syncSlice.conflicts`,
  `syncSlice.bulkAddRecords`); el store queda con **solo estado de proceso**
  (sesión, tema, toasts, sync, offset de reloj).
- **D. Purga de capas muertas y de la inversión nominal**: borrado de
  `src/types/contexts.ts`, `useDataRefresher.ts`, `useLogs.ts`,
  `useServerTime.ts` y los 9 shims de 1 línea (las vistas lazy-importan los
  containers directamente); unificación de la convención de nombres de hooks de
  feature (`use*Data` / `use*Controller` / `use*Logic` → una sola) y
  deduplicación de los 3 hooks responsive redundantes
  (`useMediaQuery` / `useScreenSize` / `usePrefersReducedMotion`).

Fuera (explícito, con spec propio):

- **Consolidación del cliente HTTP** → spec 034 (`frontend-http-client-consolidation`):
  los 13 services que usan `fetch` crudo (`configService`, `healthService`,
  `seedingService`, `kpiService`, `auditLogService`, `authService`,
  `schedulingService`, `holidayService`, `emailService`, `shiftReportService`,
  `correctionService`, `exportService`, `importService`), la unificación de la
  política 429 (`apiClient` vs `fetchGuards`) y la normalización de las raíces
  de query key (incluye el bug `["shiftReports"]` sin invalidar).
- **Modernización del stack de pruebas** → spec 035 (`frontend-testing-stack`):
  MSW, Vitest Browser Mode y regresión visual.
- **Primitivas de formulario y data grid** → spec 036 (`frontend-form-table-primitives`):
  TanStack Form, TanStack Table y validación con Zod.
- **Rendimiento de render y observabilidad** → spec 037
  (`frontend-rendering-observability`): React Compiler, container queries,
  `web-vitals`, Lighthouse CI y el logger estructurado con Sentry.
- **Catálogo del design system y pipeline de tokens** → spec 038
  (`design-system-catalog-pipeline`): Storybook/Ladle y Style Dictionary.
- Migración de backend, rutas HTTP, esquemas Prisma, `swagger.json` o SDK: el
  spec es de frontend puro.

## Criterios de aceptación

- [ ] AC1: **La capa de vista es enforceable, no declarativa**. `npm run lint`
      queda verde con budget 0/0 y una regla ESLint nueva que prohíbe
      **cualquier hook de React** en `src/**/*.view.tsx`: el patrón es
      `/^use[A-Z]/` (cubre `useState`, `useEffect`, `useMemo`, `useCallback`,
      `useRef`, `useReducer`, `useContext`, **`useId`** y cualquier hook de
      dominio como **`useToasts`**) más los miembros `React.use*`. La
      enumeración **no es una lista cerrada**: cualquier hook queda fuera de
      una vista. Los 5 views hoy-infractores
      (`DesignSystemCatalog.view`, `WorkerPortal.view`, `Communications.view`,
      `ChangePasswordModal.view`, `PersistentLayout.view`) quedan sin hooks o
      se reescriben como presentacional puro, y **`src/**/*.view.tsx` con
      hooks queda en 0**.
      **Orden de activación**: la regla se activa como `error` desde el
      primer día, pero los 5 views offenders quedan cubiertos por una
      **allowlist temporal explícita** (`eslint-disable` por archivo, listada
      y con tarea de retirada asignada: T7 para `WorkerPortal`,
      `Communications`, `ChangePasswordModal` y `PersistentLayout`, T8 para
      `DesignSystemCatalog`). El allowlist desaparece por completo al
      cerrarse T7+T8; el guardrail `VIEW_HOOK_BUDGET` (= 5 → 0) impide que
      vuelva a crecer. El `eslint-disable` es **de la regla completa**
      (`no-restricted-syntax`), por lo que suspende también los selectores de
      fecha de ese archivo: verificado, ninguna de las 5 views los incumple
      hoy, así que no se pierde cobertura real hasta la retirada.
- [ ] AC2: **Guardrail de pureza con budgets monótonos**. Nuevo
      `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts` con 5
      budgets decrementables inicializados al conteo real medido y **congelados**
      en constantes exportadas (el test falla si suben, nunca exige editar el
      test para bajarlos):
      | Budget | Baseline | Invariante |
      |--------|----------|------------|
      | `VIEW_HOOK_BUDGET` | 5 → 1 (tras T7) | views con hooks → 0 |
      | `HOOKED_COMPONENT_BUDGET` | 95 | componentes no-view con hooks |
      | `LARGE_HOOKED_COMPONENT_BUDGET` | 56 | componentes con hooks **y >150 líneas** sin container/view gemelo |
      | `SERVICE_IMPORT_BUDGET` | 8 | componentes que importan `services/` **por valor** |
      | `RAW_FETCH_BUDGET` | 3 | `fetch` crudo en componente |
      Más un invariante **no-budget** (`INLINE_CACHE_INVALIDATION_BUDGET` = 1 →
      0): ningún componente llama `queryClient.invalidateQueries` inline; debe
      vivir en un hook de mutación. El guardrail se agrega a
      `test:guardrails` y `lint:guardrails`.
      **Alcance del escaneo**: `frontend/src/features/**/components/**` **y**
      `frontend/src/components/ui/**` (236 ficheros de la capa de componentes,
      excluyendo `*.view.tsx` y `*.container.tsx`). Los `import type` de
      `services/` están permitidos (`BrandLogo.tsx` ya los usa). El conteo se
      hace sobre el **AST de TypeScript**: un regex no ve
      `useRef<number | null>(null)`, y esa diferencia cambia el resultado
      (5 vistas, 95 componentes y 56 componentes grandes). `RAW_FETCH_BUDGET` incluye
      `components/ui/UserManualModal.tsx:64` (`fetch("/ManualRelojControl.md")`),
      que es un **asset estático del manual** y por tanto entra en el budget
      como cualquier otro `fetch` en capa de componente.
- [ ] AC3: **El invariante "componente grande con hooks ⇒ tiene container
      gemelo" es un ratchet, no un fallo duro**. El guardrail **falla si el
      conteo actual de componentes con hooks y >150 líneas sin gemelo supera
      `LARGE_HOOKED_COMPONENT_BUDGET` (= 56)**: es decir, **bloquea componentes
      nuevos** con esa forma y **obliga a bajar** el conteo con cada migración
      de AC4 (56 → 50 al cerrar T9, T10, T11, T12, T13 y T15; la migración de
      `DesignSystemCatalog` no cuenta porque vive en `views/` y ya está cubierta
      por `VIEW_HOOK_BUDGET`). No se exige llegar a 0 en esta iteración:
      hacerlo exigiría refactors cosméticos sobre componentes legítimos (p. ej.
      `components/ui/DatePicker.tsx`, que es interactivo por naturaleza).
      Cuando el conteo llegue a 0, el budget baja a 0 y el invariante pasa a
      ser de fallo duro **sin cambiar una línea del guardrail**.
- [ ] AC4: **Los 7 contenedores que faltan existen**. Cada uno de
      `configuration/GlobalVariablesManager`, `configuration/SmtpConfigModal`,
      `supervisor-dashboard/RequestsTab`, `configuration/DeveloperPanel`,
      `governance/AuditLogsView`, `meters/MeterHistory` y
      `design-system/DesignSystemCatalog` queda partido en
      `<X>.container.tsx` (orquestación, sin JSX de presentación) +
      `<X>.view.tsx` (presentación pura, sin hooks) + hook de dominio en
      `features/<dominio>/hooks/`. **Regla de composición**: un container
      puede pasar **otros containers como props** (p. ej.
      `PersonnelManagement.container.tsx` pasa
      `employeesContent={<EmployeeManagementContainer isEmbedded />}` y
      `usersContent={<UserManagementContainer isEmbedded />}`), pero **no**
      puede emitir elementos DOM intrínsecos (`<div>`, `<span>`, …) ni
      fragmentos con múltiples hijos en su `return`. Ningún container nuevo
      supera 200 líneas ni contiene más de un elemento JSX **de primer nivel**.
- [ ] AC5: **`features/design-system` deja de ser una vista-route**. El
      feature pasa a tener `containers/`, `views/` y `hooks/`; `App.tsx` monta
      el container, no la vista; `DesignSystemCatalog.view.tsx` queda sin hooks
      y ≤ 300 líneas.
- [ ] AC6: **Cero shims y cero pages-wrapper**. Los 9 archivos shim de 1 línea
      de `features/*/components/` se eliminan y las vistas que los lazy-importan
      apuntan al container directamente; `features/kiosk/pages/KioskPage.tsx`
      (3 líneas) se elimina y `App.tsx` importa
      `features/kiosk/containers/Kiosk.container`. `src/features/**` no contiene
      ningún archivo de 1–3 líneas cuyo único propósito sea re-exportar otro
      archivo del mismo feature (verificado por grep + guardrail).
- [ ] AC7: **Un solo hogar para el estado de modal, sin perder señal de
      origen**. `dashboardSlice` y `quickNotesSlice` quedan sin flags de modal
      (o se eliminan si quedan vacíos) y todo flag de "modal abierto" vive en
      el feature que lo muestra, vía `useState` local o un hook
      `use*Controller` del feature. El store global conserva **solo** estado de
      proceso: sesión, tema, toasts, sync y offset de reloj. **Tres casos
      requieren un tratamiento explícito** (no son un "flag más"): 1. **`authSlice.isForcePasswordChangeModalOpen` NO es un flag de UI
      arbitrario**: se asigna en `authSlice.ts:189` a partir de
      `loginResponse.mustChangePassword === true` (invariante de seguridad
      de la spec 002) y el modal se monta en `App.tsx` **después** de
      desmontar `LoginPage`. Se conserva `mustChangePassword?: boolean`
      **como propiedad de sesión dentro de `currentUser`** (el slice lo
      emite, no el componente) y el `useAuthModalController` del feature
      `auth` lo lee para abrir el modal y lo limpia al cambiar la
      contraseña. El flujo de cambio forzado debe seguir funcionando
      idéntico. 2. **`quickActionRecord` e `isEditTimestampModalOpen` los consumen dos
      features**: `QuickActionModal` y `EditTimestampModal` se montan en
      `features/time-control/views/TimeControl.view.tsx:230,268` **y** en
      `features/dashboard/views/Dashboard.view.tsx:153,170`. Por eso
      `EditTimestampModal.container.tsx` deja de leer del store global y
      **recibe props controladas** (`isOpen`, `onClose`, `editingInfo`,
      `value`, `onSave`), y **cada container que monta el modal
      instanciará su propio hook de estado local** (dashboard y time-control
      por separado). Se elimina la importación cross-feature
      `from "../../time-control"` en `Dashboard.view.tsx`, que hoy invierte
      la dependencia entre features. 3. **`quickNotesSlice.hasUnreadNotes` no es "estado derivado de datos
      remotos"**: `QuickNote` **no tiene campo read/unread** en la API; la
      señal se enciende exclusivamente cuando llega el evento WebSocket
      `quickNote:created` **con el modal cerrado**
      (`quickNotesSlice.ts:24-31` + `useSocketEvents.ts:104-110`). La
      migración preserva esa semántica: el evento de socket sigue
      levantando la señal "hay notas sin leer" y el `handleOpenQuickNotes`
      la baja al abrir el modal. `ToolsPanel` (que muestra el badge) se
      monta por el `WIDGET_REGISTRY` del dashboard
      (`features/dashboard/components/withDashboardLazy.tsx:46`) **sin
      recibir props** de `Dashboard.container`: el cableado de esa señal
      queda explícito en la tarea correspondiente (contexto del store
      mínimo o un hook de dominio compartido), sin inventar una fourth
      fuente de verdad.
- [ ] AC8: **Store sin stubs muertos**. `notificationSlice`,
      `correctionRequestSlice`, `syncSlice.conflicts` y
      `syncSlice.bulkAddRecords` se eliminan (o se rellenan con comportamiento
      real si resultan necesarios), y `useSocketEvents.ts` deja de llamar a
      `handleCorrectionRequestSocketEvent`. Ningún slice expone un método que
      no haga nada.
- [ ] AC9: **Capas muertas eliminadas**. `src/types/contexts.ts`,
      `src/hooks/useDataRefresher.ts`, `src/hooks/useLogs.ts` y
      `src/hooks/useServerTime.ts` se borran junto con sus re-exports
      (`src/types/index.ts`), y `npm run check` + `npm run lint` quedan en verde
      con 0 referencias colgantes.
- [ ] AC10: **Hook responsive único**. `useMediaQuery`, `useScreenSize` y el
      `usePrefersReducedMotion` interno de `useSupervisorPerformance.ts` se
      consolidan en un solo hook con una API explícita
      (`useMediaQuery(query)` + `useBreakpoint()`); los listeners `resize`
      ad-hoc de `features/employee-management/hooks/useEmployeeManagementData.ts:64,108-110`
      se eliminan a favor del hook único.
- [ ] AC11: **Sin imports de `services/` en la capa de componentes**. Los 8
      componentes del baseline quedan en 0 (con excepción permitida
      exclusivamente para imports **solo de tipo** vía `import type`, que
      `BrandLogo.tsx` ya usa; el guardrail distingue tipo de valor):
      | Componente | Servicio importado | Destino |
      |---|---|---|
      | `configuration/GlobalVariablesManager.tsx` | `configService` | hook de dominio (T9) |
      | `configuration/SmtpConfigModal.tsx` | `emailService` | hook de dominio (T15) |
      | `configuration/DeveloperPanel.tsx` | `API_BASE_URL`, `authService` | hook de dominio (T11) |
      | `configuration/SeedingProgressModal.tsx` | `healthService` | hook de dominio (T16) |
      | `auth/MFASetupModal.tsx` | `authService` | hook del feature `auth` (T17) |
      | `employee-management/ImportModal.tsx` | `importService` | hook de dominio (T18) |
      | `employee-management/ShiftHistoryModal.tsx` | `authService`, `API_BASE_URL` | hook de dominio (T14) |
      | `governance/ExportLogsModal.tsx` | `authService`, `API_BASE_URL` | hook de dominio (T19) |
      Todos los modales de la tabla quedan **sin props de datos opacas**: el
      container resuelve los datos y el view solo presenta. `API_BASE_URL` es
      una constante, no un servicio: puede permanecer en `services/apiBase.ts`
      solo si **no** se importa por valor desde un componente; en ese caso se
      expone como prop o se encapsula en el hook de dominio (T11, T14, T19).
- [ ] AC12: **Suite completa verde**. `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run audit:design-system` (budgets de tokens
      **no suben**), `npm run spec:check`, `npm run docs:check` y
      `npm run preflight` en verde; `npm run e2e:staging` en verde (sin
      regresión funcional: login, dashboard, planificador, worker-portal,
      kiosk y offline).

## Restricciones

- Constitución (I–V): en particular IV ("calidad con ratchet, no con
  tolerancia") — todo budget de este spec **solo decrece**, y V ("spec antes
  que PR") — este spec es la puerta de entrada del workstream.
- **No hay cambio de comportamiento observable** para el usuario final: es
  refactor estructural. Los flags de modal que migran del store a estado local
  deben conservar exactamente la misma visibilidad y orden de aparición.
- Los `data-testid`, roles ARIA, landmarks y selectores E2E existentes
  **no se renombran**: Playwright (56 tests) es el contrato de regresión.
- El budget de palette crudo (`design-system-budget.json`) y el de warnings de
  ESLint (`lint-budget.json`) **no se suben**: si una migración toca archivos
  certificados, su conteo de palette crudo no puede crecer.
- Rollback por fase: cada workstream (A–D) es un PR independiente y revertible.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts` (nuevo, AC1-AC4,
    AC6, AC11)
  - `frontend/src/tests/guardrails/frontendAuditGuardrails.test.ts` (extender la
    lista de vistas auditadas, AC1)
  - `frontend/src/tests/guardrails/stateBoundaryGuardrails.test.ts` (extender
    la frontera del store a "el store no guarda flags de modal", AC7, AC8)
  - `frontend/src/tests/state/` (tests de slice existentes que deben seguir en
    verde tras la purga, AC7, AC8)
  - `frontend/src/tests/features/auth/` (nuevo, AC7): test del flujo de
    **cambio forzado de contraseña** — login con `mustChangePassword === true`
    ⇒ el modal se abre sin interacción del usuario; tras el cambio, el flag
    queda limpio y el modal se cierra.
  - `frontend/src/tests/features/dashboard/` (nuevo, AC7): test de la señal
    `quickNote:created` del socket ⇒ `hasUnreadNotes` se enciende con el
    modal cerrado y se baja al abrirlo.
  - `frontend/src/tests/features/time-control/` (nuevo, AC7): test de que
    `EditTimestampModal` abre y guarda con **props controladas** (sin leer
    del store global) tanto desde el dashboard como desde time-control.
  - `frontend/e2e/*.spec.ts` (regresión funcional, AC12)
- **Docs a actualizar**:
  - `frontend/src/features/README.md` (reglas 2 y 3 endurecidas + tabla de
    dónde vive cada tipo de estado)
  - `.agents/rules/design-system-governance.md` (nueva sección "Frontera de
    capas" con la invariante de la vista pura y el nombre del guardrail)
  - `.agents/rules/frontend-performance.md` (invariante 4 ampliada: "Zustand se
    reserva para estado de proceso; el estado de UI efímero de un feature vive
    en el feature")
  - `docs/adr/0023-frontend-layering-hardening.md` (decisión permanente)
  - `docs/adr/README.md` (índice)
