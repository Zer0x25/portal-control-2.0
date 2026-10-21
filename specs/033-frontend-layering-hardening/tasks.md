# Tareas 033: Frontend Layering Hardening

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Boundary enforceable

- [ ] T1: Añadir en `frontend/eslint.config.js` el bloque que prohíbe
      **cualquier hook de React** en `src/**/*.view.tsx`. El patrón es
      `/^use[A-Z]/` (cubre `useState`, `useEffect`, `useMemo`, `useCallback`,
      `useRef`, `useReducer`, `useContext`, `useId` y hooks de dominio como
      `useToasts`) más los miembros `React.use*`; la enumeración **no es una
      lista cerrada**. Implementación: `no-restricted-syntax` sobre
      `CallExpression` (preferido: cubre `React.useState`) +
      `no-restricted-globals` como red para los imports sueltos. Los 4 views
      offenders quedan cubiertos por una **allowlist temporal explícita**
      (`eslint-disable` por archivo) para no romper el ratchet de lint 0/0
      antes de migrarlos: la retirada se hace en T7 (`WorkerPortal`,
      `Communications`, `ChangePasswordModal`) y T8 (`DesignSystemCatalog`).
      Añadir una sonda negativa en el propio lint para verificar que la regla
      dispara (AC1).
- [ ] T2: Añadir el bloque para `src/**/*.container.tsx` que prohíbe JSX de
      presentación: el container **no** puede emitir elementos DOM intrínsecos
      (`<div>`, `<span>`, …) ni fragmentos con múltiples hijos en su `return`;
      sí puede pasar **otros containers como props** de composición (p. ej.
      `PersonnelManagement.container.tsx` pasa
      `employeesContent={<EmployeeManagementContainer isEmbedded />}`). El
      `return` del container tiene **un solo elemento JSX de primer nivel**
      (AC1, AC4).
- [ ] T3: Crear `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`
      con los budgets **congelados en constantes exportadas** (patrón de
      `stateBoundaryGuardrails.test.ts`): `VIEW_HOOK_BUDGET=4`,
      `HOOKED_COMPONENT_BUDGET=61`, `LARGE_HOOKED_COMPONENT_BUDGET=39`,
      `SERVICE_IMPORT_BUDGET=8`, `RAW_FETCH_BUDGET=3`,
      `INLINE_CACHE_INVALIDATION_BUDGET=1`; el test falla si el conteo actual
      **supera** el budget y acepta que baje sin tocar el test (AC2).
      **Alcance del escaneo**: `frontend/src/features/**/components/**` **y**
      `frontend/src/components/ui/**`. Los `import type` de `services/` están
      permitidos; el guardrail distingue tipo de valor (AC2).
- [ ] T4: Implementar en el guardrail el **ratchet** de AC3: contar los
      componentes de la capa de componentes que (a) llaman hooks de React,
      (b) superan 150 líneas y (c) **no** tienen un `.container.tsx` /
      `.view.tsx` gemelo en el mismo feature; el test **falla si el conteo
      supera `LARGE_HOOKED_COMPONENT_BUDGET` (39)** y el mensaje nombra la
      ruta exacta del ofensor y la acción concreta. Las vistas
      (`features/**/views/**`) **no** se cuentan en este budget: ya están
      cubiertas por `VIEW_HOOK_BUDGET` (AC3).
- [ ] T5: Implementar en el guardrail el invariante AC6 (cero shims de 1–3
      líneas) y el AC11 (cero imports **de valor** de `services/` en
      componentes; los imports `import type` quedan permitidos, como ya hace
      `components/ui/BrandLogo.tsx`) (AC6, AC11).
- [ ] T6: Registrar el guardrail nuevo en `frontend/package.json`
      (`test:guardrails` y `lint:guardrails`) y extender la lista de vistas
      auditadas de `frontendAuditGuardrails.test.ts` a las 4 views offenders
      (AC1, AC2).
