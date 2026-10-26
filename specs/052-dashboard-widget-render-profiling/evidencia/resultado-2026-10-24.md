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

El trace frío de staging y el resultado del experimento CSS están registrados en el [diagnóstico de Spec 039](../../039-frontend-performance-battery/evidencia/diagnostico-dashboard-carga-fria-2026-10-24.md) y su [seguimiento de CSS crítico](../../039-frontend-performance-battery/evidencia/seguimiento-css-critico-2026-10-24.md). El handoff redujo las medianas frías de FCP/LCP en 435/304 ms y pasó las guardas visuales clara, oscura, de ruta y timeout. TBT mediano subió 57 ms; una muestra llegó a 413 ms y el informe conserva esa señal.

La siguiente ruta será Control horario, con LCP frío mediano de 6.473 ms y TBT de 232 ms en tres muestras. Su trace de Lighthouse marca `react-core` como principal costo de CPU (cerca de 2,0 s atribuidos), demora de render mediana de 1.675 ms y una cadena de dependencias mediana de 763 ms; primero hay que perfilar qué módulos y trabajo de montaje dominan esa ruta. Gestión de personal queda como siguiente señal de TBT con 295 ms en la medición estándar.

## Validación

- `npm --prefix frontend run check`: pasó.
- `npm --prefix frontend run lint`: pasó.
- `npm --prefix frontend run build`: pasó; el bundle no contiene `ProfiledDashboardWidget`, `__portalRenderMetrics` ni ids `widget:*`.
- `npm run spec:check` y `npm run docs:check`: pasaron.
