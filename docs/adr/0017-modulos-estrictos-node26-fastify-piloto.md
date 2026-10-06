# ADR-0017: Módulos estrictos, Node 26 y piloto Fastify

- Estado: Propuesto
- Fecha: 2026-10-06
- Autores: equipo y Codex

## Contexto

El equipo autorizó modernización incremental conservando React + Vite,
PostgreSQL y Prisma 7. Eligió Node 26. La consulta de feriados permite evaluar
aislamiento del negocio y transporte HTTP con una baseline de comportamiento.

## Decisión

- Node 26 en `.nvmrc`, engines, CI y Dockerfiles.
- Extraer consulta a `backend/src/modules/holidays/application/getHolidays.ts`.
- Tipos y dependencias propias; persistencia en adaptador inyectado que recibe
  el cliente extendido existente. Autosync de escrituras sigue en fachada.
- `tsconfig.holidays.json` aplica strict al módulo y `check` lo ejecuta.
- Tests AST impiden imports privados y efectos globales en aplicación.
- Fastify 5 aporta un plugin GET experimental, no montado en producción.
  Seguridad y errores son dependencias obligatorias de su composición.
- Express conserva middleware, montajes, OpenAPI y SDK existentes.

## Alternativas

Activar strict en todo el legado requeriría un alcance mayor. Migrar Express
completo antes de comparar añade auth, sesiones, auditoría, sockets y middleware
al mismo cambio. El piloto permite evaluar esa decisión con evidencia acotada.

## Consecuencias

La consulta es testeable sin red/BD/reloj global. La separación agrega archivos
y contratos; ese coste se evalúa antes de extender el patrón. El piloto prueba
compatibilidad de casos seleccionados, no seguridad o rendimiento productivos.

## Referencias

- [Spec 006](../../specs/006-arquitectura-mantenible/spec.md)
- [Spec 007](../../specs/007-stack-node26-fastify/spec.md)
- [Resultado y comparación](../../specs/006-arquitectura-mantenible/result.md)
- [Fastify: testing](https://fastify.dev/docs/latest/Guides/Testing/)
