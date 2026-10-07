# Spec 022: Auditoría

- Estado: Implementada y validada localmente
- Fecha: 2026-10-07
- Dependencia: [021](../021-fastify-importacion-exportacion/result.md)

## PRD

Completar la superficie de auditoría del candidato Fastify con casos de uso
compartidos con Express, permisos verificables y aplicación independiente de BD
y transporte. Express permanece principal. No se ejecutan operaciones externas.

## SDD: contrato e inventario

| Método y ruta                        | Permiso                                 | Validación vigente                        | Resultado y efectos                                                                    |
| ------------------------------------ | --------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| GET /api/audit-logs                  | Admin, Supervisor Elevado, Fiscalizador | AuditLogQuerySchema, sin reemplazar query | 200 success/data con items, total, page, totalPages, nextCursor                        |
| POST /api/audit-logs                 | Cualquier sesión                        | AuditLogSchema, sin reemplazar body       | 201 mensaje; actor de sesión e IP; persistencia y socket                               |
| GET /api/audit-logs/export           | Lectores de auditoría                   | Sin schema adicional                      | JSON crudo por defecto/format desconocido; CSV/XML mediante cursor SQL parametrizado   |
| GET /api/audit-logs/integrity-status | Lectores de auditoría                   | Sin entrada adicional                     | 200 snapshot local del proceso                                                         |
| GET /api/audit-logs/verify-integrity | Admin, Supervisor Elevado               | Sin entrada adicional                     | 200 tras verificación; transacción directa, logs y snapshot                            |
| POST /api/audit-logs/cleanup         | Admin, Supervisor Elevado               | AuditLogCleanupSchema                     | months entero 1–120, default 6; DELETE anterior al corte; 200 count/cutoffDate/mensaje |

Sesión ausente 401; rol insuficiente 403; schema inválido 400. No añadir
restricciones de producto durante la extracción. Aplicación inyecta repositorio,
verificación, snapshot y exportadores; no importa frameworks, SQL, Prisma, entorno
ni reloj global. API pública modules/audit/index.ts; strict y guard no vacío.
ALS se conserva por petición, incluida la variable audit.username sobre conexión
directa. Streaming emplea Writable y no casts a Express.Response. Errores de
exportación antes de bytes: AUDIT_EXPORT_ERROR 500; tras bytes se cierra el stream.
El exportador genérico puede producir su propio 500 message-only antes de fallar.

## Deudas preservadas

AuditLogSchema exige campos de salida id/timestamp/actorUsername que el POST ignora;
metadata/IP del cliente también se ignoran. severity/outcome son strings libres.
AuditService.log absorbe fallos, por lo que POST puede devolver 201 sin persistir.
Consulta transforma números solo para validar y no sustituye query; since se ignora,
fechas no se validan y paginación no tiene cotas. endDate usa zona local del host.
JSON export limita a 10.000; CSV/XML no tienen esa cota, no respetan backpressure y
no neutralizan fórmulas CSV. Export no tiene schema y usa filtros legacy.
Snapshot es local del proceso; verificación limita aproximadamente 20.000 en lotes
5.000 y registra actor SYSTEM, aunque el contexto transaccional sí pertenece al
usuario. No certificar cobertura criptográfica global ni rendimiento medido.

## Criterios de aceptación

- [x] AC1: Inventario de seis rutas, permisos, efectos y errores explícitos.
- [x] AC2: BDD y cuatro pruebas RED previas a implementación.
- [x] AC3: Aplicación pura, puertos tipados, API pública y strict.
- [x] AC4: Paridad HTTP/BD aislada, seguridad, fallos y contexto concurrente.
- [x] AC5: Gates backend/frontend secuenciales, ratchets, docs y rollback.

## Trazabilidad

[Plan](plan.md), [BDD](behavior.md), [tareas](tasks.md), [resultado](result.md).
