# Plan 094: iniciar en paralelo los chunks de Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Compartir el loader de `TimeControlPage` entre `React.lazy` y un preloader
   que reconoce `#/time-control` desde el punto de entrada.
2. Iniciar esa importación antes de `root.render`; dejar intacta la carga lazy
   desde otras rutas.
3. Extender el E2E para tomar tres visitas frías móviles con CPU 4×, registrar
   el orden y cantidad de solicitudes de chunks y validar las respuestas API.
   Mantener el E2E que verifica que Dashboard no carga el chunk.
4. Reconstruir staging, capturar tres perfiles CDP y cinco corridas Lighthouse
   con la misma configuración móvil.
5. Registrar resultados, actualizar `.jules/bolt.md` y pasar preflight.

## Archivos a tocar

| Archivo                                         | Cambio                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| `frontend/src/App.tsx`                          | Loader lazy compartido y preloader del hash.             |
| `frontend/src/main.tsx`                         | Ejecutar el preloader antes del primer render.           |
| `frontend/e2e/performance.spec.ts`              | Tres perfiles fríos, orden único de chunks y estado API. |
| `specs/094-time-control-parallel-route-chunks/` | Criterios, plan, tareas y evidencia.                     |
| `.jules/bolt.md`                                | Resultado medido y siguiente foco.                       |

## Contratos afectados

Sin cambios. No se modifican endpoints, permisos ni datos.

## Riesgos y rollback

La precarga puede iniciar la descarga antes de validar la sesión y trasladar
trabajo de parseo hacia el arranque; el contenido sigue protegido por
`ProtectedRoute`. Se conserva solo si elimina la cascada y Lighthouse no muestra
regresión de FCP, LCP o CLS. Si aumenta esas métricas por encima del límite,
quitar el preloader y mantener la prueba como diagnóstico.

## Verificación

```bash
fnm exec --using 26.10.0 -- npm --prefix frontend run test:run -- src/tests/guardrails/frontendAuditGuardrails.test.ts
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm --prefix frontend exec -- playwright test e2e/performance.spec.ts --project=perf --no-deps --grep "overlaps its route chunk"
fnm exec --using 26.10.0 -- npm --prefix frontend run check
E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api fnm exec --using 26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/094-time-control-parallel-route-chunks/evidencia/time-control-production-cpu-after-2026-10-25.json
fnm exec --using 26.10.0 -- npm --prefix frontend run perf:time-control:cold
fnm exec --using 26.10.0 -- npm run preflight
```
