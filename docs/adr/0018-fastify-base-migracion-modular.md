# ADR-0018: Migración modular a Fastify con base compartida

- Estado: Propuesto
- Fecha: 2026-10-06
- Autores: equipo y Codex

## Contexto

La app aún no está en producción. El equipo autorizó migrar el backend por
módulos hacia Fastify y empezar por base HTTP, seguridad real y feriados completos.
El piloto GET de ADR-0017 aislaba auth con dobles y no conectaba un servidor.

## Decisión

Construir un candidato Fastify ejecutable y mantener Express como principal
hasta cubrir el resto de módulos; hacer el cambio definitivo al completar gates.
Compartir el caso de uso de autenticación entre transportes: JWT validado,
sesiones activas y rol persistido. Crear contexto AsyncLocalStorage por petición.
Conservar Prisma extendido y `withDirectTransaction` para actor SQL y auditoría.

Extraer comandos de feriados y proveedor externo, además de consulta. Inyectar
repositorio, eventos, auditoría, identificador y reloj. Aplicar strict a módulos
y plataforma HTTP. Validar Zod y serializar respuestas con schemas Fastify.
Health queda fuera de límites/mantenimiento. Guards sobre onRoute exigen cinco
rutas de feriados, seis de auth, cuatro de usuarios, seis de empleados, nueve de
marcaciones, dieciocho de turnos, tres de ausencias, cinco de correcciones
y tres de reportes de turno, seguridad declarada y validadores registrados;
pruebas ejercitan auth real. Logout y setup ignoran el cuerpo por contrato.

Base HTTP y contexto/actor en `backend/src/platform/fastify/app.ts`;
arranque/composición en `backend/src/fastify/`.
Comandos en `backend/src/modules/holidays/application/commands.ts:35`;
transacción/pools en `backend/src/services/db.ts`. Tests de integración verifican
el actor SQL usando un trigger temporal en una BD desechable.

## Alternativas

Una reescritura completa en un cambio amplía la revisión a todos los módulos.
Mantener dos frameworks permanentemente duplica la plataforma. La coexistencia
actual es temporal para completar módulos y comprobar contratos antes del cambio.
No crear microservicios ni cambiar React/Vite/PostgreSQL en esta entrega.

## Consecuencias

Cada módulo tiene un contrato y pruebas locales; agentes requieren menos
contexto global. Hay más archivos, pero las reglas no importan framework o DB.
Auth/error mapper compartidos también requieren verificar Express existente.
El rendimiento se compara con consultas reales; no se garantiza una mejora por
el nombre del framework. Spec 009 completa las seis rutas HTTP de auth con
orquestación compartida y throttle independiente de Express. Las siguientes
entregas migran módulos restantes, sockets/jobs, OpenAPI y validación staging
con PgBouncer.

Spec 012 migra CRUD de usuarios, con flujos puros y fachada UserService compartida.
Spec 013 migra seis rutas de empleados con list/create/update/bulk compartidos,
proyección explícita sin PIN y exportación Excel por stream tipado. Conserva
ensureEmployeeUser y su transacción directa; pruebas provocan fallo tras crear
cuenta para demostrar rollback de ambas filas. Los efectos externos de ensure
siguen sin ser transaccionales. La ruta 013–025 cubre restantes módulos y cierre.
Pruebas comparan ambos transportes contra PostgreSQL real.

Specs 014/015 añaden orquestación de marcaciones y turnos con puertos neutrales.
Pruebas comparan 27 rutas nuevas, cursores de exportación, punch concurrente y
rollback mensual, además del recorrido empleado→patrón→asignación→marcación.
Matriz sin vínculo de Usuario/quiosco devuelve 403 como cambio declarado. El
calendario mensual mantiene un defecto UTC/Chile y queries por día existentes;
assignments conserva scope legacy sin vínculo/para quiosco. Resolver esas deudas
con contratos y pruebas antes de cutover. No se promete mejora de rendimiento.

Spec 016 migra ocho rutas de permisos/correcciones con flujos puros y preserva
claim pending/aprobación transaccional. Pruebas concurrentes verifican un ganador;
fallo de persistencia revierte la solicitud. Conserva diferencias de roles:
Reloj_Control gestiona ausencias pero no resuelve correcciones. Materialización
no atómica/reactivación defectuosa y ownership/scopes incompletos son deudas
explícitas antes de cutover; la migración no endurece reglas silenciosamente.

Spec 017 añade list/save/export de reportes de turno y orquestación compartida,
con folio numérico/retry y conflicto 409 existentes. Streaming usa puerto Writable
neutral y headers nativos hasta primer byte. Pruebas abren XLSX y caracterizan
auditoría previa a write/soft-delete abierto/ID ausente/contenido corrupto;
la exclusividad de turnos open bajo concurrencia requiere corrección separada.

Spec 018 añade cuatro rutas KPI, rango compartido y puertos de fechas/motor.
Cambio de seguridad declarado: overview y detalles de ausencias usan proyección
pública de empleados sin PIN. Se conserva caché y cálculo legacy; invalidación,
contexto diario UTC y consultas por cache miss requieren trabajo antes de cutover.

## Referencias

- [Resultado 018](../../specs/018-fastify-kpis/result.md)
- [Resultado 017](../../specs/017-fastify-reportes-turno/result.md)
- [Resultado 016](../../specs/016-fastify-permisos-correcciones/result.md)
- [Resultado 014](../../specs/014-fastify-marcaciones/result.md)
- [Resultado 015](../../specs/015-fastify-turnos/result.md)
- [Ruta 013–025](../../specs/roadmap-fastify.md)
- [Spec 013](../../specs/013-fastify-empleados/spec.md)

- [Spec 012](../../specs/012-fastify-usuarios/spec.md)

- [Spec 009](../../specs/009-fastify-autenticacion/spec.md)
- [Resultado auth](../../specs/009-fastify-autenticacion/result.md)
- [Spec 008](../../specs/008-fastify-base-feriados/spec.md)
- [Resultado](../../specs/008-fastify-base-feriados/result.md)
- [ADR-0017](0017-modulos-estrictos-node26-fastify-piloto.md)
- [Factory Fastify](https://fastify.dev/docs/latest/Reference/Server/)
- [Hooks Fastify](https://fastify.dev/docs/latest/Reference/Hooks/)
