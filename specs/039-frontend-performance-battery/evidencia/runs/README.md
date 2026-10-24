# Registro de corridas de rendimiento

`npm run perf:staging` escribe un archivo `<runId>.json` por ejecución. El runner nunca reutiliza un nombre de corrida y registra también las ejecuciones fallidas para conservar la causa y las fases alcanzadas.

## Esquema

- `schemaVersion`: versión del formato; incrementar si cambia de forma incompatible.
- `runId`, `startedAt`, `completedAt`, `status`: identidad, ventana y resultado global.
- `source`: commit local y si había cambios en el checkout al iniciar la medición.
- `target`: staging local, id de imagen frontend de Docker cuando está disponible y códigos de salud.
- `runtime`: sistema, arquitectura, Node, Chromium y viewport.
- `routeCatalog`: rutas identificadas por id, agrupación por familia, perfil de acceso e interacciones medidas.
- `stages`: resultado, tiempos y códigos de salida de validación del catálogo, Playwright, Lighthouse estándar, Dashboard frío y rutas prioritarias frías. Incluye los reportes JSON de Playwright y métricas Lighthouse resumidas por ruta. `lighthouseColdDashboard.samples` contiene tres muestras; `lighthouseColdPriorityRoutes.samples` contiene tres muestras para cada una de Worker Portal y Control horario. Desde spec 041, `harnessValidation` ejecuta primero las regresiones del preparador de sesión; el campo no existe en corridas anteriores.
- Cada muestra Lighthouse conserva `metrics` del modelo simulado de Lighthouse y `observed` del trace Chromium sin throttle. No comparar ambos grupos como si midieran el mismo modo: `observed.lcpPhasesMs`, `network`, `mainThread` y `opportunities` explican el trace; `metrics` mantiene la puntuación con el perfil mobile definido por Lighthouse.
- `network.apiRequests` y las rutas de recursos omiten query strings para no guardar filtros, identificadores o credenciales que pudieran aparecer en URLs. Tiempos de solicitudes, tareas largas y fases LCP son observaciones del trace; oportunidades de CSS/JavaScript son estimaciones del Lighthouse simulado.
- `failure`: primera excepción del runner, si la ejecución falló fuera de una fase con código de salida.

Los resultados son evidencia de una corrida, no una comparación causal. Antes de evaluar una mejora, comparar varias corridas con el mismo staging, equipo, versión de navegador y perfil. Revisar `routeMatched` en los reportes Lighthouse; un reporte redirigido no representa la ruta solicitada. Una ruta con `lighthouse: false` sigue dentro de Playwright y debe declarar `lighthouseSkipReason` en el catálogo.

Desde el cierre de spec 041, `lighthouseStandard.routeAssertions` comprueba los umbrales agrupando por `finalDisplayedUrl` (incluido hash). LHCI usa `finalUrl`, sin fragmento, y agrupaba las 17 rutas como una URL: su aprobación no demostraba los umbrales de cada ruta. Las mediciones históricas siguen siendo válidas; no interpretar su fase estándar aprobada como un gate individual por ruta. El lote `2026-10-23T15-01-52-304Z-45138318` se revalidó con el nuevo gate después de capturarse: 17 rutas, 85 aserciones aprobadas; evidencia suplementaria en spec 041. Los próximos lotes ejecutan esta comprobación antes de guardar el resultado global y fallan si alguna ruta incumple.

Las mediciones de interacción distinguen la primera activación de sus repeticiones. El primer cambio puede incluir la descarga y evaluación de un chunk diferido; las siguientes transiciones miden el comportamiento con ese chunk ya cargado. Para búsquedas, la primera muestra incluye el render del estado vacío.

## Corridas del 2026-10-24

- `2026-10-24T06-17-37-339Z-465361c6.json` y `2026-10-24T06-35-12-796Z-465361c6.json` completaron las fases registradas antes de probar el bloqueo de CSS en navegador. La inspección encontró que podían mostrar una ruta ajena al Dashboard sin estilos; conservar los JSON como evidencia histórica, pero no usarlos para aceptar una mejora ni como referencia visual.
- `2026-10-24T06-57-55-919Z-465361c6.json` midió el handoff antes del último ajuste de fallback por timeout. Se conserva como corrida intermedia; la corrida siguiente usa el digest final y añade la prueba de ese fallback.
- `2026-10-24T07-19-00-817Z-465361c6.json` es la corrida final. Playwright pasó 13/13; Lighthouse estándar validó 17 rutas con 85/85 aserciones; Dashboard, Worker Portal y Control horario tienen tres muestras frías con ruta validada cada uno. Worker Portal usó `worker` y Control horario `admin`. El resultado comparativo está en [`../seguimiento-css-critico-2026-10-24.md`](../seguimiento-css-critico-2026-10-24.md).

## Correcciones de captura

- `2026-10-23T12-48-36-057Z-45138318.json` registra una ejecución fallida previa a excluir Login de Lighthouse: `NO_FCP`. El test de ruta Playwright pasó; la captura de Lighthouse no debe usarse.
- `2026-10-23T12-54-56-155Z-45138318.json` pasó sus comandos, pero el primer colector mezcló las tres muestras frías dentro de las rutas estándar. Sus tres muestras `lighthouseColdDashboard.samples` siguen siendo válidas; para el lote estándar usa el registro `2026-10-23T13-06-33-525Z-45138318.json`, que valida 17 rutas únicas y separa las fases por inicio/fin.
- `2026-10-23T13-40-28-701Z-45138318.json` quedó incompleto durante spec 040 al preparar Worker Portal. Se reprodujo un orden incorrecto de opciones/argumentos en `waitForFunction` de Puppeteer: el guard podía pasar con shell ausente o agotar el timeout con ruta correcta. Se corrigió y se repitió la medición. En registros previos, `routeMatched` compara las URLs finales de los reportes y sigue siendo evidencia del destino medido; el guard previo por sí solo no probaba readiness.
- `2026-10-23T14-51-41-119Z-45138318.json` quedó incompleto durante spec 041: al preparar Gobernanza el guard detectó Dashboard. El preparador visitaba la raíz antes de navegar al hash solicitado, permitiendo una carrera con el redirect de sesión del login. Se eliminó esa visita intermedia, se añadieron regresiones y se repitió la batería. No usar esta corrida para comparar resultados.
