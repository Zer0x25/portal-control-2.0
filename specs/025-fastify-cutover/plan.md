# Plan 025: Cutover en desarrollo

Spec: [spec.md](spec.md). Constitución: [constitución](../constitution.md).

## Implementación

1. src/index.ts carga fastify/main: mismo comando para dev, start y contenedores.
2. src/express-main.ts queda como referencia local opt-in con dev:express.
3. Express y middleware asociados pasan a devDependencies; Docker instala dependencias runtime en una etapa separada. Prisma CLI queda runtime para migraciones/seed; Swagger UI assets
   tienen dependencia directa swagger-ui-dist. No cambiar versiones instaladas.
4. UploadError neutral sustituye Multer en rutas Fastify y error mapper; conservar
   413/400 y compatibilidad con errores del fixture Express.
5. Mantener módulos, puertos, SDK, sockets/jobs y seguridad ya implementada.

## Verificación

Inventario real [routes.json](routes.json), guard no vacío/contratos por módulo y
RED/GREEN tests/unit/cutover.test.ts. validate:ci/coverage backend y PostgreSQL
18.4 aislado. Luego frontend validate:ci:coverage, sin solapar generación SDK.
Staging con proyecto/volúmenes/env-file propios: imagen sin Express, migraciones
y seed por DIRECT_URL, HTTP por PgBouncer/gateway, e2e UI y sockets. Comprobar
SIGTERM/reinicio y rollback local. Benchmark acotado existente con escenario
equivalente; no convertir una medida de ruta en promesa general de rendimiento.

## Rollback

Desarrollo: npm run dev:express conserva servidor anterior en el mismo puerto;
purgar sesiones/reiniciar está autorizado. Imagen final no instala Express. Para
rollback de contenedor usar imagen/checkout previo al cutover (113c66a), no intentar
arrancar fixture Express en una imagen sin dependencias dev. No cambia esquema DB.
El ensayo actual usa BD desechable; no tocar la BD local preexistente.

## Mejoras fuera del cierre

[Backlog](backlog.md) registra consistencia/ownership/fechas heredados y drenaje
universal. Se podrán resolver después de usar Fastify; no ampliar de nuevo el
criterio de finalización de esta migración en desarrollo.
