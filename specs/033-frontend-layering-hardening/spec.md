# Spec 033: Frontend Layering Hardening

- Estado: Implementado localmente — pendiente de merge
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
   `features/configuration/components/DeveloperPanel.tsx:27-28`
   (`seedingService`, `healthService` y el import dinámico de `socketService`),
   `features/configuration/components/GlobalVariablesManager.tsx:18`
   (`configService`), `features/configuration/components/SeedingProgressModal.tsx:11`
   (`healthService`), `features/configuration/components/SmtpConfigModal.tsx:3`
   (`emailService`), `features/employee-management/components/ImportModal.tsx:3`
   (`importService`), `features/employee-management/components/ShiftHistoryModal.tsx:4`
   (`auditLogService`),
   `features/governance/components/ExportLogsModal.tsx:3-4`.
   En la base de esta rama, solo `components/ui/UserManualModal.tsx:64` hace
   `fetch("/ManualRelojControl.md")` (asset estático del manual); DeveloperPanel
   y ShiftHistoryModal no hacen `fetch` crudo. El ceiling preexistente del
   guardrail era 3, aunque el conteo confirmado en esos componentes era 1; T14
   elimina esa última llamada y el budget baja a 0. Además,
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

- [x] AC1: **La capa de vista es enforceable, no declarativa**. `npm run lint`
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
- [x] AC2: **Guardrail de pureza con budgets monótonos**. Nuevo
      `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts` con 5
      budgets decrementables inicializados al conteo real medido y **congelados**
      en constantes exportadas (el test falla si suben, nunca exige editar el
      test para bajarlos):
      | Budget | Baseline | Invariante |
      |--------|----------|------------|
      | `VIEW_HOOK_BUDGET` | 5 → 1 (T7) → 0 (T8) | views con hooks → 0 |
      | `HOOKED_COMPONENT_BUDGET` | 95 → 80 | componentes no-view con hooks |
      | `LARGE_HOOKED_COMPONENT_BUDGET` | 56 → 48 | componentes con hooks **y >150 líneas** sin container/view gemelo |
      | `SERVICE_IMPORT_BUDGET` | 8 → 0 | componentes que importan `services/` **por valor** |
      | `RAW_FETCH_BUDGET` | 3 (conteo verificado: 1) → 0 | `fetch` crudo en componente |
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
      (5 vistas, 95 componentes y 56 componentes grandes). `RAW_FETCH_BUDGET` tenía
      un ceiling preexistente de 3; el escaneo de `origin/main` confirma 1 llamada,
      que T14 retira. El budget incluye
      `components/ui/UserManualModal.tsx` (`fetch("/ManualRelojControl.md")`),
      que es un **asset estático del manual** y por tanto entra en el budget
      como cualquier otro `fetch` en capa de componente.
- [x] AC3: **El invariante "componente grande con hooks ⇒ tiene container
      gemelo" es un ratchet, no un fallo duro**. El guardrail **falla si el
      conteo actual de componentes con hooks y >150 líneas sin gemelo supera
      `LARGE_HOOKED_COMPONENT_BUDGET` (= 48)**: es decir, **bloquea componentes
      nuevos** con esa forma y **obliga a bajar** el conteo con cada migración
      de AC4 (56 → 48 al cerrar T9, T10, T11, T12, T13 y T15; la migración de
      `DesignSystemCatalog` no cuenta porque vive en `views/` y ya está cubierta
      por `VIEW_HOOK_BUDGET`). No se exige llegar a 0 en esta iteración:
      hacerlo exigiría refactors cosméticos sobre componentes legítimos (p. ej.
      `components/ui/DatePicker.tsx`, que es interactivo por naturaleza).
      Cuando el conteo llegue a 0, el budget baja a 0 y el invariante pasa a
      ser de fallo duro **sin cambiar una línea del guardrail**.
- [x] AC4: **Los 7 contenedores que faltan existen**. Cada uno de
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
- [x] AC5: **`features/design-system` deja de ser una vista-route**. El
      feature pasa a tener `containers/`, `views/` y `hooks/`; `App.tsx` monta
      el container, no la vista; `DesignSystemCatalog.view.tsx` queda sin hooks
      y ≤ 300 líneas.
