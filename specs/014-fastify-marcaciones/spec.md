# Spec 014: Marcaciones en Fastify

- Estado: Implementado y validado localmente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

Nueve rutas de marcaciones aún dependen de Express; el controller mezcla permisos,
periodos cerrados, cooldown, errores de punch, auditoría y eventos. PunchService
recibe AuthRequest aunque solo necesita username. La exportación depende de Response.

## Alcance

Extraer orquestación HTTP en aplicación pura compartida por Express/Fastify. Puertos
con entradas tipadas y salidas genéricas inferidas en composición: no importar
Prisma/framework/DB/entorno/reloj en aplicación. Mantener TimeRecordService,
PunchService, integridad y scheduling como infraestructura vigente.

| Método | Ruta                             | Acceso                                                     |
| ------ | -------------------------------- | ---------------------------------------------------------- |
| POST   | /api/records/punch               | Autenticado; Usuario fuerza asociación persistida          |
| GET    | /api/records                     | Autenticado; Usuario/Kiosk_Employee limitado a su empleado |
| GET    | /api/records/export              | Autenticado; export propio para Usuario/Kiosk_Employee     |
| POST   | /api/records                     | Supervisor o superior                                      |
| POST   | /api/records/bulk                | Supervisor o superior, 10 MiB                              |
| POST   | /api/records/auto-close          | Supervisor o superior, cuerpo ignorado                     |
| GET    | /api/records/integrity/verify    | Supervisor o superior                                      |
| POST   | /api/records/:id/resolve-anomaly | Supervisor o superior                                      |
| DELETE | /api/records/:id                 | Supervisor o superior, 204                                 |

## Criterios de aceptación

- [x] AC1: Nueve rutas nativas, guard exacto no vacío, autenticación y validadores; auto-close valida cuerpo ignorado sin cambiar contrato.
- [x] AC2: Aplicación compartida y strict; PunchService recibe principal neutral, transacciones/advisory lock/integridad conservados.
- [x] AC3: Preservar scopes, periodos cerrados, cooldown de 15s, errores, metadata, sync y eventos.
- [x] AC4: Validar lote completo y comprobar todas sus fechas antes de escribir, también después de índice 50; fallos sin evento de éxito.
- [x] AC5: Exportar JSON/CSV/XML/XLSX con filtros/scopes/headers, streaming y sin casteo a Response; pools/cursors liberados.
- [x] AC6: TDD RED/GREEN, PostgreSQL aislado en ambos servidores, gates backend/frontend, docs/SDK/ratchets y resultado.

## Restricciones y límites

Constitución I–V. Express principal. Sin cambio de schema/dependencias ni lógica
contable; conservar campos extra legacy validados sin reemplazar body.
No se migra internamente todo TimeRecordService/PunchService ni notificaciones.
Auditoría de punch/export y aviso de atraso tienen efectos sin await heredados;
period lock se comprueba fuera de transacción y no se endurece en esta spec.
No corregir silenciosamente NumericString, semántica de coordenadas cero ni
permisos heredados de Kiosk_Employee/archivados en servicios internos.

## Trazabilidad

recordFlows.test.ts, records.test.ts PostgreSQL, guards, test:coverage y check:modules.
Composición services/recordFlows.ts; export StreamExportService y plataforma HTTP.
