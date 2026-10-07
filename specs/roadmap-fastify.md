# Ruta de migración modular a Fastify

Fecha: 2026-10-07. Estado: 013–024 validadas y 025 en ejecución (seguridad antes del cutover).

008 migró base/feriados; 009 autenticación; 010 endureció MFA/PIN;
011 cerró DTO públicos; 012 migró usuarios. Health está en el candidato.
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
la ruta comprende trece specs incluyendo 013; queda una tras la spec 024. El orden es propuesto y podrá
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
Siguiente entrega: 025 (seguridad y deudas previas al cambio de servidor principal).
Antes de 025 resolver el desfase UTC/Chile y consultas por día del calendario mensual,
y el scope de assignments sin vínculo/para quiosco, registrados en 015.

Antes de 025 resolver también reactivación/consistencia de jornadas al extender
permisos y ownership employeeId/timeRecordId en correcciones, más scopes sin
vínculo/para quiosco, registrados en 016. La paridad no elimina defectos legacy.

017 caracteriza id ausente, abierto eliminado que bloquea, auditoría no atómica
y contenido legacy corrupto en Excel. Revisar exclusividad del turno abierto y
contratos de errores antes de 025; folio numérico único no garantiza un solo open.

018 caracteriza caché cerrada sin invalidación, fechas validadas solo por formato,
contexto diario UTC/ayer y filtros legacy. Excluye PIN de respuestas KPI; antes de
025 resolver las deudas del motor con contrato explícito y pruebas.

019 caracteriza divergencias schema/servicio SMTP, reglas y reportes, defaults no
asignados al body, cron parcial/zona local y toggle sin atomicidad concurrente.
Coordinar contrato, frontend y SDK antes de 025; paridad no corrige estas deudas.

020 conserva lote de medidores no atómico, rango UTC/local, autores del cliente
y hard delete de notas; config genérico/auditoría sensible, cierre futuro 500 y
policy solo validada por MIME. Resolver contrato/consistencia antes de 025.

021 conserva mapping sin schema estructural, preview ZIP en memoria, fechas
regex, dos schemas de modos, scope quiosco/Usuario Excel y descarga parcial
si falla KPI después de iniciar ZIP. Resolver antes de 025 según alcance de producto.

022 caracteriza campos de salida exigidos por POST manual e ignorados, éxito sin
persistencia, fechas del host/paginación sin cotas, snapshot local, actor SYSTEM
de verificación y CSV/XML parcial tras fallo de cursor. Resolver según contrato
de producto antes de 025; ALS/direct transaction sí se verifica concurrentemente.

023 corrige compresión de maintenance usando originalUrl en Express y opción de
ruta compress=false en Fastify. Caracteriza reset CASCADE que borra users pese a
preservedUser, admin con contraseña fija y jobs retenidos, watchdog sin cancelación
y estado local; coordinar operaciones/jobs y redacción de secretos antes de 025.

024 unifica runner, scheduler, sockets y cierre de recursos. Mantiene Express como
principal; override opt-in para ensayos Fastify. PgBouncer usa AUTH_TYPE SCRAM
explícito tras fallo reproducido; no desplegar compose de producción desde esta
entrega. Socket sin auth/salas por query y broadcasts globales deben resolverse
antes de 025. Ver [resultado 024](024-fastify-runtime-integrado/result.md).

025-A cierra acceso anónimo y salas elegidas por cliente; revalida sesiones por
lote antes de entregar y sincroniza login/logout frontend. La 025 sigue abierta:
autorización de broadcasts por rol/empleado y deudas anteriores bloquean el cutover.
Ver [spec 025](025-fastify-cutover/spec.md).
