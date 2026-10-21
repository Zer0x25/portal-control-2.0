# Tareas 032: Remote State Consolidation

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## PR 1 — Persister seguro

- [x] T1: Añadir `@tanstack/react-query-persist-client` +
      `@tanstack/query-async-storage-persister` (ambas runtime) y montar
      `PersistQueryClientProvider` con `createAsyncStoragePersister` (IndexedDB,
      store separado de la cola offline) en
      `frontend/src/contexts/AppProviders.tsx` (AC3).
- [x] T2: Configurar `dehydrateOptions.shouldDehydrateQuery` con **allowlist**
      de queries seguras (catálogos/operación; fuera: auth, PII) y `buster`
      derivado de la versión de build; test de que ninguna query sensible se
      persiste (AC2.2, AC2.3).

## PR 2 — Purga de caché en sesión

- [ ] T3: Purge íntegro del caché persistido al logout, expiración de sesión y
      cambio de usuario (comparando token/userId en boot); purge idempotente,
      limitado al store del caché de queries (nunca a la cola offline); test
      kiosk login A → logout → login B sin datos de A (AC2.1).

## PR 3 — Migración de slices

- [x] T4: Batch 1 — `absenceSlice`, `shiftSlice`, `configSlice`: retirar imports
      de servicio y escritura IDB; unificar a los query hooks existentes como
      única fuente (AC1).
      **Hecho (2026-10-20)**: `absenceSlice` y `shiftSlice` eliminados (sus
      miembros ya no tenían consumidores; todo leía de `use*Query`);
      `configSlice` reemplazado por `systemSlice` (solo `serverTimeOffset`, sin
      servicio) más las queries de config; `syncSlice.runSync` invalida
      `config`/`shiftPatterns`/`assignedShifts` en vez de llamar
      `loadConfigData`/`loadShiftData`; `useShiftMutations` y
      `useHolidayMutations` dejan el double-refresh (solo `invalidateQueries`).
      tsc 0 errores, 482/482 tests, guardrails 52/52, lint 0/0.
- [x] T5: Batch 2 — `employeeSlice`, `userSlice`, `meterReadingSlice`,
      `dashboardSlice`: idem; los slices reducen a flags de UI (AC1).
      **Hecho (2026-10-20)**: nuevos `useEmployeesQuery`/`useKioskEmployeesQuery`,
      `useUsersQuery` y `useMeterReadingsQuery`+`useMeterConfigsQuery`; los
      slices `employee`, `user` y `meterReading` se eliminan y `dashboardSlice`
      queda solo con flags de modales; `confirmResponsibleClockOut` pasa a
      `useDashboardClockActions`; cada acción invalida su raíz en vez de
      recargar el store; `useSocketEvents` dejó el double-refresh de `users`.
      tsc 0 errores, 482/482 tests, guardrails 52/52, lint 0/0, build OK.

## PR 4 — Guardrail de frontera y refresh único

- [x] T6: Nuevo guardrail `frontend/src/tests/guardrails/stateBoundaryGuardrails.test.ts`:
      bloquea servicios de dominio en `store/slices/*` **con whitelist explícita
      de exactamente dos archivos — `syncSlice.ts` (cola offline de escritura) y
      `authSlice.ts` (sesión) — congela la longitud (crecer falla CI)** y detecta
      el patrón double-refresh (`invalidateQueries` + `loadXData()`
      simultáneos) en `hooks/use*Mutations.ts` (AC1).
      **Hecho (2026-10-20)**: 4 tests (frontera, congelación de whitelist a
      2, double-refresh y cobertura de invalidación); verificado con sonda
      negativa (una slice con servicio importado rompe el guardrail) y
      agregado a `test:guardrails`/`lint:guardrails` (13 archivos/56 tests).

- [x] T7: Aplicar la regla: quitar `loadShiftData()`/`loadAbsenceData()` de
      `useShiftMutations.ts` y `useHolidayMutations.ts` (solo
      `invalidateQueries`); auditar con grep que ninguna otra mutación tiene el
      patrón (AC1).
      **Hecho (2026-10-20)**: la eliminación ya se aplicó en T4 (los loaders
      dejaron de existir con los slices); auditoría final con grep: (a) 0
      loaders `load*()` en `src/hooks/use*Mutations*.ts`, (b) 0 imports de
      servicios/IDB fuera de `syncSlice`/`authSlice`, (c) 0 archivos con
      `invalidateQueries` + loader del store en hooks de mutación. Único
      `state.load*()` restante de `src`: `loadNotifications()` en
      `useSocketEvents.ts` y `syncSlice.ts`, que es un reset local de flags
      (no recarga una colección remota) y vive fuera del alcance de AC1.
      El guardrail de T6 impide regresiones.

## PR 5 — E2E offline de salida

- [x] T8: Ejecutar e2e offline de kiosk/worker-portal: lectura desde caché
      persistido sin red y cola de escritura intacta (`syncSlice` sin cambios
      funcionales) (AC3).
      **Hecho (2026-10-20)**: nuevo `frontend/e2e/offline.spec.ts` (3 tests,
      verde ×2 corridas a 1 y 2 workers) contra build de producción
      (`vite preview`) + backend real: (1) worker-portal recarga con
      `context.setOffline(true)` y sirve "Identidad Digital" desde el cache
      persistido, (2) kiosk sirve la lista de personal offline tras una carga
      pública online, (3) escritura con `/api/**` abortado degrada con toast
      "Error de conexión al registrar marcaje." y la sesión sobrevive;
      reconectada, la app opera con normalidad. La recarga offline la sirve
      el service worker (PWA autoUpdate con precache + navigateFallback); el
      spec espera control del SW y una carga de calentamiento online, igual
      que un dispositivo que ya usó la app. Corrección derivada:
      `useKioskEmployeesQuery` deja de gatearse por token porque
      `GET /api/employees/kiosk` es la única ruta pública de empleados
      (contrato del backend) y el kiosco funciona sin sesión. La cola de
      escritura de `syncSlice` (`bulkAddRecords`, delta sync) quedó intacta
      en T4/T5: solo cambiaron los pasos de carga a invalidación.
- [ ] T9: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run test:run -- src/tests/guardrails`, `npm run e2e:staging`,
      `npm run spec:check`, `npm run docs:check`, `npm run preflight`; promover
      el estado del spec a Implementado (AC4).
- [ ] T10: Con 031 y 032 completos: promover ADR-0022 de "Propuesto" a
      "Aceptado" con links a la implementación, verificar indexación en
      `docs/adr/README.md` y cerrar las tareas pendientes de ambos specs (AC4).
