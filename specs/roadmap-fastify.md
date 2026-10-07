# Ruta de migración modular a Fastify

Fecha: 2026-10-07. Estado: 013–025 completadas y validadas. Migración cerrada en desarrollo.

008 migró base/feriados; 009 autenticación; 010 endureció MFA/PIN;
011 cerró DTO públicos; 012 migró usuarios. Health está en el servidor Fastify principal.
No todas las specs anteriores fueron migraciones de módulos.

## Ruta de entregas

| Spec                                                   | Entrega                          | Superficie                                    |
| ------------------------------------------------------ | -------------------------------- | --------------------------------------------- |
| [013](013-fastify-empleados/spec.md)                   | Empleados                        | `/api/employees` (seis rutas, incluido Excel) |
| [014](014-fastify-marcaciones/spec.md)                 | Marcaciones                      | /api/records                                  |
| [015](015-fastify-turnos/spec.md)                      | Turnos                           | /api/shifts                                   |
| [016](016-fastify-permisos-correcciones/spec.md)       | Permisos y correcciones          | /api/leaves, /api/corrections                 |
| [017](017-fastify-reportes-turno/spec.md)              | Reportes de turno                | /api/shift-reports                            |
| [018](018-fastify-kpis/spec.md)                        | KPI                              | /api/kpis                                     |
| [019](019-fastify-correo-reportes-programados/spec.md) | Correo y reportes programados    | /api/email, /api/scheduled-reports            |
| [020](020-fastify-datos-configuracion/spec.md)         | Medidores, notas y configuración | /api/meters, /api/notes, /api/configs         |
| [021](021-fastify-importacion-exportacion/spec.md)     | Importación y exportación        | /api/import, /api/export                      |
| [022](022-fastify-auditoria/spec.md)                   | Auditoría                        | /api/audit-logs                               |
| [023](023-fastify-operaciones-admin/spec.md)           | Mantenimiento y administración   | /api/maintenance, /api/admin                  |
| [024](024-fastify-runtime-integrado/spec.md)           | Runtime integrado                | Socket.IO, jobs, OpenAPI y arranque           |
| [025](025-fastify-cutover/spec.md)                     | Cambio de servidor principal     | Gateway, staging y retirada de Express        |

013 cubre empleados. 014–023 cubren los otros 16 routers de negocio/operación,
agrupados en diez entregas. 024 y 025 completan integración y cambio principal:
la ruta comprende trece specs incluyendo 013, todas completadas. No quedan
entregas de migración pendientes.

## Condición de avance

Cada entrega concreta PRD (spec), SDD (plan), BDD (behavior), TDD (tests RED/GREEN)
y resultado verificable. Los resultados de cada entrega documentan sus contratos y comprobaciones.
Mantener puertos por módulo aunque varios se entreguen en una misma spec.

Los gates locales no sustituyen staging: 025 exige gateway, PgBouncer, e2e,
sockets/jobs y medición de carga con escenarios equivalentes. Fastify por sí
solo no demuestra mayor rendimiento. No fijar una mejora porcentual sin medir.

## Backlog posterior al cutover (no bloqueante en desarrollo)

Decisión del usuario: estas deudas no añaden pasos/specs de migración. Fastify
es principal tras cerrar 025; purgar/reiniciar está autorizado en desarrollo.
Ver [backlog 025](025-fastify-cutover/backlog.md).

### Hallazgos conservados

La paginación numericString admite NaN/valores no positivos; el delta de usuarios
usa createdAt. Empleados tiene campos de servicio ausentes del schema HTTP,
PIN en auditoría de actualización, efectos previos al commit al asegurar usuario
y sincronización de estado no atómica. Cada corrección debe declarar su cambio
de contrato y pruebas, sin introducirse silenciosamente en la paridad.

La tanda 014/015 añade 27 rutas: nueve de marcaciones y dieciocho de turnos.
Resultados: [014](014-fastify-marcaciones/result.md) y [015](015-fastify-turnos/result.md).
016 añade ocho rutas de permisos/correcciones: [resultado](016-fastify-permisos-correcciones/result.md).
017 añade tres rutas de reportes de turno: [resultado](017-fastify-reportes-turno/result.md).
018 añade cuatro rutas KPI: [resultado](018-fastify-kpis/result.md).
019 añade doce rutas de correo/reportes programados: [resultado](019-fastify-correo-reportes-programados/result.md).
020 añade catorce rutas de medidores/notas/configs: [resultado](020-fastify-datos-configuracion/result.md).
021 añade cinco rutas import/export, límite export y pruebas PDF/XLSX reales:
[resultado](021-fastify-importacion-exportacion/result.md).
022 añade seis rutas de auditoría: [resultado](022-fastify-auditoria/result.md).
023 añade 21 rutas admin/maintenance: [resultado](023-fastify-operaciones-admin/result.md).

Las deudas de fechas, scopes y consistencia de negocio documentadas en 015–023
se conservan en el backlog posterior. No son prerrequisitos de esta migración.
024 integró runtime, jobs, sockets y cierre. Las tandas de seguridad de 025
resolvieron autenticación/autorización de sockets, secretos HTTP/auditoría y
resets transaccionales antes del cambio de entrypoint.

025 cierra el cambio: Fastify por defecto, imagen sin Express, 124 rutas
inventariadas, gateway/PgBouncer, UI, purga/reinicio y rollback local comprobados.
Validación completa y límites de medición: [resultado 025](025-fastify-cutover/result.md).
