# Ruta de migración modular a Fastify

Fecha: 2026-10-06. Estado: 013 implementada y validada localmente; 014–025 son borradores.

008 migró base/feriados; 009 autenticación; 010 endureció MFA/PIN;
011 cerró DTO públicos; 012 migró usuarios. Health está en el candidato.
No todas las specs anteriores fueron migraciones de módulos.

## Entregas pendientes

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
la ruta comprende trece specs incluyendo 013; quedan doce tras esta entrega. El orden es propuesto y podrá
ajustarse por las dependencias que revele cada inventario.

## Condición de avance

Cada entrega concreta PRD (spec), SDD (plan), BDD (behavior), TDD (tests RED/GREEN)
y resultado verificable. Los borradores siguientes requieren detallar contratos
antes de implementar; no están marcados como terminados ni aprobados.
Mantener puertos por módulo aunque varios se entreguen en una misma spec.

Los gates locales no sustituyen staging: 025 exige gateway, PgBouncer, e2e,
sockets/jobs y medición de carga con escenarios equivalentes. Fastify por sí
solo no demuestra mayor rendimiento. No fijar una mejora porcentual sin medir.

## Hallazgos que necesitan decisión explícita

La paginación numericString admite NaN/valores no positivos; el delta de usuarios
usa createdAt. Empleados tiene campos de servicio ausentes del schema HTTP,
PIN en auditoría de actualización, efectos previos al commit al asegurar usuario
y sincronización de estado no atómica. Cada corrección debe declarar su cambio
de contrato y pruebas, sin introducirse silenciosamente en la paridad.
