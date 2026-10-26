# Plan 043: Deduplicación de la consulta de salud en Dashboard

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir regresiones para salud fresca/en vuelo, error fail-safe y mismatch de instancia antes de alterar la sincronización.
2. Extraer desde `useHealthQuery` la función y opciones compartidas de la query canónica; incluir `instanceId` como dato opcional del payload completo.
3. Cambiar `validateInstanceId()` para usar `queryClient.fetchQuery` con la misma key y función pero `staleTime: 0`; así una lectura en vuelo se comparte y los datos cacheados por sí solos no omiten la validación. Capturar fallos y mantener el retorno fail-safe actual.
4. Endurecer el gate de staging para exigir cero endpoints repetidos y un máximo de una lectura de `/api/health`; guardar marcadores visibles y status, duración y offsets de cada request.
5. Reconstruir el frontend de staging, correr tres muestras secuenciales y registrar requests, waterfall, hash de fuente e imagen; no inferir cambios de LCP/FCP de la sola reducción de una solicitud API.
6. Ejecutar tests focalizados, checks frontend, preflight y validadores de specs/docs.

## Archivos a tocar

| Archivo                                                     | Cambio                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `frontend/src/hooks/queries/useHealthQuery.ts`              | Exponer opciones y lectura de datos compartidas, conservando la query y el intervalo visual actual. |
| `frontend/src/store/slices/syncSlice.ts`                    | Obtener salud e `instanceId` desde la query canónica; preservar el fallback y mismatch.             |
| `frontend/src/tests/state/syncSlice.test.ts`                | Cubrir reutilización de datos de salud, fallo fail-safe y limpieza/refresco por mismatch.           |
| `frontend/e2e/performance.spec.ts`                          | Afirmar que Dashboard no inicia endpoints API repetidos y registrar marcadores visibles/waterfall.  |
| `specs/043-dashboard-health-query-deduplication/evidencia/` | Guardar tres capturas, comparación por conteo/tiempo y resultado de staging.                        |
| `.jules/bolt.md`                                            | Registrar resultado y decidir el cuello siguiente con evidencia.                                    |

## Contratos afectados

Sin cambios: rutas HTTP, schemas Fastify, OpenAPI, SDK, Prisma y migraciones.

## Riesgos y rollback

Una query compartida con tipo parcial podría romper consumidores del panel de salud; se comparte el payload completo actual y solo se agrega el campo opcional `instanceId`. Reutilizar un resultado cacheado podría ocultar un cambio de instancia; por eso la validación fuerza freshness cero y solo comparte una solicitud aún en vuelo. Un error de la query no debe bloquear la sincronización de sesión; `validateInstanceId()` conserva su retorno fail-safe. Un mismatch todavía borra la caché local y fuerza el refresco. Revertir los archivos de implementación devuelve el comportamiento anterior.

## Verificación

- `fnm exec --using 26.10.0 -- npm run test:run -- src/tests/state/syncSlice.test.ts hooks/queries/useHealthQuery.spec.ts` (desde `frontend/`).
- `npm run check`, `npm run lint`, `npm run format:check`, `npm run build` y `npm run check:bundle-budget` (desde `frontend/`).
- Rebuild staging: `docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend`.
- Gate + perfil de requests: `fnm exec --using 26.10.0 -- npm run e2e:staging -- --project=perf --no-deps --grep=startup --repeat-each=3 --workers=1` (desde `frontend/`).
- `fnm exec --using 26.10.0 -- npm run secrets:scan`, `npm run spec:check`, `npm run docs:check`, `npm run lint:budget` y el preflight local.
