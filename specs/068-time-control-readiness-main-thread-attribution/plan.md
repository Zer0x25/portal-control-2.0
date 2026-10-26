# Plan 068: Atribución del hilo principal durante readiness

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Añadir al auditor del E2E un observer LoAF opt-in, con detección previa de
   `long-animation-frame` en `PerformanceObserver.supportedEntryTypes`.
2. Capturar por frame duración, blocking duration y scripts; transformar cada
   `sourceURL` inmediatamente a pathname, eliminando origen, query y fragmento.
3. Seleccionar entradas solapadas con la fase `validateInstanceId` y con la
   ventana `fetch-resolved` → `read-body-resolved` ya instrumentada por Spec 067.
4. Ejecutar tres contextos fríos contra staging y validar manualmente la
   sanitización del artefacto y los segmentos medidos.
5. Escribir un resultado con min/mediana/máx. y decidir si existe evidencia
   suficiente para optimizar un script concreto.

## Archivos a tocar

| Archivo                                                     | Cambio                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `frontend/e2e/performance.spec.ts`                          | Observar LoAF y asociar frames/scripts con validación y lectura JSON. |
| `specs/068-time-control-readiness-main-thread-attribution/` | Guardar spec, plan, tareas y evidencia sanitizada.                    |
| `.jules/bolt.md`                                            | Registrar el origen observado, los límites y el próximo foco.         |

## Contratos y privacidad

Sin cambios en producción ni en contratos HTTP. La captura solo se activa con
el flag optativo existente. Para cada URL de script se conserva exclusivamente
`pathname`; se omiten origen, query, fragmento y cualquier dato de la página o
de la respuesta.

## Riesgos y rollback

El soporte y la atribución varían por Chromium; el reporte registra si la API
está disponible y no confunde una muestra sin frames con duración cero. El
observer añade trabajo al probe, no al flujo normal. Rollback: retirar el
observer, la selección temporal y la evidencia de esta spec.

## Verificación

`fnm exec --using=26.10.0 -- npm --prefix frontend run e2e -- --project=perf --no-deps --grep 'Time Control initial sync records phase timings and remains blocking'`, staging local reconstruido solo si se cambia código frontend de producción, `npm run spec:check`, `npm run docs:check`, `npm run lint:budget` y preflight antes del commit.
