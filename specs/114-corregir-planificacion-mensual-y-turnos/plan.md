# Plan 114: Corrección de planificación mensual y turnos

Spec: `./spec.md`.

## Estrategia técnica

1. **Contratos HTTP y esquemas (`backend/src/models/schemas/shift.schemas.ts`, `backend/src/modules/shifts/`)**:
   - Añadir `search`, `showArchived`, `since` a `ShiftQuerySchema` (y al query de listado de asignaciones/patrones en OpenAPI).
   - Ampliar `PatternScheduleSchema.dayIndex` a `z.number().int().min(0)` (y validar consistencia con `cycleLengthDays` en `ShiftValidator`).
   - En `shifts/http/routes.ts`: restringir mutaciones (`POST/PUT/DELETE /patterns*`, `/assignments*`, `/monthly-plan`, `GET /monthly-plan/...`, `suggest-pattern-name`, `validate-conflicts`) a `["Administrador", "Supervisor_Elevado", "Supervisor"]`, dejando `Reloj_Control` y `Fiscalizador` en solo lectura (`read`).
   - En `shifts/application/flows.ts`: asegurar que `isShiftValidationError` capture errores de 7 días (`antigüedad`), `6x1`, `Conflicto`, `excesiva`, `Descanso` y validación de horarios (o usar `ValidationError` directamente en servicios).
   - Sincronizar `swagger.json` y `frontend/src/types/api-schema.ts` (`npm run check:sdk` / script de sync).
2. **Servicios backend (`shiftService.ts`, `ShiftValidator.ts`, `MonthlyShiftService.ts`, `shiftRotationService.ts`)**:
   - `getAssignments`: combinar `isDeleted: false`, `showArchived` (`AND`) y filtro de rango incluyendo `{ endDate: null }` sin sobrescribir `where.OR`; soportar filtro `search` en servidor si es necesario para >50 asignaciones.
   - `ShiftValidator`: calcular el índice real del ciclo para `startDate` en `validateRestPeriod` usando fecha/hora de negocio de Chile; en `calculateAverageWeeklyHours` evaluar todas las asignaciones/periodos afectados (no solo el último); en `validatePatternSchedules` validar `dayIndex` y duración.
   - `assignShift` / `updateAssignment` / `bulkAssignShifts`: envolver en `withDirectTransaction` con bloqueo `FOR UPDATE` sobre la fila del empleado, validar reglas completas y registrar auditoría.
   - `MonthlyShiftService.createMonthlyPlan`: filtrar `isDeleted: false`, usar bloqueo `FOR UPDATE` por empleado en `withDirectTransaction`, soft-delete (`isDeleted: true, deletedAt`) en vez de `deleteMany` físico cuando corresponda, poblar `employeeName`/`shiftPatternName`, permitir configurar `worksOnHolidays`/`hasColacion`/`colacionMinutes`, emitir Socket.IO y registrar auditoría.
   - `rotateIndefiniteShifts`: filtrar `isDeleted: false`, usar `toBusinessDateChile()` y ejecutar cierre + creación en `withDirectTransaction` (copiando `employeeName`/`shiftPatternName`).
3. **Frontend (`theoretical-shifts`, `planning`, `shift-calendar`, `App.tsx`, navegación)**:
   - `App.tsx` y navegación lateral: permitir `ROLES.FISCALIZADOR` en `ROUTES.SHIFT_CALENDAR` (solo lectura).
   - `useAssignmentManagerController.ts` / `useAssignedShiftsInfiniteQuery`: asegurar búsqueda funcional cuando hay >50 asignaciones (paginando/buscando en servidor o cargando filtro completo).
   - `WizardContainer.tsx` (`#/planning/monthly`): implementar asistente de planificación mensual conectado a `GET /api/shifts/monthly-plan/:employeeId/:year/:month`, `GET /api/shifts/suggest-pattern-name` y `POST /api/shifts/monthly-plan`.
   - `useShiftCalendarData.ts` / `exportToIcs.ts`: diagnosticar y corregir por qué el botón `ICS` no disparó descarga en navegador.
4. **Verificación**:
   - Pruebas unitarias e integración Fastify (con PostgreSQL desechable para concurrencia, bulk, monthly plan y rotación).
   - Pruebas unitarias frontend + auditoría Playwright en staging local (escritorio y móvil) + `npm run check`, `npm run lint`, `npm run check:sdk`, `npm run docs:check`.