- [ ] T7: Migrar las 3 views no-design-system que violan la pureza para que
      `VIEW_HOOK_BUDGET` baje a **1** (solo queda `DesignSystemCatalog`):
      `worker-portal/views/WorkerPortal.view.tsx` (2 `useMemo` → derivar en el
      container),
      `communications/views/Communications.view.tsx` (1 `useMemo` de sanitización
      → mover al hook de datos),
      `auth/components/ChangePasswordModal.view.tsx` (1 `useEffect` de listener
      Escape → mover al `useChangePasswordModalController`); **retirar el
      `eslint-disable` temporal** de cada una (AC1).

## Fase B — Migración de los contenedores que faltan

- [ ] T8: Crear `features/design-system/hooks/useDesignSystemCatalog.ts`,
      `features/design-system/containers/DesignSystemCatalog.container.tsx` y
      `features/design-system/views/DesignSystemCatalog.view.tsx`; migrar los 7
      `useState` + 3 `useId` + `useToasts` al hook; la vista queda
      presentacional pura y ≤300 líneas; `App.tsx` deja de montar la vista y
      monta el container; **retirar el `eslint-disable` temporal** de
      `DesignSystemCatalog.view.tsx` ⇒ `VIEW_HOOK_BUDGET` → **0** (AC1, AC4,
      AC5).
- [ ] T9: Partir `features/configuration/components/GlobalVariablesManager.tsx`
      (865 líneas, 19 hooks) en `hooks/useGlobalVariablesController.ts` +
      `containers/GlobalVariablesManager.container.tsx` +
      `views/GlobalVariablesManager.view.tsx`; los imports de `configService`
      salen del componente y entran al hook (AC4, AC11).
- [ ] T10: Partir `features/supervisor-dashboard/components/RequestsTab.tsx`
      (594 líneas, 11 hooks, `useVirtualizer`) en hook + container + view
      (AC4).
- [ ] T11: Partir `features/configuration/components/DeveloperPanel.tsx`
      (421 líneas, 22 hooks) en hook + container + view; el `fetch` crudo de
      `DeveloperPanel.tsx:249` sale del componente a un hook de dominio; los
      imports de `authService` y `API_BASE_URL` salen del componente (AC4,
      AC11).
- [ ] T12: Partir `features/governance/components/AuditLogsView.tsx`
      (405 líneas, 10 hooks) en `hooks/useAuditLogsController.ts` +
      `containers/AuditLogsView.container.tsx` + `views/AuditLogsView.view.tsx`;
      **reubicar** de `components/` a `views/`/`containers/` y ajustar el
      `uiLayeringGuardrails.test.ts` si aplica (AC4).
- [ ] T13: Partir `features/meters/components/MeterHistory.tsx` (407 líneas,
      10 hooks) en hook + container + view (AC4).
- [ ] T14: Eliminar los 2 `fetch` crudos restantes de la capa de componente:
      `features/employee-management/components/ShiftHistoryModal.tsx:60` (a un
      hook del feature `employee-management`, junto con la retirada de los
      imports de `authService` y `API_BASE_URL`) y
      `components/ui/UserManualModal.tsx:64` (`fetch("/ManualRelojControl.md")`
      — asset estático del manual: se sirve por un hook `useUserManual` del
      feature, no por el componente) ⇒ `RAW_FETCH_BUDGET` → **0** junto con
      T11 (AC2, AC11).
- [ ] T15: Partir `features/configuration/components/SmtpConfigModal.tsx`
      (427 líneas, `useState` + `useEffect` + `useToasts`) en hook + container + view; el import de `emailService` sale del componente y entra al hook
      de dominio (AC4, AC11).
- [ ] T16: Extraer el import de `healthService` de
      `features/configuration/components/SeedingProgressModal.tsx:11` a un
      hook de dominio del feature `configuration`; el componente deja de
      conocer el servicio (AC11).
- [ ] T17: Extraer el import de `authService` de
      `features/auth/components/MFASetupModal.tsx:2` a un hook del feature
      `auth`; el componente deja de conocer el servicio (AC11).
- [ ] T18: Extraer el import de `importService` de
      `features/employee-management/components/ImportModal.tsx:3` a un hook de
      dominio del feature `employee-management`; el componente deja de conocer
      el servicio (AC11).