- [x] AC6: **Cero shims y cero pages-wrapper**. Los 9 archivos shim de 1 línea
      de `features/*/components/` se eliminan y las vistas que los lazy-importan
      apuntan al container directamente; `features/kiosk/pages/KioskPage.tsx`
      (3 líneas) se elimina y `App.tsx` importa
      `features/kiosk/containers/Kiosk.container`. `src/features/**` no contiene
      ningún archivo de 1–3 líneas cuyo único propósito sea re-exportar otro
      archivo del mismo feature (verificado por grep + guardrail).
- [x] AC7: **Un solo hogar para el estado de modal, sin perder señal de
      origen**. `dashboardSlice` y `quickNotesSlice` quedan sin flags de modal
      (o se eliminan si quedan vacíos) y todo flag de "modal abierto" vive en
      el feature que lo muestra, vía `useState` local o un hook
      `use*Controller` del feature. El store global conserva **solo** estado de
      proceso: sesión, tema, toasts, sync y offset de reloj. **Tres casos
      requieren un tratamiento explícito** (no son un "flag más"): 1. **`authSlice.isForcePasswordChangeModalOpen` NO es un flag de UI
      arbitrario**: se asigna en `authSlice._handleSuccessfulLogin` a partir de
      `loginResponse.mustChangePassword === true` (invariante de seguridad
      de la spec 002) y el modal se monta en `App.tsx` **después** de
      desmontar `LoginPage`. Se conserva `mustChangePassword?: boolean`
      **como propiedad de sesión dentro de `currentUser`** (el slice lo
      emite, no el componente); `useAuth` deriva
      `isForcePasswordChangeModalOpen` de esa propiedad y
      `clearMustChangePassword` la limpia y persiste al cambiar la contraseña.
      El flujo de cambio forzado debe seguir funcionando idéntico. 2. **`quickActionRecord` e `isEditTimestampModalOpen` los consumen dos
      features**: `QuickActionModal` y `EditTimestampModal` se montan en
      `features/time-control/views/TimeControl.view.tsx:230,268` **y** en
      `features/dashboard/views/Dashboard.view.tsx:153,170`. Por eso
      `EditTimestampModal.container.tsx` deja de leer del store global y
      recibe props controladas (`isOpen`, `onClose`, `editingInfo`). El
      container conecta `useEditTimestampModalController` con la vista para
      resolver `value`, guardado y errores; dashboard y time-control instancian
      sus propios containers y mantienen separado el registro que editan. Se
      elimina la importación cross-feature desde `Dashboard.view.tsx`, que
      ahora recibe los modales ya compuestos. 3. **`quickNotesSlice.hasUnreadNotes` no es "estado derivado de datos
      remotos"**: `QuickNote` **no tiene campo read/unread** en la API; la
      señal se enciende exclusivamente cuando llega el evento WebSocket
      `quickNote:created` (`quickNotesSlice.ts` + `useSocketEvents.ts`). El
      estado de apertura vive en `useDashboardModalController`; abrirlo limpia
      la señal. Si llega el evento mientras está abierto, el store la marca y
      un `useLayoutEffect` del controller la limpia antes del siguiente paint.
      `ToolsPanel` recibe `onOpenQuickNotes` y `hasUnreadNotes` desde
      `Dashboard.container` vía `widgetProps`; el store conserva la señal del
      socket, pero no el estado de apertura del modal.
- [x] AC8: **Store sin stubs muertos**. `notificationSlice`,
      `correctionRequestSlice`, `syncSlice.conflicts` y
      `syncSlice.bulkAddRecords` se eliminan (o se rellenan con comportamiento
      real si resultan necesarios), y `useSocketEvents.ts` deja de llamar a
      `handleCorrectionRequestSocketEvent`. Ningún slice expone un método que
      no haga nada.
