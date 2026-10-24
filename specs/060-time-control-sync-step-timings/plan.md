# Plan 060: Time Control Sync Step Timings

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Crear un envoltorio de medición optativo que consulta un flag de ventana; apagado no lee el reloj ni emite eventos.
2. Envolver `validateInstanceId`, la comprobación concurrente de stores críticas y cada `step.action` sin alterar su orden ni sus resultados.
3. Añadir tests unitarios para el estado apagado y los eventos acotados cuando se activa el flag.
4. Extender el probe Playwright para activar el flag antes del bundle, recolectar fases en memoria y validar secuencia, overlay y privacidad.
5. Reconstruir staging, medir tres sesiones frías, guardar evidencia y elegir el siguiente cambio según las fases más largas.

## Archivos a tocar

| Archivo                                                | Cambio                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `frontend/src/store/slices/syncSlice.ts`               | Añadir eventos de duración optativos para validación, IndexedDB y pasos de sync. |
| `frontend/src/tests/state/syncSlice.test.ts`           | Cubrir flag apagado y eventos permitidos.                                        |
| `frontend/e2e/performance.spec.ts`                     | Activar diagnóstico en el probe y persistir fases por muestra.                   |
| `specs/060-time-control-sync-step-timings/evidencia/*` | Guardar registros y lectura antes/después.                                       |
| `.jules/bolt.md`                                       | Registrar resultados y el próximo paso de mejora.                                |

## Contratos afectados

Ninguno.

## Riesgos y rollback

Un fallo al emitir eventos no debe afectar sincronización; el helper captura solo tiempos y el test cubre resultado y orden. El flag nunca se activa desde la aplicación normal. Si la medición altera la secuencia, revertir el helper y sus puntos de llamada; no cambiar la lógica de refresh.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run test:jsdom -- src/tests/state/syncSlice.test.ts
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run lint
fnm exec --using=26.10.0 -- npx prettier --check frontend/src/store/slices/syncSlice.ts frontend/src/tests/state/syncSlice.test.ts frontend/e2e/performance.spec.ts
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
PERFORMANCE_RESULTS_DIR=../specs/060-time-control-sync-step-timings/evidencia fnm exec --using=26.10.0 -- npm --prefix frontend run e2e:staging -- --project=perf --no-deps --grep 'Time Control initial sync records phase timings and remains blocking'
```
