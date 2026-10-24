# Plan 061: Skip Empty Cache Check Without Sync Marker

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Agregar primero pruebas que demuestren que un inicio sin marca no consulta IndexedDB y que una marca previa sigue leyendo empleados y usuarios.
2. Condicionar el chequeo existente a que haya una marca `since`, manteniendo `Promise.all` y la rama actual para caché vacía.
3. Cambiar el probe para exigir que una sesión fría omita `cache-check` y mantenga validación, las cinco acciones y el overlay bloqueante.
4. Reconstruir frontend staging, repetir tres contextos fríos y comparar mediana/rango del overlay con Spec 060.
5. Guardar resultados y ejecutar las validaciones de integridad y preflight.

## Archivos a tocar

| Archivo                                                            | Cambio                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `frontend/src/store/slices/syncSlice.ts`                           | Omitir lectura de stores cuando `since` es nulo.               |
| `frontend/src/tests/state/syncSlice.test.ts`                       | Probar omisión sin marca y persistencia del chequeo con marca. |
| `frontend/e2e/performance.spec.ts`                                 | Afirmar secuencia de fases sin `cache-check` en arranque frío. |
| `specs/061-skip-empty-cache-check-without-sync-marker/evidencia/*` | Registrar muestras y comparación con Spec 060.                 |
| `.jules/bolt.md`                                                   | Añadir resultado y elegir el siguiente paso según evidencia.   |

## Contratos afectados

Ninguno. No hay cambios de endpoints, OpenAPI, SDK, esquema o migraciones.

## Riesgos y rollback

El riesgo es saltar el chequeo en un caso donde aún podría afectar una decisión. La condición usa el mismo `since` que protege `if (isCacheEmpty && since)`, y las pruebas cubren la lectura cuando la marca está presente. El rollback es reponer la lectura incondicional antes de evaluar la rama de caché vacía.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run test:jsdom -- src/tests/state/syncSlice.test.ts
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run lint
fnm exec --using=26.10.0 -- npx prettier --check frontend/src/store/slices/syncSlice.ts frontend/src/tests/state/syncSlice.test.ts frontend/e2e/performance.spec.ts specs/061-skip-empty-cache-check-without-sync-marker
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend
PERFORMANCE_RESULTS_DIR=../specs/061-skip-empty-cache-check-without-sync-marker/evidencia fnm exec --using=26.10.0 -- npm --prefix frontend run e2e:staging -- --project=perf --no-deps --grep 'Time Control initial sync records phase timings and remains blocking'
```
