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
rutas, auth declarada y validadores registrados; pruebas ejercitan auth real.

Base HTTP en `backend/src/platform/fastify/app.ts:57` y contexto/actor en sus
hooks (líneas 91 y 179); arranque/composición en `backend/src/fastify/`.
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
el nombre del framework. Las siguientes entregas migran rutas de auth, módulos
restantes, sockets/jobs, OpenAPI y validación staging con PgBouncer.

## Referencias

- [Spec 008](../../specs/008-fastify-base-feriados/spec.md)
- [Resultado](../../specs/008-fastify-base-feriados/result.md)
- [ADR-0017](0017-modulos-estrictos-node26-fastify-piloto.md)
- [Factory Fastify](https://fastify.dev/docs/latest/Reference/Server/)
- [Hooks Fastify](https://fastify.dev/docs/latest/Reference/Hooks/)
