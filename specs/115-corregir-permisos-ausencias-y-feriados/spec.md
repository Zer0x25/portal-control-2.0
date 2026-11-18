# Spec 115: Corregir flujo de permisos, ausencias y feriados

- **Estado:** En progreso (Fase 3 SDD)
- **Flujo origen:** [permisos-ausencias-y-feriados.md](../../docs/flows/permisos-ausencias-y-feriados.md)
- **Fecha:** 2026-11-18

## Contexto y decisiones aprobadas

La Fase 2 de replicación controlada (`50dbbec`) confirmó 6 bugs entre `LeaveManager`, `HolidayManager`, `/api/leaves*` y `/api/holidays*`. El usuario definió las 3 decisiones pendientes el 2026-11-18:

1. **DUDA-01 (1.A):** `Reloj_Control` y `Fiscalizador` operan en **solo lectura** en `/api/leaves` (`GET /api/leaves`) y `/api/holidays` (`GET /api/holidays`), manteniendo `#/theoretical-shifts` bloqueado para ambos roles. Las mutaciones (`POST /api/leaves`, `DELETE /api/leaves/:id`, `POST /api/holidays`, `POST /api/holidays/bulk`, `POST /api/holidays/sync`, `DELETE /api/holidays/:id`) quedan restringidas a `["Administrador", "Supervisor_Elevado", "Supervisor"]`.
2. **DUDA-02 (2.B):** Agregar columna `is_renounceable` (`isRenounceable Boolean @default(false)`) al modelo `Holiday` mediante migración Prisma, poblarla desde Boostr (`isRenounceable = !item.inalienable`), exponerla en `HolidayForm` y en la lista de feriados, y corregir la edición de feriados para actualizar por `id` cuando venga `id` (evitando `409` al cambiar la fecha).
3. **DUDA-03 (3.A):** Preservar el `endDate` original del `LeaveRecord` en `DELETE /api/leaves/:id` al marcar `isDeleted: true` y `deletedAt` (sin sobrescribir `endDate` a `yesterday`).

## Requisitos funcionales

1. **Eliminación de doble `POST /api/leaves` en `LeaveManager` (`BUG-01`):**
   - `useLeaveManagerController.onSubmit` debe invocar únicamente `createLeave` (`POST /api/leaves`) sin llamar a `justifyRecordsForLeave`, ya que `LeaveService.upsert` materializa los `TimeRecord` en la misma transacción.
   - `useLeaveMutations` debe invalidar `queryKeys.leaves()`, `queryKeys.calendarMatrix()` y `queryKeys.timeRecords()` en `onSuccess`.
   - Al completar `onSubmit`, el formulario debe cerrarse y resetearse sin disparar `409 LEAVE_OVERLAP`.
2. **Contrato de sincronización de feriados (`BUG-02`):**
   - `holidayService.ts` y `useHolidayMutations.ts` deben alinearse con el contrato `POST /api/holidays/sync` (`{ success: boolean; total: number; year: number }`) y mostrar un toast claro (ej. `${data.total} feriados sincronizados para ${data.year}.`), eliminando `"undefined feriados nuevos cargados."`.
3. **Edición por `id` y columna `isRenounceable` en `Holiday` (`BUG-03`, `BUG-04`, `DUDA-02`):**
   - Migración Prisma en `holidays`: `is_renounceable BOOLEAN NOT NULL DEFAULT false`.
   - `prismaHolidayCommands` / `commands.ts`:
     - Cuando `upsert(data, actor)` recibe `data.id`, actualizar el registro existente por `where: { id }` (permitiendo cambiar `date`, `name`, `type`, `isRenounceable`). Si `id` no existe, lanzar `NotFoundError`. Si la nueva `date` ya existe en otro feriado, lanzar `ConflictError("Ya existe un feriado registrado en esa fecha.")` (`409`).
     - Cuando `upsert(data, actor)` NO recibe `data.id` (creación manual), si ya existe un feriado en `data.date` (incluso archivado), lanzar `ConflictError("Ya existe un feriado registrado en esa fecha.")` (`409`) en lugar de sobrescribirlo silenciosamente.
     - `bulk` y `sync` siguen usando upsert por `date` (`upsertByDate`), asignando en `sync` `isRenounceable: !item.inalienable`.
   - `holidayRecordResponse` y `holidayQueryResponse` incluyen `isRenounceable: { type: "boolean" }`.
   - `HolidayForm.tsx`, `useHolidayManagerController.ts`, `HolidayListDesktop.tsx`, `HolidayListMobile.tsx` y `holidayService.ts` exponen y muestran `isRenounceable` (por defecto `false`).
4. **Permisos de lectura/escritura (`BUG-05`, `DUDA-01`):**
   - `GET /api/leaves`: permite `["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control", "Fiscalizador"]`.
   - `POST /api/leaves`, `DELETE /api/leaves/:id`: permiten únicamente `["Administrador", "Supervisor_Elevado", "Supervisor"]`.
   - `GET /api/holidays`: mantiene acceso autenticado para lectura.
   - `POST /api/holidays`, `POST /api/holidays/bulk`, `POST /api/holidays/sync`, `DELETE /api/holidays/:id`: permiten únicamente `["Administrador", "Supervisor_Elevado", "Supervisor"]`.
   - Eliminar la rama inalcanzable `user.role === "Usuario"` de `LeaveService.list`.
5. **Preservación de `endDate` en `DELETE /api/leaves/:id` y filtros en servidor (`BUG-06`, `DUDA-03`):**
   - `LeaveService.delete` marca `isDeleted: true` y `deletedAt: new Date()` preservando el `endDate` original.
   - `LeaveQuerySchema` y `LeaveService.list` soportan `type` y `search` (búsqueda por nombre/RUT de empleado vía `employeeId IN (...)` sin N+1) para que `useLeaveManagerController` no dependa únicamente de los 50 registros descargados.

## Criterios de aceptación

- `cd backend && npm run db:generate && npm run check && npm run lint && npm run check:sdk` pasa sin errores ni advertencias (`0/0`).
- `cd frontend && npm run check && npm run lint` pasa sin errores ni advertencias (`0/0`).
- `cd backend && npx vitest run tests/unit/leaveCorrectionFlows.test.ts tests/unit/holidayService.test.ts tests/unit/holidayService.sync.test.ts tests/unit/holidays/getHolidays.test.ts` y `node scripts/run-fastify-isolated.cjs tests/fastify-integration/leavesCorrections.test.ts` y `holidays.test.ts` pasan al 100%.
- En staging / Playwright: registrar una ausencia envía 1 solo `POST /api/leaves` (`201`) y cierra el formulario; editar la fecha de un feriado existente lo mueve sin `409` ni duplicación; «Cargar del Año» muestra el conteo real sin `undefined`; `isRenounceable` se guarda y visualiza; `Reloj_Control` y `Fiscalizador` reciben `200` en `GET /api/leaves` y `403` en mutaciones.
