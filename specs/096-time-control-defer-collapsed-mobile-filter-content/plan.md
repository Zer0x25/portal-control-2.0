# Plan 096: diferir filtros móviles contraídos

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Extender las pruebas de `TimeRecordFilters` para comprobar que escritorio
   monta los campos al iniciar, móvil contraído no monta ni consulta y abrir
   móvil carga los campos y habilita su query.
2. Mover los controles, opciones, consultas de filtros y lógica de fecha máxima
   a `TimeRecordFilterControls.tsx`.
3. Mantener en `TimeRecordFilters.tsx` el encabezado del periodo y el control de
   expansión; renderizar el contenido con `React.lazy` + `Suspense` solo si está
   expandido.
4. Extender el E2E para verificar cero descarga inicial del chunk y una carga
   única al expandir. Capturar tres visitas frías en staging y comparar
   transferencia JS/API con Spec 095.
5. Reconstruir solo frontend de staging, validar los perfiles y regresiones,
   actualizar evidencia/bitácora y pasar preflight.

## Archivos a tocar

| Archivo                                                                      | Cambio                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------- |
| `frontend/src/features/time-control/components/TimeRecordFilters.tsx`        | Wrapper liviano, expansión y lazy load.            |
| `frontend/src/features/time-control/components/TimeRecordFilterControls.tsx` | Campos y consultas diferidas.                      |
| `frontend/src/tests/components/time_control/TimeRecordFilters.spec.tsx`      | Casos de escritorio, cerrado y expandido.          |
| `frontend/src/tests/guardrails/datePickerGuardrails.test.ts`                 | Actualizar el archivo dueño del input de fecha.    |
| `frontend/e2e/performance.spec.ts`                                           | Afirmar carga bajo demanda y requests al expandir. |
| `specs/096-time-control-defer-collapsed-mobile-filter-content/`              | Criterios, plan, tareas y evidencia.               |
| `.jules/bolt.md`                                                             | Resultado y siguiente foco medido.                 |

## Contratos afectados

Sin cambios. No se modifican endpoints, esquemas, SDK ni datos.

## Riesgos y rollback

La separación puede perder estado si el usuario cierra y vuelve a abrir. Las
pruebas deben fijar los valores mientras el contenido está montado y verificar
de nuevo al expandir. En escritorio el lazy load podría mostrar brevemente el
fallback; validar que los controles aparezcan con claridad. Si el ahorro inicial
queda bajo 5 KB, el chunk carga antes del uso, o alguna interacción cambia,
restaurar el render inline.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run test:run -- src/tests/components/time_control/TimeRecordFilters.spec.tsx src/tests/guardrails/datePickerGuardrails.test.ts
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api PERFORMANCE_RESULTS_DIR=../specs/096-time-control-defer-collapsed-mobile-filter-content/evidencia fnm exec --using 26.10.0 -- npm exec -- playwright test e2e/performance.spec.ts --project=perf --no-deps --grep "mobile time-control filters|overlaps its route chunk|Dashboard defers route"
fnm exec --using 26.10.0 -- npm run check
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm run perf:profile:route -- --route=time-control --output=../specs/096-time-control-defer-collapsed-mobile-filter-content/evidencia/time-control-production-cpu-after-2026-10-25.json
node .agents/skills/ci-preflight/scripts/preflight.cjs
```
