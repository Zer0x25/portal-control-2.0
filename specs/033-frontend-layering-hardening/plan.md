# Plan 033: Frontend Layering Hardening

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../031-ui-ux-consolidation/plan.md` (superficie UI),
`../032-remote-state-consolidation/plan.md` (estado remoto).
Sucesores planificados: spec 034 (cliente HTTP), 035 (stack de pruebas),
036 (form/tabla), 037 (render/observabilidad), 038 (catálogo/tokens).

## Estrategia

4 fases secuenciales (A→D) en una rama aislada y un único PR a `main`, como
entrega transversal al equipo. Las fases son hitos de revisión y validación;
el PR completo se puede revertir. El orden importa: **A blinda el boundary antes de que B mueva código**,
para que las migraciones no reintroduzcan la fuga que se está cerrando.

1. **Fase A — Boundary enforceable**:
   - Añadir a `frontend/eslint.config.js` un bloque para `src/**/*.view.tsx` que
     prohíba **cualquier hook de React**, no una lista cerrada: el patrón es
     `/^use[A-Z]/` (cubre `useState`, `useEffect`, `useMemo`, `useCallback`,
     `useRef`, `useReducer`, `useContext`, **`useId`** y hooks de dominio como
     **`useToasts`**) más los miembros `React.use*`. Se implementa con
     `no-restricted-syntax` sobre `CallExpression` (preferido: cubre
     `React.useState`) y `no-restricted-globals` como red para los imports
     sueltos.
     **Decisión a validar en el PR**: `no-restricted-globals` no cubre
     `React.useState`; por eso el selector de AST (`no-restricted-syntax`) es la
     opción preferente, con `no-restricted-globals` como red para los imports
     sueltos.
   - **Orden de activación** (resuelve la colisión T1 ↔ T8): la regla se activa
     como `error` desde el primer día y los 4 views offenders quedan cubiertos
     por una **allowlist temporal explícita** (`eslint-disable` por archivo),
     cuya retirada está asignada: T7 para `WorkerPortal`, `Communications` y
     `ChangePasswordModal`; T8 para `DesignSystemCatalog`. Así el ratchet de
     lint 0/0 se respeta en esta rama sin aplazar la frontera, y el allowlist
     desaparece por completo al cerrar T7+T8.
   - Añadir un bloque para `src/**/*.container.tsx` que prohíba JSX de
     presentación: el container **no** puede emitir elementos DOM intrínsecos
     (`<div>`, `<span>`, …) ni fragmentos con múltiples hijos en su `return`;
     sí puede pasar **otros containers como props** de composición (así lo hace
     hoy `PersonnelManagement.container.tsx` con `employeesContent` y
     `usersContent`). El `return` tiene **un solo elemento JSX de primer
     nivel**.
   - Nuevo guardrail `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`
     con **constantes de budget congeladas** (patrón ya usado en
     `stateBoundaryGuardrails.test.ts` y `modalGuardrails.test.ts`): cada
     budget se inicializa al conteo real medido, el test falla si el conteo
     actual **supera** el budget, y bajar el budget **nunca exige editar el
     test** (se acepta `conteo_actual <= budget`).
     Los 6 budgets (valores **medidos sobre el AST**, no con regex):
     `VIEW_HOOK_BUDGET=5` (→ 1 tras T7 y 0 tras T8),
     `HOOKED_COMPONENT_BUDGET=95` (→ 80),
     `LARGE_HOOKED_COMPONENT_BUDGET=56` (→ 48), `SERVICE_IMPORT_BUDGET=8` (→ 0),
     `RAW_FETCH_BUDGET=3` (→ 0), `INLINE_CACHE_INVALIDATION_BUDGET=1` (→ 0).
     **Alcance del escaneo**: `frontend/src/features/**/components/**` **y**
     `frontend/src/components/ui/**`. Los `import type` de `services/` están
     permitidos (el guardrail distingue tipo de valor).
   - El guardrail además implementa AC3 **como ratchet, no como fallo duro**:
     cuenta los componentes con hooks **y > 150 líneas** sin container/view
     gemelo (baseline 56: 49 en `features/**/components/` y 7 en
     `components/ui/`) y falla **solo si el conteo supera el budget**; cada
     migración de la Fase B lo baja (56 → 48). Las vistas (`features/**/views/**`)
     no se cuentan en este budget: ya están cubiertas por `VIEW_HOOK_BUDGET`.
   - Y AC6: ningún archivo de 1–3 líneas en `features/**` cuyo único propósito
     sea re-exportar otro archivo del mismo feature (los 9 shims + `KioskPage`).
   - Registrar el guardrail en `frontend/package.json` (`test:guardrails` y
     `lint:guardrails`, que hoy listan 13 archivos).
2. **Fase B — Migración de los contenedores que faltan**:
   - Patrón a replicar (ya existe y está probado en 13 features):
     ```
     features/<dominio>/
       hooks/use<X>Controller.ts   # estado + queries + side-effects
       containers/<X>.container.tsx # 1 elemento JSX: <XView {...} />
       views/<X>.view.tsx          # presentación pura por props
     ```
   - Orden de migración por impacto (de mayor a menor):
     1. `design-system/DesignSystemCatalog` (AC5): el feature no tiene
        `containers/` ni `hooks/`; la vista (517 líneas, 7 hooks) **es** la
        entrada de ruta. Se crea `hooks/useDesignSystemCatalog.ts` (los 7
        `useState` + 3 `useId` + toasts), `containers/DesignSystemCatalog.container.tsx`
        y `views/DesignSystemCatalog.view.tsx` presentacional; `App.tsx` pasa a
        montar el container. **Cierra el `eslint-disable` temporal de T1.**
     2. `configuration/GlobalVariablesManager` (865 líneas, 19 hooks) → hook
        `useGlobalVariablesController` + container + view.
     3. `supervisor-dashboard/RequestsTab` (594 líneas, 11 hooks, incluye
        `useVirtualizer`) → hook `useRequestsTabController` + container + view.
     4. `configuration/DeveloperPanel` (421 líneas, 22 hooks) → hook +
        container + view; los servicios de seeding, health y socket salen del
        componente y quedan en el hook de dominio. No tenía `fetch` crudo ni
        dependencias de `authService`/`API_BASE_URL`.
     5. `configuration/SmtpConfigModal` (427 líneas, `useState` + `useEffect` +
        `useToasts`, importa `emailService`) → hook + container + view.
     6. `governance/AuditLogsView` (405 líneas, 10 hooks) → hook
        `useAuditLogsController` + container + view. **Reubicación**: hoy vive
        en `components/` con nombre `*View`; pasa a `views/` +
        `containers/`, lo que además cierra la convención divergente detectada
        por `uiLayeringGuardrails`.
     7. `meters/MeterHistory` (407 líneas, 10 hooks) → hook + container + view.
   - **No son violaciones de layering** (aunque sean grandes): `governance/AuditLogFilterPanel.tsx`
     (457 líneas, **0 hooks** — presentacional puro) y
     `supervisor-dashboard/AccountingClosureTab.tsx` (419 líneas, **1 hook** —
     `useAccountingClosureTabController`, que ya extrae la lógica). Se anotan
     aquí para que el umbral de 150 líneas no se reinterprete más adelante.
   - Además, **5 modales** resuelven sus imports de `services/` mediante hooks
     de dominio, sin necesidad de container gemelo:
     `configuration/SeedingProgressModal.tsx` (`healthService`),
     `auth/MFASetupModal.tsx` (`authService`),
     `employee-management/ImportModal.tsx` (`importService`),
     `governance/ExportLogsModal.tsx` (`authService`, `API_BASE_URL`) y
     `employee-management/ShiftHistoryModal.tsx` (`auditLogService`). El
     componente no hacía `fetch`; el único asset crudo del manual se mueve
     desde `UserManualModal` al hook `useUserManual`.
   - En cada migración: el hook se extrae **sin cambiar comportamiento**; el
     `.view.tsx` resultante es 100% presentacional; el `.container.tsx` tiene
     exactamente un elemento JSX de primer nivel y **ningún elemento DOM
     intrínseco** (puede componer otros containers **como props**).
3. **Fase C — Unificación del estado de UI**:
   - Inventario de los 10 flags de `dashboardSlice`: para cada uno, identificar
     el feature que lo muestra y migrarlo a `useState` local (o a un
     `use*Controller` del feature si lo consumen 2+ vistas del mismo feature).
   - **Tres flags requieren un tratamiento explícito**, porque no son "un flag
     más" (verificar el código antes de moverlos):
     1. `quickActionRecord` e `isEditTimestampModalOpen` **cruzan features**:
        `QuickActionModal` y `EditTimestampModal` se montan en
        `features/time-control/views/TimeControl.view.tsx:230,268` **y** en
        `features/dashboard/views/Dashboard.view.tsx:153,170` (que además los
        importa del feature hermano). Por tanto
        `EditTimestampModal.container.tsx` deja de leer del store global y
        **recibe props controladas** (`isOpen`, `onClose`, `editingInfo`,
        `editingInfo`); el container resuelve value, guardado y errores con
        `useEditTimestampModalController`. Cada container instancia su estado
        local del registro; Dashboard.view recibe los modales ya compuestos y
        deja de importar otros features.
     2. `authSlice.isForcePasswordChangeModalOpen` **no es un flag de UI
        arbitrario**: se asigna en `authSlice.ts:189` a partir de
        `loginResponse.mustChangePassword === true` (invariante de seguridad de
        la spec 002) y el modal se monta en `App.tsx` **después** de desmontar
        `LoginPage`. El slice **conserva** `mustChangePassword?: boolean` como
        **propiedad de sesión dentro de `currentUser`**; el
        `useAuth` deriva si el modal debe abrirse y
        `clearMustChangePassword` limpia y persiste la señal al cambiar la
        contraseña. Mover el flag a un `useState`
        local perdería la señal del login y rompería el cambio forzado.
     3. `quickNotesSlice.hasUnreadNotes` **no es estado derivado de datos
        remotos**: `QuickNote` **no tiene campo read/unread** en la API; la
        señal se enciende exclusivamente con el evento WebSocket
        `quickNote:created` (`quickNotesSlice` + `useSocketEvents`). El estado
        de apertura vive en dashboard; abrir el modal limpia la señal y un
        `useLayoutEffect` la limpia antes del siguiente paint si llega otro
        evento mientras está abierto. `ToolsPanel` recibe su callback y la
        señal `hasUnreadNotes` desde `Dashboard.container` vía `widgetProps`.
   - `authSlice` conserva sesión, MFA y estado de autenticación.
   - Purga de stubs muertos: `notificationSlice` (sus consumidores pasan a
     queries puras), `correctionRequestSlice` (se elimina el método vacío y su
     llamada en `useSocketEvents.ts:114`), `syncSlice.conflicts` y
     `syncSlice.bulkAddRecords` (sin consumidores; `bulkAddRecords` **no**
     tocar la cola offline de escritura — verificar consumidores antes de
     borrar).
   - Extender `stateBoundaryGuardrails.test.ts` con un invariante nuevo: el
     store global no expone flags de "modal abierto" (whitelist explícita del
     patrón `is*ModalOpen|is*Open|show*Modal`).
4. **Fase D — Purgas, deduplicación y convención**:
   - Borrado de `src/types/contexts.ts` (218 LOC, 0 refs) + su re-export en
     `src/types/index.ts`; `useDataRefresher.ts`; `useLogs.ts`;
     `useServerTime.ts` (alias de `useBusinessNow` → actualizar el consumidor).
   - Borrado de los 9 shims de 1 línea: las vistas que los lazy-importan
     pasan a apuntar al container (`React.lazy(() =>
import("../containers/X.container"))`).
   - Borrado de `features/kiosk/pages/KioskPage.tsx` y ajuste de `App.tsx`
     (lazy import directo del container).
   - `useMediaQuery` queda como base responsive para `usePrefersReducedMotion`
     y para la detección móvil de employee-management. Se elimina
     `useScreenSize` y su único consumidor `ScreenSizeIndicator` (overlay de
     píxeles exclusivo de administrador en modo desarrollo), junto con los
     listeners `resize`/lecturas `innerWidth` ad-hoc de employee-management.
   - Convención de nombres de hooks de feature: hoy conviven `use*Data` (16),
     `use*Controller` (20) y `use*Logic` (10). Se fija **una sola**
     convención: `use*Data` (datos remotos) y `use*Controller` (orquestación /
     estado de UI), y `use*Logic` se renombra a `use*Controller` o se elimina
     si es un alias. La decisión exacta se documenta en `features/README.md`.
   - Deduplicación de la matriz de permisos (byte-idéntica en
     `services/supervisorService.ts:113-125` y
     `hooks/useSupervisorPermissions.tsx:44-56`): una sola fuente de verdad.

## Archivos a tocar

| Archivo                                                                                | Cambio                                                                                          |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `frontend/eslint.config.js`                                                            | bloque `*.view.tsx` (prohíbe hooks) + bloque `*.container.tsx` (prohíbe JSX de presentación)    |
| `frontend/src/tests/guardrails/viewPurityGuardrails.test.ts`                           | **nuevo** — 6 budgets + invariantes AC3 y AC6                                                   |
| `frontend/src/tests/guardrails/stateBoundaryGuardrails.test.ts`                        | invariante "el store no guarda flags de modal"                                                  |
| `frontend/src/tests/guardrails/frontendAuditGuardrails.test.ts`                        | extender la lista de vistas auditadas a los 4 views offenders                                   |
| `frontend/package.json`                                                                | registrar el guardrail nuevo en `test:guardrails` y `lint:guardrails`                           |
| `frontend/src/features/design-system/{hooks,containers,views}/*`                       | **nuevo** — parte `DesignSystemCatalog` (AC5)                                                   |
| `frontend/src/features/configuration/{hooks,containers,views}/*`                       | **nuevo** — `GlobalVariablesManager`, `DeveloperPanel`, `SmtpConfigModal`                       |
| `frontend/src/features/configuration/components/SeedingProgressModal.tsx`              | el import de `healthService` sale del componente (hook de dominio)                              |
| `frontend/src/features/auth/components/MFASetupModal.tsx`                              | el import de `authService` sale del componente (hook del feature)                               |
| `frontend/src/features/employee-management/components/ImportModal.tsx`                 | el import de `importService` sale del componente (hook de dominio)                              |
| `frontend/src/features/employee-management/components/ShiftHistoryModal.tsx`           | `auditLogService` sale del componente hacia hook de feature                                     |
| `frontend/src/features/governance/components/ExportLogsModal.tsx`                      | los imports de `authService`/`API_BASE_URL` salen del componente (hook de dominio)              |
| `frontend/src/components/ui/UserManualModal.tsx`                                       | el `fetch("/ManualRelojControl.md")` sale del componente (hook `useUserManual`)                 |
| `frontend/src/features/supervisor-dashboard/{hooks,containers,views}/*`                | **nuevo** — `RequestsTab`                                                                       |
| `frontend/src/features/governance/{hooks,containers,views}/*`                          | **nuevo** — `AuditLogsView` (hoy en `components/`)                                              |
| `frontend/src/features/meters/{hooks,containers,views}/*`                              | **nuevo** — `MeterHistory`                                                                      |
| `frontend/src/store/slices/dashboardSlice.ts`                                          | eliminar los 10 flags de modal                                                                  |
| `frontend/src/store/slices/quickNotesSlice.ts`                                         | eliminar flags de UI (o el slice completo); preservar la señal del socket                       |
| `frontend/src/store/slices/authSlice.ts`                                               | eliminar `isForcePasswordChangeModalOpen`; **conservar** `mustChangePassword` en `currentUser`  |
| `frontend/src/features/time-control/components/EditTimestampModal.container.tsx`       | deja de leer del store global; recibe props controladas (`isOpen`, `onClose`, `editingInfo`)    |
| `frontend/src/features/dashboard/views/Dashboard.view.tsx`                             | eliminar la importación cross-feature `from "../../time-control"`                               |
| `frontend/src/store/slices/notificationSlice.ts`                                       | eliminar (stub)                                                                                 |
| `frontend/src/store/slices/correctionRequestSlice.ts`                                  | eliminar (stub)                                                                                 |
| `frontend/src/store/slices/syncSlice.ts`                                               | eliminar `conflicts` y `bulkAddRecords` (verificar consumidores; la cola offline queda intacta) |
| `frontend/src/hooks/useSocketEvents.ts`                                                | dejar de llamar `handleCorrectionRequestSocketEvent`                                            |
| `frontend/src/features/*/components/*.tsx` (9 shims)                                   | eliminar                                                                                        |
| `frontend/src/features/kiosk/pages/KioskPage.tsx`                                      | eliminar                                                                                        |
| `frontend/src/App.tsx`                                                                 | montar el container de design-system y de kiosk                                                 |
| `frontend/src/types/contexts.ts`                                                       | eliminar (+ re-export en `src/types/index.ts`)                                                  |
| `frontend/src/hooks/{useDataRefresher,useLogs,useServerTime}.ts`                       | eliminar (+ actualizar consumidores)                                                            |
| `frontend/src/hooks/useMediaQuery.ts`, `useScreenSize.ts`                              | consolidar; retirar el overlay dev que era único consumidor de `useScreenSize`                  |
| `frontend/src/features/supervisor-dashboard/hooks/useSupervisorPerformance.ts`         | eliminar el `matchMedia` inline                                                                 |
| `frontend/src/features/employee-management/hooks/useEmployeeManagementData.ts`         | eliminar los `resize`/`innerWidth` ad-hoc                                                       |
| `frontend/src/services/supervisorService.ts`, `src/hooks/useSupervisorPermissions.tsx` | deduplicar la matriz de permisos                                                                |
| `frontend/src/features/README.md`                                                      | reglas 2 y 3 endurecidas + tabla de "¿dónde vive cada estado?"                                  |
| `.agents/rules/design-system-governance.md`                                            | nueva sección "Frontera de capas"                                                               |
| `.agents/rules/frontend-performance.md`                                                | invariante 4 ampliada (Zustand = estado de proceso)                                             |
| `docs/adr/0023-frontend-layering-hardening.md`                                         | decisión permanente                                                                             |
| `docs/adr/README.md`                                                                   | índice                                                                                          |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** El spec es de frontend puro; no
  hay rutas, schemas ni regeneración `npm run check:sdk`.
- **Sin cambios de API pública del frontend**: los hooks de feature conservan
  sus nombres y firmas en la migración (B), de modo que los consumidores
  (containers, tests, e2e) no cambian. Cuando un hook se renombra (Fase D,
  convención `use*Logic`), el cambio es interno al feature.
- **`data-testid` / roles ARIA / landmarks**: intocables. Playwright (68
  tests en la ejecución local actual) es el contrato de regresión; los 6 `e2e/*.spec.ts` que dependen de
  selectores de vista se ejecutan en el PR transversal.
- **PWA/Workbox**: el manifiesto de precache no cambia; los chunks nuevos
  (`views/` vs `components/`) reescriben entradas del precache, pero el
  `generateSW` regenera el manifiesto en el build sin cambios de config.
- **Persistencia de TanStack Query**: el nombre de las raíces de query **no
  cambia** en este spec (la normalización de raíces es del spec 034), por lo
  que el `buster` de build invalida el caché persistido de forma coherente.

## Riesgos y rollback

| Riesgo                                                                                        | Mitigación                                                                                                                                                                               | Rollback                               |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| La regla ESLint de hooks rompe 4 vistas y genera ruido de lint                                | la regla se activa como `error` con una **allowlist temporal explícita** por archivo; la retirada está asignada a T7 y T8, y el budget 0/0 de `lint-budget.json` se respeta en esta rama | revertir el bloque ESLint              |
| `no-restricted-syntax` sobre `use*` es demasiado amplio (falsos positivos)                    | se acota a `CallExpression` con `callee` identificador (no `MemberExpression` salvo `React.use*`) y se prueba con sonda negativa en el propio guardrail                                  | ajustar el selector                    |
| **Perder la señal `mustChangePassword`** al mover el flag de modal fuera de UI compartida     | el login conserva la propiedad en `currentUser`; `useAuth` deriva apertura y `clearMustChangePassword` limpia la señal persistida; test dedicado                                         | revertir T25                           |
| **Duplicar el estado del modal** entre dashboard y time-control (hoy comparten store)         | `EditTimestampModal.container.tsx` pasa a **props controladas**; cada container instancia su propio hook; se elimina la importación cross-feature                                        | revertir T24                           |
| **Perder la señal `hasUnreadNotes`**: no viene de la API, solo del socket `quickNote:created` | el store conserva la señal; Dashboard la limpia al abrir modal y pasa señal/callback a `ToolsPanel` por `widgetProps`                                                                    | revertir T26                           |
| Migrar los flags de `dashboardSlice` al estado local rompe vistas que los comparten           | inventario previo de los 10 flags × consumidores; los que cruzan feature se resuelven con props controladas (no con store compartido)                                                    | revertir el PR completo                |
| El ratchet `LARGE_HOOKED_COMPONENT_BUDGET` no llega a 0 (56 → 48)                             | es **intencional**: el budget solo decrece y bloquea nuevas infracciones; llegar a 0 exigiría refactors cosméticos sobre componentes legítimos (p. ej. `components/ui/DatePicker.tsx`)   | mantener 48 y documentar el remanente  |
| Borrar `syncSlice.bulkAddRecords` rompe la cola de escritura offline                          | **verificar consumidores con grep antes de borrar**; la cola offline es invariante de la spec 032 y no se toca funcionalmente                                                            | restaurar el slice                     |
| Eliminar `src/types/contexts.ts` rompe imports en `src/types/index.ts`                        | `npm run check` (tsc) es la red; grep de `ContextType` antes de borrar                                                                                                                   | restaurar el archivo                   |
| El guardrail nuevo se vuelve ruido y el equipo lo ignora                                      | el budget se inicializa al conteo real y **solo decrece**; el mensaje de error nombra el archivo y la acción concreta                                                                    | bajar la severidad a `warn` en el test |
| Los 9 shims existen por una razón de lazy-loading que no se reproduce                         | se reescriben los `React.lazy` a los containers y se verifica el build (`vite build`) antes de borrar los shims                                                                          | restaurar los shims                    |
| Regresión funcional silenciosa (modales que no abren o no cierran)                            | suites dirigidas por fase y e2e completo en el PR transversal; los `data-testid` no se tocan                                                                                             | revert del PR completo                 |
| El conteo de palette crudo sube al tocar archivos certificados                                | el budget de `design-system-budget.json` solo decrece; si una migración introduce palette crudo, se tokeniza en el mismo PR                                                              | revertir la migración de estilos       |

## Verificación

```bash
cd frontend
npm run lint                       # regla de hooks + budget 0/0
npm run guardrails                 # viewPurityGuardrails + los 14 existentes
npm run test:run -- src/tests/guardrails
npm run check                      # tsc tras cada migración
npm run validate:ci                # suite completa (format, lint, tsc, tests, build)
npm run e2e:staging                # 68 tests enumerados: regresión funcional

# Raíz
npm run spec:check                 # formato del spec
npm run docs:check                 # enlaces vivos + índice ADR
npm run preflight                  # suite completa
```
