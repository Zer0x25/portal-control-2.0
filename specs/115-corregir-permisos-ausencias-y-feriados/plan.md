# Plan 115: Corregir permisos, ausencias y feriados

## Orden de ejecución

1. **Esquema y migración Prisma (coordinador, antes de workers en paralelo):**
   - Ejecutar precheck de `prisma-migration-safeguard`.
   - Añadir `isRenounceable Boolean @default(false) @map("is_renounceable")` en `model Holiday` (`backend/prisma/schema.prisma`).
   - Generar migración con `npx prisma migrate dev --create-only --name add_holiday_is_renounceable`, auditar `migration.sql`, aplicar si hay DB dev o regenerar cliente (`npm run db:generate`), y commitear el cambio de schema/migración como base para que los workers hereden el cliente Prisma actualizado.

2. **Backend (`backend-leaves-holidays`, workspace `share`):**
   - **Holidays:**
     - Actualizar `HolidayRecord`, `HolidayInput`, `HolidayCommandRepository` (`updateById`, `upsertByDate`, `create` con manejo de `P2002` -> `ConflictError` y `P2025` -> `NotFoundError`).
     - Propagar `isRenounceable` en `commands.ts` (`!item.inalienable` en `sync`), `prismaHolidayCommands.ts`, `HolidayService.ts`, `responseSchemas.ts` y `routes.ts`.
     - Restringir `supervisorRoles` de escritura en `holidays/http/routes.ts` a `["Administrador", "Supervisor_Elevado", "Supervisor"]`.
   - **Leaves:**
     - En `leaves/http/routes.ts`: separar `readRoles` (`Administrador`, `Supervisor_Elevado`, `Supervisor`, `Reloj_Control`, `Fiscalizador`) para `GET /api/leaves` y `writeRoles` (`Administrador`, `Supervisor_Elevado`, `Supervisor`) para `POST /api/leaves` y `DELETE /api/leaves/:id`.
     - En `LeaveService.delete`: preservar `endDate` original al hacer soft-delete.
     - En `LeaveQuerySchema`, `leaves/application/contracts.ts`, `flows.ts` y `LeaveService.list`: añadir `type` y `search` (batch lookup en `prisma.employee.findMany` para `search`), y limpiar la rama muerta `user.role === "Usuario"`.
   - **Tests backend:** actualizar y ampliar `leavesCorrections.test.ts`, `holidays.test.ts`, `holidayService.test.ts`, `holidayService.sync.test.ts`, `getHolidays.test.ts`.

3. **Frontend (`frontend-leaves-holidays`, workspace `share`):**
   - `frontend/src/hooks/useLeaveManagerController.ts`: eliminar llamada duplicada a `justifyRecordsForLeave`, pasar `filterType` / `filterEmployeeName` al query (`useLeavesInfiniteQuery`) con debounce/parámetro limpio si aplica.
   - `frontend/src/hooks/useLeaveMutations.ts`: invalidar también `queryKeys.timeRecords()` al crear/eliminar ausencias.
   - `frontend/src/hooks/queries/useLeavesInfiniteQuery.ts` & `frontend/src/services/leaveService.ts`: soportar `type` y `search` en `getLeaves`.
   - `frontend/src/services/holidayService.ts` & `frontend/src/hooks/useHolidayMutations.ts`: alinear `HolidaySyncResult` (`{ success, total, year }`), toast de sync sin `undefined`, e incluir `isRenounceable` en `CreateHolidayPayload` / `UpdateHolidayPayload` y `Holiday` (`frontend/src/types/index.ts` / `scheduling.ts`).
   - `frontend/src/features/theoretical-shifts/hooks/useHolidayManagerController.ts`, `HolidayForm.tsx`, `HolidayListDesktop.tsx`, `HolidayListMobile.tsx`: soportar `isRenounceable` (checkbox en formulario + indicador visual en lista).
   - **Tests frontend:** añadir/actualizar tests unitarios de `holidayAndConfigService.test.ts` y controller/hooks de leaves/holidays.

4. **Integración, OpenAPI/SDK sync y verificación (coordinador + `verifier-3`):**
   - Mergear workers, ejecutar `npm run check:sdk` (regenerar Swagger + SDK frontend si cambió el contrato OpenAPI), correr suites backend/frontend y verificar en staging con Playwright.
