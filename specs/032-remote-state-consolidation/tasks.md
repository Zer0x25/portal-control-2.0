# Tareas 032: Remote State Consolidation

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## PR 1 — Persister seguro

- [ ] T1: Añadir `@tanstack/react-query-persist-client` +
      `@tanstack/query-async-storage-persister` (ambas runtime) y montar
      `PersistQueryClientProvider` con `createAsyncStoragePersister` (IndexedDB,
      store separado de la cola offline) en
      `frontend/src/contexts/AppProviders.tsx` (AC3).
- [ ] T2: Configurar `dehydrateOptions.shouldDehydrateQuery` con **allowlist**
      de queries seguras (catálogos/operación; fuera: auth, PII) y `buster`
      derivado de la versión de build; test de que ninguna query sensible se
      persiste (AC2.2, AC2.3).

## PR 2 — Purga de caché en sesión

- [ ] T3: Purge íntegro del caché persistido al logout, expiración de sesión y
      cambio de usuario (comparando token/userId en boot); purge idempotente,
      limitado al store del caché de queries (nunca a la cola offline); test
      kiosk login A → logout → login B sin datos de A (AC2.1).

## PR 3 — Migración de slices

- [ ] T4: Batch 1 — `absenceSlice`, `shiftSlice`, `configSlice`: retirar imports
      de servicio y escritura IDB; unificar a los query hooks existentes como
      única fuente (AC1).
- [ ] T5: Batch 2 — `employeeSlice`, `userSlice`, `meterReadingSlice`,
      `dashboardSlice`: idem; los slices reducen a flags de UI (AC1).

## PR 4 — Guardrail de frontera y refresh único

- [ ] T6: Nuevo guardrail `frontend/src/tests/guardrails/stateBoundaryGuardrails.test.ts`:
      bloquea servicios de dominio en `store/slices/*` **con whitelist explícita
      de exactamente dos archivos — `syncSlice.ts` (cola offline de escritura) y
      `authSlice.ts` (sesión) — congela la longitud (crecer falla CI)** y detecta
      el patrón double-refresh (`invalidateQueries` + `loadXData()`
      simultáneos) en `hooks/use*Mutations.ts` (AC1).
- [ ] T7: Aplicar la regla: quitar `loadShiftData()`/`loadAbsenceData()` de
      `useShiftMutations.ts` y `useHolidayMutations.ts` (solo
      `invalidateQueries`); auditar con grep que ninguna otra mutación tiene el
      patrón (AC1).

## PR 5 — E2E offline de salida

- [ ] T8: Ejecutar e2e offline de kiosk/worker-portal: lectura desde caché
      persistido sin red y cola de escritura intacta (`syncSlice` sin cambios
      funcionales) (AC3).
- [ ] T9: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run test:run -- src/tests/guardrails`, `npm run e2e:staging`,
      `npm run spec:check`, `npm run docs:check`, `npm run preflight`; promover
      el estado del spec a Implementado (AC4).
- [ ] T10: Con 031 y 032 completos: promover ADR-0022 de "Propuesto" a
      "Aceptado" con links a la implementación, verificar indexación en
      `docs/adr/README.md` y cerrar las tareas pendientes de ambos specs (AC4).