- [ ] T19: Extraer los imports de `authService` y `API_BASE_URL` de
      `features/governance/components/ExportLogsModal.tsx:3-4` a un hook de
      dominio del feature `governance`; el componente deja de conocer los
      servicios (AC11).
- [ ] T20: Mover el `queryClient.invalidateQueries` inline de
      `features/governance/components/IntegritySummaryView.tsx:52` al hook de
      dominio correspondiente (`useIntegrityStatus`); el componente deja de
      conocer el `queryClient`; `INLINE_CACHE_INVALIDATION_BUDGET` → **0**
      (AC2).
- [ ] T21: Eliminar los 9 archivos shim de 1 línea de `features/*/components/`
      (`governance`: `BackupListModal`, `SecurityInsightsView`,
      `SystemMaintenanceView`; `theoretical-shifts`: `PatternManager`,
      `AssignmentManager`, `HolidayManager`, `LeaveManager`;
      `configuration`: `EmailCenterView`, `MasterDataExportView`) y reescribir
      los `React.lazy` de las vistas para apuntar a los containers
      (AC6).
- [ ] T22: Eliminar `features/kiosk/pages/KioskPage.tsx` (3 líneas) y apuntar
      el lazy-import de `App.tsx` a `features/kiosk/containers/Kiosk.container`;
      registrar en `features/README.md` que `pages/` solo existe cuando aporta
      routing real (AC6).
- [ ] T23: Verificar que ningún container nuevo supere 200 líneas ni contenga
      más de un elemento JSX de primer nivel ni elementos DOM intrínsecos; si
      alguno lo hace, se divide antes de cerrar la fase. Con T9, T10, T11,
      T12, T13 y T15 cerrados, `LARGE_HOOKED_COMPONENT_BUDGET` baja de 39 a
      **33** (AC1, AC3, AC4).

## Fase C — Unificación del estado de UI

- [ ] T24: Inventariar los 10 flags de `dashboardSlice` × sus consumidores y
      migrar cada uno al feature que lo muestra, vía `useState` local o un
      `use*Controller` del feature (AC7).
      **Caso cross-feature (no es "el controller de time-control")**:
      `quickActionRecord` e `isEditTimestampModalOpen` los consumen
      `QuickActionModal` y `EditTimestampModal`, que se montan en
      `features/time-control/views/TimeControl.view.tsx:230,268` **y** en
      `features/dashboard/views/Dashboard.view.tsx:153,170`. Por tanto
      `EditTimestampModal.container.tsx` deja de leer del store global y
      **recibe props controladas** (`isOpen`, `onClose`, `editingInfo`,
      `value`, `onSave`); `Dashboard.container` y `TimeControl.container`
      instancian **cada uno su propio** hook de estado local del modal; y se
      elimina la importación cross-feature
      `from "../../time-control"` en `Dashboard.view.tsx` (AC7).
- [ ] T25: Migrar `authSlice.isForcePasswordChangeModalOpen` al feature `auth`
      **sin perder la señal del login**: el slice **conserva**
      `mustChangePassword?: boolean` **como propiedad de sesión dentro de
      `currentUser`** (origen: `authSlice.ts:189`, que lo asigna a partir de
      `loginResponse.mustChangePassword === true`), y `useAuthModalController`
      lo lee para abrir el modal y lo limpia al cambiar la contraseña.
      `authSlice` conserva solo sesión/MFA/tema; el flag de modal desaparece
      del slice (AC7).
- [ ] T26: Migrar `quickNotesSlice.isQuickNotesModalOpen` al feature `dashboard`
      y preservar la semántica de `hasUnreadNotes`, que **no** es estado
      derivado de datos remotos: `QuickNote` no tiene campo read/unread en la
      API y la señal se enciende solo con el evento WebSocket `quickNote:created`
      **con el modal cerrado** (`quickNotesSlice.ts:24-31` +
      `useSocketEvents.ts:104-110`). El cableado del badge en `ToolsPanel`
      (que se monta por el `WIDGET_REGISTRY` del dashboard, vía
      `features/dashboard/components/withDashboardLazy.tsx:46`, **sin recibir
      props** de `Dashboard.container`) queda explícito: hook de dominio
      compartido o contexto mínimo del store, **sin inventar una cuarta fuente
      de verdad**. Si el slice queda vacío, eliminarlo (AC7).