- [x] AC9: **Capas muertas eliminadas**. `src/types/contexts.ts`,
      `src/hooks/useDataRefresher.ts`, `src/hooks/useLogs.ts` y
      `src/hooks/useServerTime.ts` se borran junto con sus re-exports
      (`src/types/index.ts`), y `npm run check` + `npm run lint` quedan en verde
      con 0 referencias colgantes.
- [x] AC10: **Una sola base para consultas responsive**. `useMediaQuery(query)`
      queda como base para `usePrefersReducedMotion` de
      `useSupervisorPerformance.ts` y para la detección móvil de
      `useEmployeeManagementData`; se eliminan `useScreenSize` y los listeners
      `resize`/lecturas `innerWidth` ad-hoc. El único consumidor de
      `useScreenSize` era `ScreenSizeIndicator`, un overlay de administrador en
      modo desarrollo que mostraba dimensiones en píxeles; se retira junto con
      su montaje, sin afectar flujos de usuario final. No se añade una API
      `useBreakpoint()` que la aplicación no necesita.
- [x] AC11: **Sin imports de `services/` en la capa de componentes**. Los 8
      componentes del baseline quedan en 0 (con excepción permitida
      exclusivamente para imports **solo de tipo** vía `import type`, que
      `BrandLogo.tsx` ya usa; el guardrail distingue tipo de valor):
      | Componente | Servicio importado | Destino |
      |---|---|---|
      | `configuration/GlobalVariablesManager.tsx` | `configService` | hook de dominio (T9) |
      | `configuration/SmtpConfigModal.tsx` | `emailService` | hook de dominio (T15) |
      | `configuration/DeveloperPanel.tsx` | `seedingService`, `healthService`, import dinámico de `socketService` | hook de dominio (T11) |
      | `configuration/SeedingProgressModal.tsx` | `healthService` | hook de dominio (T16) |
      | `auth/MFASetupModal.tsx` | `authService` | hook del feature `auth` (T17) |
      | `employee-management/ImportModal.tsx` | `importService` | hook de dominio (T18) |
      | `employee-management/ShiftHistoryModal.tsx` | `auditLogService` | hook de dominio (T14) |
      | `governance/ExportLogsModal.tsx` | `authService`, `API_BASE_URL` | hook de dominio (T19) |
      Los imports de servicios quedan encapsulados en hooks de dominio; los
      componentes dejan de depender directamente de `services/`.
      `API_BASE_URL` es
      una constante, no un servicio: puede permanecer en `services/apiBase.ts`
      solo si **no** se importa por valor desde un componente; en ese caso se
      expone como prop o se encapsula en el hook de dominio (T19).
- [x] AC12: **Suite completa verde**. `npm run validate:ci` (frontend),
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
  **no se renombran**: Playwright es el contrato de regresión; la ejecución
  local actual enumera 68 tests.
- El budget de palette crudo (`design-system-budget.json`) y el de warnings de
  ESLint (`lint-budget.json`) **no se suben**: si una migración toca archivos
  certificados, su conteo de palette crudo no puede crecer.
- Entrega transversal: las fases A–D se revisan en una sola rama y un PR a
  `main`. El PR completo es reversible; las fases son hitos de revisión y
  validación, no PR separados.

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
  - `frontend/src/tests/state/forcePasswordChangeSession.test.tsx` (nuevo,
    AC7): login con `mustChangePassword === true` persiste la señal de sesión,
    `useAuth` abre el modal y `clearMustChangePassword` la limpia después del
    cambio. `features/auth/useForceChangePasswordModalController.test.ts`
    verifica el submit exitoso y el cierre.
  - `frontend/src/tests/features/dashboard/useDashboardModalController.test.ts`
    (nuevo, AC7) y `src/tests/services/quickNoteInvalidation.test.ts` verifican
    la apertura local del modal, el badge unread y los eventos del socket.
  - `frontend/src/tests/features/time-control/` verifica el editor controlado
    y la separación del estado entre dashboard y time-control
    (`useEditTimestampModalController.test.ts`, `useTimeControl.test.ts`,
    `TimeControlView.test.tsx`).
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
