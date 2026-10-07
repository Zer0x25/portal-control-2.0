# ADR-0003: Contrato API con Express 5 + Zod + OpenAPI y guards

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: retroactivo desde código

Actualización 2026-10-07: Express está retirado. Las decisiones históricas de
contrato/seguridad se aplican ahora en Fastify; el manifiesto nativo y sus pruebas
reemplazan la introspección y middleware descritos abajo. OpenAPI se genera desde
`backend/src/platform/openapi/operations.ts`. Ver
[retiro de Express](../../specs/025-fastify-cutover/express-retirement.md).

## Contexto

Los guards de introspección pasaban vacuamente: Express 5 eliminó
`layer.regexp` y deja `layer.path` indefinido en routers montados, la
lista de rutas siempre quedaba vacía (`AGENTS.md:233-264`). Además los
bloques `@openapi` documentaban `/api/emails`, `/api/exports` mientras
los routers montan `/api/email`, `/api/export`, rompiendo el contrato.

## Decisión

1. Declarar montajes en `ROUTE_MOUNTS` (`src/app.ts`), no redescubrir
   `app._router`. `/api/health` se monta separado (bypass rate-limit
   y maintenance) pero sigue listado.
2. Detectar `validate` por marcador `isValidateMiddleware()`
   (`src/middleware/validate.ts`), no por `fn.name`.
3. Todo guard que enumera colecciones lleva aserción anti-vacuidad.
4. `npm run check:sdk` regenera `backend/docs/swagger.json` y
   `frontend/src/types/api-schema.ts` y falla si hay diff. Corre en
   `validate:ci`.
5. Ratchet de validación: `ALLOWED_UNVALIDATED_ROUTES` en
   `tests/architecture-guard.test.ts` es 0; añadir ruta mutante sin
   validar falla hasta justificarla inline.

## Alternativas consideradas

1. Confiar en revisión manual del contrato — descartada porque ya
   derivó en singular/plural y guards vacuos.
2. SDK manual en frontend — descartada porque diverge del backend.

## Consecuencias

Positivas:

- Contrato roto = CI rojo, no incidente en producción.
- Rutas no validadas requieren justificación explícita.

Negativas / costos aceptados:

- Tocar `ROUTE_MOUNTS` y `@openapi` juntos en cada ruta nueva.
- Falsos positivos del snapshot swagger ante cambios cosméticos.

## Referencias

- `AGENTS.md:233-264` — reglas de guards y contrato.
- `backend/src/app.ts` — `ROUTE_MOUNTS`.
- `backend/src/middleware/validate.ts` — `isValidateMiddleware`.
- `backend/tests/helpers/routeManifest.ts` — manifiesto.
- `backend/tests/architecture-guard.test.ts` — ratchet.
