# Spec 016: Permisos y correcciones

- Estado: Implementado y validado localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema y alcance

Ocho rutas siguen ligadas a controllers Express. Extraer orquestación a módulos
leaves/corrections con API pública index.ts, puertos estrictos, errores/helpers puros compartidos y adaptadores
compartidos; conservar servicios de materialización/aprobación e integridad.

| Método | Ruta                         | Permiso / respuesta                             |
| ------ | ---------------------------- | ----------------------------------------------- |
| GET    | /api/leaves                  | Supervisor, 200 success/data/meta               |
| POST   | /api/leaves                  | Supervisor, 201 success/data; upsert            |
| DELETE | /api/leaves/:id              | Supervisor, 200 success/message                 |
| GET    | /api/corrections             | Autenticado, 200 requests/total                 |
| GET    | /api/corrections/stats       | Autenticado, 200 pending/approved/rejected      |
| GET    | /api/corrections/:id/history | Autenticado, 200 data                           |
| POST   | /api/corrections             | Autenticado, 201 entidad; ownership 403 message |
| PATCH  | /api/corrections/:id/status  | Resolver, 200 entidad                           |

Supervisor: Administrador, Supervisor_Elevado, Supervisor, Reloj_Control.
Resolver: mismos excepto Reloj_Control. Permisos usan rol persistido.
GET leaves usa LeaveQuerySchema; POST leaves usa LeaveRecordSchema y parse explícito
que elimina desconocidos. Corrections usa CorrectionRequestSchema / UpdateCorrectionStatusSchema
sin reemplazar body. GET corrections conserva conversión manual; params string,
query z.unknown en endpoints legacy son marcadores, no validación exhaustiva.
Todos los cuerpos mantienen límite global 1 MiB, sin bulks nuevos.

## Criterios de aceptación

- [x] AC1: Manifiestos exactos de 3/5 rutas, no vacíos, auth/roles/validación/respuestas conservados.
- [x] AC2: BDD concreto y cuatro tests RED antes de implementar, luego GREEN.
- [x] AC3: Aplicación pura strict, puertos neutrales y consumers index.ts; controllers delgados, sin nuevos N+1.
- [x] AC4: Paridad PostgreSQL para ausencias/materialización/fechas y correcciones/ownership/aprobación/historial; fallo aprobación revierte y concurrencia aplica una vez.
- [x] AC5: Backend/frontend secuenciales, SDK/docs/specs/secrets/ratchets y resultado/rollback.

## Invariantes y límites declarados

No cambios de producto, schema o dependencias. LeaveService conserva límite de
siete días, campos inmutables, protección 24h, precedencia de marcación y limpieza.
No existe validación de solapamiento de ausencias ni startDate<=endDate: conservar,
caracterizar y registrar deuda. Materialización/limpieza no son una sola transacción;
se conserva sellado por fila con consultas heredadas, sin replicarlas en aplicación.
Hallazgo: al extender ausencia se archivan jornadas sin marcación y materializeDays
no restablece isDeleted; quedan tombstones pese al permiso activo. Caracterizar
y corregir en contrato separado antes de cutover.
Correcciones conserva withDirectTransaction, claim pending condicional e idempotencia.
currentValue del schema no se traduce a originalValue; resolvedBy suministrado se
mantiene distinto del actor real. attachment no se persiste. Usuario sin vínculo
no restringe list/stats/history, quiosco no tiene scope, y ownership valida employeeId
sin cotejar pertenencia del timeRecordId: deudas explícitas, no corregidas silenciosamente.
No asegurar atomicidad de auditoría/eventos ni aislamiento de efectos externos.
Express principal, runtime/jobs/sockets/staging/cutover fuera (024/025).

## Trazabilidad

leaveCorrectionFlows.test.ts (RED/GREEN), leavesCorrections.test.ts (PostgreSQL),
fastifyApp/RouteContracts y guard de límites/strict. Dependencia: 014/015.
