# Plan 069: Correlacionar commits React con readiness

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Extender el callback del `Profiler` para agregar eventos React acotados con
   scope, fase, inicio, commit y `actualDuration` en memoria de la página; medir
   raíz, providers y shell para cubrir el trabajo anterior a la ruta.
2. En el runner, activar diagnósticos de readiness solo para Time Control y
   capturar las marcas existentes sin modificar parámetros HTTP.
3. Correlacionar eventos por reloj monotónico; reportar por separado el scope
   raíz, providers, shell, ruta y vista, evitando doble conteo.
4. Ejecutar tres perfiles limpios con Vite local y API staging a CPU 4×, y
   revisar si un scope ocupa commits durante el intervalo de lectura JSON.
5. Guardar resultado y límites; solo entonces escoger un posible cambio de
   componente para una spec posterior.

## Archivos a tocar

| Archivo                                               | Cambio                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `frontend/src/main.tsx`                               | Añadir un `RenderProfiler` raíz que desaparece en producción.             |
| `frontend/src/utils/RenderProfiler.tsx`               | Retener una lista acotada de callbacks de render en desarrollo.           |
| `frontend/scripts/measure-renders.mjs`                | Capturar marcas readiness y correlacionarlas con commits en Time Control. |
| `specs/069-time-control-react-readiness-correlation/` | Registrar procedimiento, resultado y muestras sin datos de sesión.        |
| `.jules/bolt.md`                                      | Anotar el scope con mayor solapamiento y el siguiente foco.               |

## Riesgos y rollback

La instrumentación añade pequeño overhead al runner de desarrollo; no se
incluye en producción. Las mediciones pueden abarcar tiempo suspendido entre el
inicio y commit y no representan tiempo CPU exacto. Rollback: retirar el array
de commits y las marcas agregadas al runner.

## Verificación

`fnm exec --using=26.10.0 -- npm --prefix frontend run check`, lint del
frontend, `measure:renders -- --route=time-control --viewport=mobile
--cpu-throttle=4 --samples=3`, `npm run spec:check`, `npm run docs:check`,
`npm run lint:budget` y el preflight antes del commit.
