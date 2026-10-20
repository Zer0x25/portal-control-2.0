# Plan 032: Remote State Consolidation

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermano de superficie UI: `../031-ui-ux-consolidation/plan.md`.

## Estrategia

4 PRs secuenciales, cada uno verde (`validate:ci`) antes del siguiente. La
prioridad de diseño es que el **retorno fácil exista en cada paso** sin fuga de
caché entre usuarios: la seguridad se monta ANTES de que haya datos sensibles
persistidos (PR 1 solo persiste catálogos seguros; la purga y las exclusiones
preceden a la migración de datos PII).

1. **PR 1 — Persister seguro**:
   - Añadir `@tanstack/react-query-persist-client` (runtime) +
     `@tanstack/query-async-storage-persister` (runtime) a `package.json`.
   - `PersistQueryClientProvider` en
     [AppProviders.tsx](../../frontend/src/contexts/AppProviders.tsx) con
     `createAsyncStoragePersister` (IndexedDB via `idb`, DB propia, no la de la
     cola offline).
   - Seguridad desde el primer byte persistido:
     - `dehydrateOptions.shouldDehydrateQuery`: solo queries marcadas como
       catálogo/operación segura; exclusiones para auth/PII (queryKey allowlist,
       no blocklist).
     - `buster` derivado de la versión de build (`__BUILD_VERSION__` de Vite).
   - Verificar restauración en boot sin doble-loading (`staleTime` ya 5 min).
2. **PR 2 — Purga de caché en sesión**:
   - Purge completo (`persister.removeClient()`/limpieza del DB) integrado al
     logout de [authSlice.ts](../../frontend/src/store/slices/authSlice.ts) y a
     la expiración de sesión; también al detectar cambio de usuario (comparar
     token/userId contra el persistido).
   - Test: en kiosk, login A → logout → login B ⇒ IndexedDB sin datos de A
     (AC2.1). Purge idempotente y corre también si la app arranca como B.
3. **PR 3 — Migración de slices (2 batches)**:
   - Batch 1: `absenceSlice`, `shiftSlice`, `configSlice` → sus query hooks
     (`useLeavesQuery`/`useHolidaysQuery`/`useShiftPatternsQuery`/
     `useAssignedShiftsQuery`/`useConfigQuery`), borrando imports de servicio y
     escritura IDB del slice.
   - Batch 2: `employeeSlice`, `userSlice`, `meterReadingSlice`,
     `dashboardSlice` → sus query hooks equivalentes.
   - Los slices reducen a flags de UI (los flags de modal/lecturas pendientes).
4. **PR 4 — Guardrail + refresh único**:
   - Guardrail de frontera en
     [store/slices](../../frontend/src/store/slices): bloquea imports de
     servicios de dominio con whitelist explícita de dos archivos y longitud
     congelada (`syncSlice.ts` cola offline de escritura, `authSlice.ts`
     sesión); falla si la whitelist crece.
   - Guardrail complementario: no `invalidateQueries` + `loadXData()`
     simultáneos en `hooks/use*Mutations.ts` (patrón doble-refresh prohibido).
   - Borrar el refresh doble real: `useShiftMutations.ts` y
     `useHolidayMutations.ts` abandonando `loadShiftData()`/`loadAbsenceData()`.
5. **PR 5 — E2E offline de salida**:
   - Ejecutar e2e offline existentes de kiosk/worker-portal (cola de escritura
     intacta; pantallas sirviendo datos desde caché en modo sin red) y suite completa.

## Archivos a tocar

| Archivo | Cambio |
| ------- | ------ |
| `frontend/package.json` | `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` (runtime) |
| `frontend/src/contexts/AppProviders.tsx` | `PersistQueryClientProvider` + persister + dehydrate allowlist + buster |
| `frontend/src/store/slices/{absence,shift,config,employee,user,meterReading,dashboard}Slice.ts` | retirar servicio+IDB, colecciones remotas |
| `frontend/src/store/slices/{syncSlice,authSlice}.ts` | sin cambios funcionales (whitelist explícita); authSlice gana purge de caché en logout |
| `frontend/src/hooks/useShiftMutations.ts` | quitar refresh doble |
| `frontend/src/hooks/useHolidayMutations.ts` | quitar refresh doble |
| `frontend/src/tests/guardrails/stateBoundaryGuardrails.test.ts` | nuevo: servicios en slices + doble-refresh |
| `frontend/vite.config.ts` / constantes de build | `buster` desde versión de build |
| `docs/adr/0022-ui-ux-consolidation.md` | decisión permanente |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno** — consolidación de estado de
  cliente pura.
- **IndexedDB**: se añade un nuevo store para el caché de queries (nombre y
  versión separados del store de la cola offline); la purga se limita a ese
  store, nunca a `WIPE_ALL_DATA` de las escrituras offline.
- **Ciclo de vida de sesión**: `authSlice.logout` gana una llamada de purga;
  ningún contrato HTTP cambia.

## Riesgos y rollback

| Riesgo | Mitigación | Rollback |
| ------ | ---------- | -------- |
| Fuga de datos de usuario A visible para B en dispositivo compartido (kiosk) | la seguridad va antes que el dato: PR 1 persiste solo catálogos; purge + shouldDehydrateQuery exclusions antes de migrar PII (PR 3) | desmontar persister por flag y volver al estado pre-PR1 |
| Regresión offline de worker-portal/kiosk al cortar slices | e2e offline como puerta de salida de cada batch; cola de escritura no tocada | revertir el batch (el slice vuelve a servicio+IDB) |
| Hidratación anticipada causa doble-loading | persist manual de restauración con `staleTime` intacto; probar en boot | desmontar plugin en `AppProviders` |
| Borrar `loadXData()` quiebra consumidores invisibles del store | grep de consumidores antes de borrar (`useXStore`); checklist por slice en T6/T7 | restaurar skip del slice puntual |
| Purge en logout falla en pestañas múltiples | purge vía broadcast/localStorage event inicial; test con dos pestañas | purge solo al boot con usuario distinto |

## Verificación

```bash
cd frontend
npm run check                       # tipo tras cada PR
npm run validate:ci                 # suite completa
npm run test:run -- src/tests/guardrails   # stateBoundaryGuardrails
npm run e2e:staging                 # offline kiosk/worker + suite e2e completa
npm run test:run -- --grep "persist"      # tests del persister/purge

# Raíz
npm run spec:check
npm run docs:check
npm run preflight
```
