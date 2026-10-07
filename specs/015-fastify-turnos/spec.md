# Spec 015: Turnos en Fastify

- Estado: Implementado y validado localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

Dieciocho rutas de patrones, asignaciones, calendarios y planificación mensual aún
usan Express. Dos controllers repiten transformación de query, scope y errores.
Marcaciones consulta scheduling y snapshots: necesitamos probar el flujo conjunto.

## Alcance

Aplicación pura con puertos de shift/scheduling/monthly y parser de fecha Chile
inyectado. Express y Fastify comparten orquestación; los servicios vigentes conservan
persistencia, validación de conflictos, batch-fetch y efectos.

| Método | Ruta bajo /api/shifts                  | Permiso                                     |
| ------ | -------------------------------------- | ------------------------------------------- |
| GET    | /patterns                              | Autenticado                                 |
| POST   | /patterns                              | Supervisor                                  |
| PUT    | /patterns/:id                          | Supervisor                                  |
| DELETE | /patterns/:id                          | Supervisor, idempotente 204                 |
| POST   | /patterns/bulk                         | Supervisor, 201 count                       |
| GET    | /assignments                           | Autenticado; Usuario limitado a su empleado |
| POST   | /assignments                           | Supervisor                                  |
| PUT    | /assignments/:id                       | Supervisor                                  |
| DELETE | /assignments/:id                       | Supervisor, 204                             |
| POST   | /assignments/bulk                      | Supervisor, 201 count                       |
| GET    | /schedule/employee/:id                 | Autenticado, scope Usuario/quiosco          |
| GET    | /schedule/employees-on-date            | Supervisor                                  |
| GET    | /schedule/employee/:id/month           | Autenticado, scope Usuario/quiosco          |
| POST   | /schedule/matrix                       | Autenticado, scope Usuario/quiosco          |
| GET    | /monthly-plan/:employeeId/:year/:month | Supervisor                                  |
| POST   | /monthly-plan                          | Supervisor                                  |
| GET    | /suggest-pattern-name                  | Supervisor                                  |
| POST   | /validate-conflicts                    | Supervisor                                  |

Supervisor incluye Administrador, Supervisor_Elevado, Supervisor y Reloj_Control.

## Criterios de aceptación

- [x] AC1: Dieciocho rutas nativas exactas, guard no vacío, auth y validadores; rutas antes sin schema conservan validación manual/cuerpo ignorado.
- [x] AC2: Aplicación strict/pura y API pública; controllers delgados, parser de fecha Chile inyectado y sin nuevos N+1.
- [x] AC3: Patrones/asignaciones/bulk y errores/permisos/eventos/sync conservan contratos.
- [x] AC4: Scope propio de calendario diario/mensual/matriz; permisos persistidos y lotes totalmente validados antes de escribir.
- [x] AC5: Plan mensual, conflictos, límites 1/10 MiB, periodos y transacciones directas conservados; falla mensual revierte sus writes.
- [x] AC6: TDD y PostgreSQL para ambas plataformas; escenario empleado→patrón→asignación→marcación guarda snapshot y cadena válida.
- [x] AC7: Gates independientes y cierre conjunto con backend/frontend, docs/SDK/secrets/ratchets, resultado y limitaciones.

## Restricciones y hallazgos

Constitución I–V. Express principal, sin schema/dependencias nuevas. No reescribir
ShiftService/MonthlyShiftService/scheduling ni cambiar reglas de horario/conflicto.
Validar sin reemplazar body. parseInt permisivo se conserva. ShiftQuery no declara
since/search/showArchived; string dailySchedules permitido por schema se mantiene
como entrada legacy y error actual. Schema mensual usa rest y servicio tipa off,
pero trata cualquier día no work como descanso: alinear tipo con rest sin remap.
Cambio declarado: matriz de Usuario/Kiosk_Employee sin vínculo rechaza 403
antes de scheduling; el código anterior pasaba [null/undefined] a Prisma y fallaba.
Se incorpora BDD/test PostgreSQL para este caso; ningún cast oculta la ausencia.
Scope de assignments solo Usuario con vínculo; Usuario sin vínculo conserva consulta
sin filtro (deuda de autorización explícita, no corregida aquí). Kiosk_Employee no se restringe allí por contrato
heredado (sí en calendarios). EndDate opcional en schema/nullable en servicio.
Auditoría/bulk/eventos no son atómicos ni garantizan entrega a clientes.
Hallazgo PostgreSQL en ambos servidores: calendario mensual consulta medianoche UTC
como instante Chile y lee el día anterior. La prueba caracteriza ese desfase y
comprueba el plan persistido y endpoint diario correctos. Corrección separada con
contrato de fechas; consulta mensual también conserva consultas por día existentes.
La matriz sí conserva getSchedulingContext único con dependencias batch-fetch.

## Trazabilidad

shiftFlows.test.ts, shifts.test.ts PostgreSQL, módulos strict/guards y escenarios
con records.test.ts. services/shiftFlows.ts y dos controllers Express.
