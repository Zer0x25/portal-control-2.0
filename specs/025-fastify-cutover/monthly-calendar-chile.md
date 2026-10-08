# Calendario mensual: fecha de Chile y consultas por lote

Corrección funcional posterior al cutover, autorizada el 2026-10-07.
La caracterización histórica de 015 conserva el defecto anterior como evidencia.

## Contrato correctivo

- Cada fila mensual evalúa la misma fecha de negocio que muestra dateIso.
  El día 1 ya no muestra el estado del último día del mes anterior.
- Calendario mensual y monthly-plan comparten el resultado corregido, manteniendo
  sus permisos HTTP existentes y los campos dateIso/dayOfWeek/dayOfMonth/
  scheduleText/isWorkDay.
- Recorrido de días mediante calendario UTC a mediodía, que corresponde a la
  misma fecha en Santiago. No depende del TZ del servidor ni de medianoches
  inexistentes al iniciar horario de verano; no suma intervalos de 24h locales.
- Empleado se consulta una vez; assignments, permisos, feriados y patrones se
  cargan por lote para el rango inclusivo del mes y se reutilizan todos los días.
  Cinco consultas para un empleado existente, independientes del largo del mes.
- Conserva reglas de ciclos y prioridades de permisos/feriados/turnos.
  Empleado inexistente conserva filas N/A sin cargar contexto adicional.
- No cambia escritura de planes, lógica de fechas de otros endpoints ni schemas.

## Verificación

monthlySchedule.test.ts: 15 casos para meses de 28–31 días, febrero bisiesto,
inicio/fin DST, límites mensuales y TZ UTC/Santiago/New York; carga acotada y
prioridad de vacaciones sobre feriado. Los 15 fallaron antes y pasaron después.
shifts.test.ts: HTTP/PostgreSQL en Express/Fastify, plan work/rest sin desfase,
septiembre de 2026 y resultado compartido con monthly-plan.

## Resultado

- Backend validate:ci aprobado, incluidos strict, SDK sin cambios y build.
- Pruebas unitarias de calendario, flujos, reglas y timePolicy: 38 aprobadas.
- docs:check aprobado.
- PostgreSQL desechable: 20 archivos y 535 pruebas aprobadas.
- Frontend validate:ci aprobado: 74 archivos, 279 pruebas y build.
- spec:check y secrets:scan aprobados.
