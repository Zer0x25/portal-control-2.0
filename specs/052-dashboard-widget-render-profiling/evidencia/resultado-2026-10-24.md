# Resultado Spec 052 — 2026-10-24

## Entorno y método

- UI servida desde Vite en modo desarrollo desde el árbol de trabajo; API y datos desde staging local `http://127.0.0.1:8080` mediante el proxy `/api`.
- Node 26.10.0, Chromium 153.0.8010.12, viewport 1440×900, cinco rutas instrumentadas y tres contextos nuevos por ruta; captura de un segundo tras cada navegación.
- El registro crudo está en [`render-profile-2026-10-24.json`](./render-profile-2026-10-24.json).
- Las métricas `actualDuration`/`baseDuration` son de React Profiler en modo desarrollo sin throttle. No equivalen a costo exclusivo de función, Lighthouse, LCP ni al perfil CPU del build de producción.
- El staging respondió HTTP 200 en gateway y `/api/health`. Se observaron intentos fallidos de Socket.IO en el proxy Vite durante el cierre de contextos; no hubo errores de API en la corrida completa.

## Resultados

| Ruta          | Commits medianos en 1 s | `actualDuration` mediana | Máximo por commit mediano |
| ------------- | ----------------------: | -----------------------: | ------------------------: |
| Dashboard     |           8 (rango 5–9) |                  32,8 ms |                   20,3 ms |
| Worker Portal |           6 (rango 5–7) |                  52,6 ms |                   17,5 ms |
| Logbook       |                       6 |                  41,6 ms |                   21,0 ms |
| Kiosk         |                       3 |                  23,6 ms |                   18,1 ms |
| Planificación |                       1 |                   4,1 ms |                    4,1 ms |

Los tiempos de rutas sirven para comparar navegación bajo este runner de desarrollo, no para ordenarlas por costo de producción.

### Widgets del Dashboard

Cada widget tuvo un commit de montaje en cada una de las tres capturas. No aparece un ciclo de renders repetidos en los widgets durante las actualizaciones del límite del Dashboard.

| Widget                             | `actualDuration` mediana por captura |
| ---------------------------------- | -----------------------------------: |
| Mi Estado (`myStatus`)             |                               4,0 ms |
| Acciones rápidas (`quickActions`)  |                               3,1 ms |
| Herramientas (`tools`)             |                               2,7 ms |
| Estado del equipo (`teamStatus`)   |                               2,8 ms |
| Últimos reportes (`latestReports`) |                               1,3 ms |
| Alertas (`alerts`)                 |                               1,1 ms |

La variación de una muestra de `latestReports` llegó a 3,1 ms; su mediana fue 1,3 ms. La magnitud observada no justifica optimizar un widget aislado. Las duraciones de los widgets están contenidas en la duración de su ruta y no se deben sumar a ella.

## Decisión y siguiente foco

No hacer un cambio de producto basado en este perfil: no hay un widget dominante y los widgets no se vuelven a renderizar en estas capturas. La instrumentación sí deja una herramienta para repetir el diagnóstico por ruta.

El trace frío de staging ya está registrado en el [diagnóstico de Spec 039](../../039-frontend-performance-battery/evidencia/diagnostico-dashboard-carga-fria-2026-10-24.md). Mantiene LCP simulado mediano en 2.558 ms; el trace Chromium sin throttle observa 116 ms para el shell inicial. Lighthouse estima 450 ms de ahorro en FCP/LCP por el CSS bloqueante, pero el ahorro aún no se ha medido y el auditor no encontró CSS sin uso.

El siguiente experimento será aislar CSS crítico mínimo para el shell y medir tres muestras frías con regresión visual clara/oscura. Después se repetirán tres muestras para Worker Portal y Control horario, cuyos LCP observados superaron 1.500 ms en la pasada estándar de una muestra por ruta.

## Validación

- `npm --prefix frontend run check`: pasó.
- `npm --prefix frontend run lint`: pasó.
- `npm --prefix frontend run build`: pasó; el bundle no contiene `ProfiledDashboardWidget`, `__portalRenderMetrics` ni ids `widget:*`.
- `npm run spec:check` y `npm run docs:check`: pasaron.
