# Resultado Spec 082: lookup de turnos estable

## Método

Se midieron tres navegaciones frías antes y después, con Node 26.10.0, Vite
8.3.3, Chromium 153, viewport 412×823 y CPU 4×. El Vite local reenvió `/api` a
`127.0.0.1:8080`; el runner solo autenticó y navegó, sin mutaciones de negocio.
El baseline corresponde al commit `5bf9943`.

## Resultados

| Scope                      | Baseline: commits / `actualDuration` mediana | Cambio: commits / `actualDuration` mediana |
| -------------------------- | -------------------------------------------: | -----------------------------------------: |
| Ruta `worker-portal`       |                                 4 / 153,7 ms |                               4 / 144,6 ms |
| Vista `worker-portal:view` |                                  4 / 98,8 ms |                               4 / 100,8 ms |

Conteos por muestra: ruta y vista baseline `4, 5, 3`; después `4, 4, 4`.
Eventos descartados: 0/3 en ambos grupos. La mediana de commits queda en 4
para ambos scopes. La mediana de ruta es 9,1 ms menor; la de vista es 2 ms
mayor. La variación entre muestras impide atribuir esos cambios al helper.

El test del helper verifica la propiedad más acotada de esta optimización: un
cambio de estado `isLoading` sin cambio de colecciones mantiene la misma
referencia; cambios en empleados o permisos crean una referencia nueva. Como
`enrichedRecords` depende de este helper, el cambio permite omitir su cálculo
cuando useScheduling se actualiza por una query no relacionada. El perfil de
ruta no demuestra todavía una ganancia medible en commits, duración de vista,
producción o Core Web Vitals.

## Estado y límites

- `WorkerPortal.view.tsx` no se modificó.
- Staging respondió HTTP 200 y conservó la imagen frontend
  `sha256:8cf223b927a58f697ceda99de0a00a04e70888f35ff8b1384fa156677a57b54b`;
  no se reconstruyó ni reinició ningún servicio.
- La sincronización inicial terminó correctamente. Persistieron errores
  `EPIPE`/WebSocket del proxy Vite en tiempo real.
- React Profiler en Vite dev no mide latencia de producción ni CWV.
- Capturas crudas: [baseline](./worker-portal-baseline-render-profile-2026-10-24.json)
  y [versión optimizada](./worker-portal-render-profile-2026-10-24.json).
