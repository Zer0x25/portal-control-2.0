# Tareas 114: Corrección de planificación mensual y turnos

Spec: `./spec.md`. Plan: `./plan.md`.

- [x] T1: Corregir esquemas (`ShiftQuerySchema`, `PatternScheduleSchema`), permisos de roles (`Reloj_Control` y `Fiscalizador` solo lectura en API) y mapeo de `ValidationError` en `shifts/http/routes.ts` y `shifts/application/flows.ts` (AC1, AC3, AC8).
- [x] T2: Corregir `ShiftService` (`getAssignments` con rango + indefinidos + `search`, `assignShift`/`updateAssignment` con `withDirectTransaction` + `FOR UPDATE`, y `bulkCreatePatterns`/`bulkAssignShifts` con validaciones, transacción y auditoría) y `ShiftValidator` (`validateRestPeriod` en Chile con ciclo real, `validateWorkload` sobre todas las asignaciones) (AC2, AC3, AC4).
- [x] T3: Corregir `MonthlyShiftService.createMonthlyPlan` (`isDeleted: false`, `FOR UPDATE`, soft-delete, `employeeName`/`shiftPatternName`, flags configurables, sockets y auditoría) y `rotateIndefiniteShifts` (`isDeleted: false`, fecha Chile, `withDirectTransaction`) (AC5, AC7).
- [x] T4: Sincronizar OpenAPI (`swagger.json`) y SDK frontend (`api-schema.ts`), y actualizar pruebas backend (unitarias + Fastify integration + concurrencia PostgreSQL) (AC1–AC5, AC7, AC8).
- [x] T5: Implementar asistente funcional de `#/planning/monthly` (`WizardContainer` + endpoints `monthly-plan*` y `suggest-pattern-name`), habilitar `#/shift-calendar` para `Fiscalizador`, corregir búsqueda de asignaciones >50 en `#/theoretical-shifts` y descarga `ICS` en `#/shift-calendar` (AC6, AC8).
- [x] T6: Verificar en staging Playwright (escritorio y móvil), ejecutar `validate:ci` en backend y frontend, `lint:budget` y `docs:check`; actualizar `docs/flows/planificacion-mensual-y-turnos.md` y `_index.md` a `SINCRONIZADO_Y_VERIFICADO` (AC1–AC8).
