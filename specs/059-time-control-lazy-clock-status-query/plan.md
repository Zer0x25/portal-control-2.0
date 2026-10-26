# Plan 059: Time Control Lazy Clock Status Query

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. En la llamada de `useClockingPanel`, derivar `enabled` de `selectedEmployeeId`; dejar intactos filtros, tamaño de página y estado usado al seleccionar.
2. Extender el test del panel para comprobar que la consulta parte deshabilitada y se habilita con el ID elegido.
3. En el probe E2E frío, conservar solo dimensiones no sensibles de `/api/records` (`pageSize`, presencia de ID de empleado y rango de fechas) y exigir que no aparezca la consulta de cinco filas sin empleado.
4. Reconstruir frontend staging, repetir tres contextos fríos, guardar la evidencia y comparar conteo de solicitudes con Spec 058.
5. Ejecutar validaciones de frontend, specs y documentación; actualizar la bitácora.

## Archivos a tocar

| Archivo                                                             | Cambio                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `frontend/src/features/time-control/hooks/useClockingPanel.ts`      | Deshabilitar la consulta hasta seleccionar empleado.                |
| `frontend/src/tests/components/time_control/ClockingPanel.spec.tsx` | Cubrir consulta deshabilitada y activada por selección.             |
| `frontend/e2e/performance.spec.ts`                                  | Asentar dimensiones seguras y evitar regresión en el arranque frío. |
| `specs/059-time-control-lazy-clock-status-query/evidencia/*`        | Guardar muestras crudas y comparación antes/después.                |
| `.jules/bolt.md`                                                    | Registrar resultado y siguiente oportunidad medida.                 |

## Contratos afectados

Ninguno. Solo se usa el parámetro de control local `enabled` ya soportado por el hook.

## Riesgos y rollback

El estado del empleado podría no cargar si la puerta no se habilita al seleccionar. El test del componente verifica la transición `false` → `true` y el ID. Si falla, retirar `enabled` de la llamada del panel; las demás consultas de registros no cambian.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend exec vitest run src/tests/components/time_control/ClockingPanel.spec.tsx
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend run lint
fnm exec --using=26.10.0 -- npm --prefix frontend exec prettier -- --check src/tests/components/time_control/ClockingPanel.spec.tsx e2e/performance.spec.ts
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
PERFORMANCE_RESULTS_DIR=../specs/059-time-control-lazy-clock-status-query/evidencia fnm exec --using=26.10.0 -- npm --prefix frontend run e2e:staging -- --project=perf --no-deps --grep 'Time Control initial sync records phase timings and remains blocking'
```
