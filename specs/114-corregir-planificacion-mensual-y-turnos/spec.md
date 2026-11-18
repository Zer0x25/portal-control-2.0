# Spec 114: Corrección de planificación mensual y turnos

- Estado: Implementado y validado localmente
- Autor: equipo portal-control
- Fecha: 2026-11-18
- ADR relacionado: N/A

## Problema

La replicación documentada en [planificación mensual y turnos](../../docs/flows/planificacion-mensual-y-turnos.md) confirmó ocho defectos (`BUG-01` a `BUG-08`) y una omisión de contrato en `ShiftQuerySchema` (`ANOMALÍA-01`): rechazo HTTP de patrones con ciclo > 7 días, omisión de asignaciones indefinidas al filtrar por rango, errores `500` y fallos de validación/concurrencia en asignaciones, rutas masivas sin validaciones ni auditoría, truncamiento/borrado físico en `MonthlyShiftService`, `#/planning/monthly` «Módulo en Construcción», rotación automática sobre filas eliminadas en UTC sin transacción, desalineación de permisos para `Reloj_Control` y `Fiscalizador`, búsqueda parcial de asignaciones en UI y exportación ICS sin descarga efectiva.

## Alcance

Dentro: `BUG-01` a `BUG-08` y `ANOMALÍA-01`, sincronización OpenAPI/SDK (`npm run check:sdk`), asistente funcional en `#/planning/monthly` conectado a `/api/shifts/monthly-plan*` y `suggest-pattern-name`, alineación de roles (`Reloj_Control` y `Fiscalizador` solo lectura) y pruebas de regresión en backend y frontend.

Fuera: modificar datos históricos ya persistidos o introducir Express.

## Criterios de aceptación

- [x] AC1 (`ANOMALÍA-01`, `BUG-01`): `ShiftQuerySchema` declara `search`, `showArchived`, `since`; `PatternScheduleSchema` permite `dayIndex >= 0` acorde a `cycleLengthDays`, aceptando patrones > 7 días por HTTP y UI.
- [x] AC2 (`BUG-02`): `GET /api/shifts/assignments` con `startDate`/`endDate` incluye asignaciones activas indefinidas (`endDate: null`) que cubren el rango sin sobrescribir filtros de estado.
- [x] AC3 (`BUG-03`): Errores de regla 7 días (`antigüedad`) y `6x1` devuelven `400 VALIDATION_ERROR`; `validateRestPeriod` evalúa el día del ciclo correspondiente a `startDate` en horario de Chile; `validateWorkload` evalúa todas las asignaciones afectadas (no solo la última); `assignShift` y `updateAssignment` usan `withDirectTransaction` con bloqueo por empleado (`FOR UPDATE`).
- [x] AC4 (`BUG-04`): `bulkCreatePatterns` valida horarios; `bulkAssignShifts` valida límite de 7 días, descanso 8 h, regla `6x1` y carga, persiste atómicamente en transacción directa con bloqueo por empleado y registra auditoría.
- [x] AC5 (`BUG-05`): `MonthlyShiftService.createMonthlyPlan` filtra `isDeleted: false`, adquiere bloqueo por empleado en `withDirectTransaction`, cierra asignaciones previas a la fecha de corte respetando la fecha límite del nuevo plan (sin restaurar meses futuros), usa soft-delete cuando corresponda, preserva `employeeName`/`shiftPatternName`, respeta opciones de colación/feriados del payload (con defaults seguros), emite eventos Socket.IO y registra auditoría.
- [x] AC6 (`BUG-06`): `#/planning/monthly` reemplaza el estado «Módulo en Construcción» por un asistente funcional conectado a `GET /api/shifts/monthly-plan/:employeeId/:year/:month`, `GET /api/shifts/suggest-pattern-name` y `POST /api/shifts/monthly-plan`.
- [x] AC7 (`BUG-07`): `rotateIndefiniteShifts` excluye `isDeleted: true`, usa fecha de negocio de Chile (`toBusinessDateChile`), y cierra la fila actual + crea la sucesora atómicamente en `withDirectTransaction`.
- [x] AC8 (`BUG-08`): `Reloj_Control` y `Fiscalizador` quedan en solo lectura en `/api/shifts/*` (`403` en mutaciones) y en UI (`#/shift-calendar` habilitado en solo lectura para ambos; `#/theoretical-shifts` y `#/planning/monthly` restringidos a `Administrador`, `Supervisor_Elevado` y `Supervisor`). La búsqueda de asignaciones en `#/theoretical-shifts` encuentra registros aunque existan >50 asignaciones (búsqueda en servidor o carga completa). El botón `ICS` en `#/shift-calendar` genera y descarga el archivo `.ics` correctamente.

## Restricciones y supuestos

- Fastify único servidor HTTP; Prisma 7 desde `backend/src/generated/prisma/client`; transacciones directas con `withDirectTransaction`; cero `any` y lint budget `0/0`.
- Decisiones del usuario (2026-11-18):
  1. `DUDA-01`: Conectar `#/planning/monthly` a `/api/shifts/monthly-plan*` (opción 1.A).
  2. `DUDA-02`: `Reloj_Control` y `Fiscalizador` en solo lectura en planificación/calendario.
  3. `DUDA-03`: Al cargar un plan mensual con fecha límite, la asignación previa se cierra a la fecha de corte y manda la nueva fecha límite (no se reabre después).

## Trazabilidad

- Evidencia de origen: sección 6 de [planificacion-mensual-y-turnos.md](../../docs/flows/planificacion-mensual-y-turnos.md).
- Documentación: actualizar `docs/flows/planificacion-mensual-y-turnos.md` (sección 4 y 7) y `docs/flows/_index.md` tras verificación completa.
