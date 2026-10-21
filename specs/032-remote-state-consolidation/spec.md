# Spec 032: Remote State Consolidation

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-20
- Cierre: 2026-10-20 (T1–T10, suite completa verde)
- ADR relacionado: [0022-ui-ux-consolidation.md](file:///docs/adr/0022-ui-ux-consolidation.md) (extiende [0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md))
- Spec hermano: [specs/031-ui-ux-consolidation/spec.md](file:///specs/031-ui-ux-consolidation/spec.md) (superficie UI, no depende de este y viceversa)

## Problema

Auditoría UI/UX (2026-10-20): el frontend mantiene **dos sistemas de datos en
paralelo**, con contratos y riesgos propios:

1. **Colecciones remotas duplicadas**: 7 slices de Zustand importan servicios de
   dominio y escriben IndexedDB, duplicando colecciones que TanStack Query ya
   gestiona (`absenceSlice.ts`:5-105, `shiftSlice.ts`:5,
   `meterReadingSlice.ts`, `employeeSlice.ts`, `userSlice.ts`, `configSlice.ts`,
   `dashboardSlice.ts` — los tres primeros se eliminaron y los demás quedaron
   como flags de UI en T4/T5, ver
   [tasks.md](file:///specs/032-remote-state-consolidation/tasks.md)) —
   violando la invariante 4 de
   [frontend-performance.md](file:///.agents/rules/frontend-performance.md).
   La cola de escritura offline ([syncSlice.ts](file:///frontend/src/store/slices/syncSlice.ts))
   y la sesión ([authSlice.ts](file:///frontend/src/store/slices/authSlice.ts))
   también importan servicios, pero **no duplican colecciones**: son estado de
   proceso legítimo y quedan fuera de esta consolidación.
2. **Refresh doble/triple por mutación**:
   [useShiftMutations.ts](file:///frontend/src/hooks/useShiftMutations.ts):17-43
   ejecuta `invalidateQueries` **y además** `loadShiftData()` (recarga
   completa servicio→IndexedDB); idéntico patrón en
   [useHolidayMutations.ts](file:///frontend/src/hooks/useHolidayMutations.ts).
   Doble trabajo de red y riesgo de inconsistencia entre las dos fuentes.
3. **Sin caché persistida controlada**: hoy el offline de solo lectura depende
   del hydration manual de los slices sobre IndexedDB. La consolidación vía
   `persistQueryClient` introduce una forma nueva de persistencia cuyo ciclo de
   vida (logout, cambio de usuario, versiones) debe diseñarse con seguridad:
   kiosk y worker-portal corren en dispositivos compartidos, donde un caché
   persistido sin política de purga puede exponer datos de un usuario al
   siguiente (auth y PII).

## Alcance

Dentro:

- Montaje de la persistencia oficial de TanStack Query en IndexedDB:
  `@tanstack/react-query-persist-client` (React 19/runtime: `PersistQueryClientProvider`)
  - `@tanstack/query-async-storage-persister` (`createAsyncStoragePersister`),
    ambas dependencias de **runtime**.
- Migración de las 7 colecciones remotas de slices Zustand a los query hooks
  existentes (`useLeavesQuery`, `useHolidaysQuery`, `useShiftPatternsQuery`,
  `useAssignedShiftsQuery`, `useConfigQuery`, y equivalentes para
  employee/user/meterReading/dashboard).
- Eliminación del refresh doble en [hooks](file:///frontend/src/hooks) de
  mutación (solo `invalidateQueries`).
- Guardrail que garantice la frontera: slices sin servicios de dominio, salvo
  whitelist explícita (`syncSlice.ts`, `authSlice.ts`).
- **Seguridad del caché persistido en dispositivo compartido**: purga al
  logout/cambio de usuario, exclusión de queries sensibles (`auth`, PII) vía
  `dehydrateOptions.shouldDehydrateQuery` y `buster` por versión de despliegue.
- Preservación sin cambios de la cola de escritura offline
  (`syncSlice.ts`) y del flujo PWA kiosk/worker-portal.

Fuera (explícito):

- Todo lo de superficie UI (modales, tokens, deduplicación, tipografía):
  [specs/031-ui-ux-consolidation](file:///specs/031-ui-ux-consolidation/spec.md).
- Cambios a la cola de escritura offline (sincronización diferida, reintentos):
  su comportamiento es invariante y solo se preserva.
- Backend, `syncservice` HTTP, esquemas Prisma, `swagger.json` o SDK.

## Criterios de aceptación

- [ ] AC1: Fuente única de colecciones remotas: el guardrail de
      [store/slices](file:///frontend/src/store/slices) bloquea imports de
      servicios de dominio **con whitelist explícita de dos archivos:
      `syncSlice.ts` (cola offline de escritura) y `authSlice.ts` (sesión)**,
      que son los únicos legítimos y no pueden crecer; ninguna mutación de
      [hooks](file:///frontend/src/hooks) ejecuta `invalidateQueries` y
      `loadXData()` simultáneos (patrón de `useShiftMutations`/`useHolidayMutations`
      eliminado y detectado por el mismo guardrail).
- [ ] AC2: El caché persistido en IndexedDB es **seguro para dispositivo
      compartido**: 1. se purga íntegramente al hacer logout o al cambiar de usuario (Given
      usuario A cierra sesión en kiosk, When usuario B inicia sesión, Then el
      caché de IndexedDB no contiene datos de A); el purge es idempotente y
      cubre también la expiración de sesión; 2. `dehydrateOptions.shouldDehydrateQuery` excluye queries sensibles
      (autenticación, datos PII marcados), quedando solo catálogos y datos de
      operación ya visibles para el rol al entrar; 3. el `buster` deriva de la versión de despliegue (build), invalidando el
      caché entre versiones.
- [ ] AC3: La lectura offline no se degrada: sin red y tras login previo, el
      worker-portal y kiosk sirven datos desde el caché persistido; la cola de
      escritura offline (`syncSlice`) sigue funcionando intacta y el flujo PWA
      completa sus e2e offline tras la migración.
- [ ] AC4: `npm run validate:ci` (frontend), `npm run guardrails`,
      `npm run spec:check`, `npm run docs:check`, `npm run preflight` y
      `npm run e2e:staging` en verde.

## Restricciones

- Constitución (I–V); ver [constitution.md](file:///specs/constitution.md).
- Invariante 4 de [frontend-performance.md](file:///.agents/rules/frontend-performance.md)
  se cumple por diseño (no duplicación), y las invariantes de guard (clics
  rápidos, toasts únicos) no cambian.
- No se introducen librerías nuevas de persistencia: solo los dos paquetes
  oficiales de TanStack (runtime, tamaños bajos) sobre la dependencia `idb` ya
  existente.
- Preservación bit a bit de la semántica de la cola offline de escritura; si un
  slice tocado alimenta a kiosk, su e2e offline es puerta de salida.
- [AGENTS.md](file:///AGENTS.md) ≤ 120 líneas / ≤ 8 KB.

## Trazabilidad

- Tests que lo probarán: nuevo guardrail de frontera de
  [store/slices](file:///frontend/src/store/slices) (AC1), test de purge de caché
  en logout (AC2, unit/e2e), suites e2e offline de
  [e2e](file:///frontend/e2e) kiosk/worker (AC3), suite completa (AC4).
- Docs a actualizar: [docs/adr/0022-ui-ux-consolidation.md](file:///docs/adr/0022-ui-ux-consolidation.md),
  [docs/adr/README.md](file:///docs/adr/README.md) y comentario top en cada
  slice migrado (frontera de estado).