- [ ] T27: Eliminar `store/slices/notificationSlice.ts` (stub: `loadNotifications`
      setea `[]` sin pedir nada) y migrar sus consumidores a queries puras
      (AC8).
- [ ] T28: Eliminar `store/slices/correctionRequestSlice.ts` (método con cuerpo
      vacío) y su llamada en `src/hooks/useSocketEvents.ts:114` (AC8).
- [ ] T29: Eliminar `syncSlice.conflicts` y `syncSlice.bulkAddRecords` —
      **verificar consumidores con grep antes**: la cola de escritura offline
      (invariante de la spec 032) no se toca funcionalmente; si
      `bulkAddRecords` tiene consumidores reales, se conserva y se documenta la
      excepción (AC8).
- [ ] T30: Extender `stateBoundaryGuardrails.test.ts` con el invariante "el
      store global no expone flags de modal" (patrón
      `is*ModalOpen|is*Open|show*Modal`), con whitelist explícita y
      congelada si alguna entrada legítima sobrevive (AC7, AC8).

## Fase D — Purgas, deduplicación y convención

- [ ] T31: Eliminar `src/types/contexts.ts` (218 LOC, 0 referencias) y su
      re-export en `src/types/index.ts` (AC9).
- [ ] T32: Eliminar `src/hooks/useDataRefresher.ts` (`return null`),
      `src/hooks/useLogs.ts` (handlers no-op) y `src/hooks/useServerTime.ts`
      (alias puro de `useBusinessNow`, actualizar el consumidor) (AC9).
- [ ] T33: Consolidar los hooks responsive: `useMediaQuery` queda como base
      única; eliminar `useScreenSize` (1 consumidor) y el `matchMedia` inline de
      `useSupervisorPerformance.ts:14`; eliminar los listeners `resize` y el
      `window.innerWidth` ad-hoc de
      `features/employee-management/hooks/useEmployeeManagementData.ts:64,108-110`
      (AC10).
- [ ] T34: Deduplicar la matriz de permisos, hoy byte-idéntica en
      `src/services/supervisorService.ts:113-125` y
      `src/hooks/useSupervisorPermissions.tsx:44-56`: una sola fuente de
      verdad (AC9).
- [ ] T35: Fijar y aplicar **una sola** convención de nombres para los hooks
      de feature (`use*Data` para datos remotos, `use*Controller` para
      orquestación/estado de UI); renombrar los ~10 `use*Logic` y registrar la
      convención en `features/README.md` (AC9).
- [ ] T36: Actualizar la documentación: `features/README.md` (reglas 2 y 3
      endurecidas + tabla "¿dónde vive cada estado?"),
      `.agents/rules/design-system-governance.md` (sección "Frontera de capas"),
      `.agents/rules/frontend-performance.md` (invariante 4 ampliada: Zustand =
      estado de proceso; el estado de UI efímero vive en su feature) (AC12).

## Verificación final

- [ ] T37: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run audit:design-system` (los budgets de
      tokens **no suben**), `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` y `npm run e2e:staging` (56 tests: sin regresión
      funcional) (AC12).
- [ ] T38: Confirmar los budgets finales del guardrail:
      `VIEW_HOOK_BUDGET=0`, `RAW_FETCH_BUDGET=0`,
      `INLINE_CACHE_INVALIDATION_BUDGET=0`, `SERVICE_IMPORT_BUDGET=0`,
      `LARGE_HOOKED_COMPONENT_BUDGET=33` y `HOOKED_COMPONENT_BUDGET` ≤ 61 (el
      valor exacto se registra en la evidencia de cierre); actualizar las
      constantes del guardrail **solo** a la baja (AC2, AC3).
- [ ] T39: Promover `docs/adr/0023-frontend-layering-hardening.md` de
      "Propuesto" a "Aceptado" con las líneas de implementación verificadas;
      actualizar la tabla de `docs/adr/README.md` en el mismo commit; marcar el
      spec como "Implementado" (AC12).
