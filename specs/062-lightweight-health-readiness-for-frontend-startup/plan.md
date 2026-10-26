# Plan 062: Lightweight Health Readiness for Frontend Startup

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Mantener en la ruta el probe `SELECT 1` y mapear solo ese fallo a 503; añadir un servicio de respuesta ligera que tome el estado de respaldos y exponga `BOOT_INSTANCE_ID`, sin consultas diagnósticas.
2. Declarar y documentar el schema de la respuesta readiness, regenerar Swagger y SDK, y conservar el payload detallado de `/api/health`.
3. Añadir una query key sensible separada para readiness y compartir sus opciones entre header/indicadores; migrar la validación de instancia sin cambiar el fail-safe ni el vaciado de cache.
4. Ejecutar tests dirigidos y preflight, reconstruir frontend staging, medir tres contextos fríos y registrar request count, bytes y fases.

## Archivos a tocar

| Archivo                                                                                                                                             | Cambio                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `backend/src/services/HealthService.ts`                                                                                                             | Exponer estado de readiness, respaldo e instancia sin métricas completas ni query de tamaño. |
| `backend/src/platform/fastify/app.ts`                                                                                                               | Servir la respuesta tipada y mapear fallos de BD a 503 `NOT_READY`.                          |
| `backend/src/platform/openapi/operations.ts`                                                                                                        | Documentar cuerpo 200 y fallo 503 de `/api/health/ready`.                                    |
| `backend/src/models/schemas/core.schemas.ts`                                                                                                        | Definir schema reusable del cuerpo ligero.                                                   |
| `backend/tests/unit/fastifyApp.test.ts`, `backend/tests/unit/healthService.test.ts`, `backend/tests/fastify-integration/holidays.test.ts`           | Verificar contrato, estados, fallo de BD y probe real.                                       |
| `backend/tests/__snapshots__/api-contract.test.ts.snap`, `backend/tests/__snapshots__/swagger.snapshot.generated.test.ts.snap`                      | Actualizar snapshots de contrato tras el cambio OpenAPI.                                     |
| `backend/docs/swagger.json`, `frontend/src/types/api-schema.ts`                                                                                     | Regenerar contrato y SDK.                                                                    |
| `frontend/src/lib/queryKeys.ts`                                                                                                                     | Separar readiness del query key de salud detallada bajo raíz sensible `system`.              |
| `frontend/src/hooks/queries/useHealthQuery.ts`, `frontend/src/hooks/useSystemStatus.ts`, `frontend/src/components/ui/SimpleConnectionIndicator.tsx` | Compartir readiness en los consumidores ligeros y preservar health detallado.                |
| `frontend/src/store/slices/syncSlice.ts`, `frontend/src/tests/state/syncSlice.test.ts`                                                              | Validar instancia con respuesta readiness fresca.                                            |
| `frontend/src/tests/hooks/useHealthReadinessQuery.test.ts`                                                                                          | Cubrir llamada tipada, query key y mapeo de estado ligero.                                   |
| `specs/062-lightweight-health-readiness-for-frontend-startup/evidencia/*`, `.jules/bolt.md`                                                         | Registrar medición, límites y siguiente oportunidad.                                         |

## Contratos afectados

`GET /api/health/ready` agrega `healthStatus` (`healthy | degraded`) e `instanceId` al `status: "ready"` existente; conserva HTTP 503 ante BD no disponible. Se regeneran `backend/docs/swagger.json` y `frontend/src/types/api-schema.ts`. No hay migración de base de datos.

## Riesgos y rollback

El riesgo es que el estado ligero diverja del detallado. Ambos usan el mismo criterio de salud de respaldo; tests cubren estado degradado y saludable. La prueba de BD debe seguir mapeándose a 503. La UI deja de recibir información detallada solo en los consumidores que actualmente muestran estado binario/degradado; el dashboard sigue en `/api/health`. Rollback: revertir adopción frontend y el nuevo cuerpo en readiness, manteniendo el estado previo `{ status: "ready" }`.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix backend run test:unit -- tests/unit/fastifyApp.test.ts
fnm exec --using=26.10.0 -- npm --prefix backend run test:schemas-refactor
fnm exec --using=26.10.0 -- npm --prefix backend run test:api:integration -- tests/fastify-integration/holidays.test.ts
fnm exec --using=26.10.0 -- npm --prefix backend run check:sdk
fnm exec --using=26.10.0 -- npm --prefix backend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run test:jsdom -- src/tests/state/syncSlice.test.ts
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run lint
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend
PERFORMANCE_RESULTS_DIR=../specs/062-lightweight-health-readiness-for-frontend-startup/evidencia fnm exec --using=26.10.0 -- npm --prefix frontend run e2e:staging -- --project=perf --no-deps --grep 'Time Control initial sync records phase timings and remains blocking'
```
