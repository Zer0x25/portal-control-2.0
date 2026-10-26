# Plan 058: medir fases de sincronización inicial

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Cómo se implementa en 3-6 pasos. Sin código, solo decisiones técnicas.

1. Extender el `addInitScript` existente para observar cambios del texto de paso y porcentaje, guardando offsets desde navegación.
2. En Playwright, registrar por request API método, path, estado y timestamps; quitar query strings y omitir bodies.
3. En cada contexto, conservar los checks de `lastSyncTime`, cobertura/hit-test, spinners y progreso; adjuntar el JSON con tres muestras.
4. Ejecutar el probe en staging y resumir los intervalos por paso/request, destacando solapamientos y límites de atribución.
5. Validar tipo, lint, formato y gobernanza; no tocar archivos de runtime.

## Archivos a tocar

| Archivo                                                | Cambio                                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `frontend/e2e/performance.spec.ts`                     | Registrar timeline de pasos y requests API en el probe frío de overlay.     |
| `specs/058-sync-initial-phase-diagnostics/evidencia/*` | Guardar tres muestras crudas y el análisis resumido.                        |
| `.jules/bolt.md`                                       | Anotar los tiempos observados y el siguiente cuello de botella con límites. |

## Contratos afectados

Ninguno. El cambio se limita al test E2E y a la evidencia; no modifica rutas, esquemas, SDK, migraciones ni datos.

## Riesgos y rollback

El probe podría confundir requests previos de bootstrap o trabajo simultáneo con el paso que espera `runSync`. Registrar solo eventos del navegador, analizar los intervalos y no atribuir causalidad por solapamiento. Rollback: quitar el campo temporal del test y conservar la evidencia de Spec 057.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run lint
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
PERFORMANCE_RESULTS_DIR=../specs/058-sync-initial-phase-diagnostics/evidencia fnm exec --using=26.10.0 -- npm --prefix frontend run e2e:staging -- --project=perf --no-deps --grep 'Time Control initial sync records phase timings and remains blocking'
```
