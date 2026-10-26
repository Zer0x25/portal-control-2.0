# Diagnóstico de TBT tras el shell de Control horario

Fecha: 2026-10-24

Estado: investigación completada; no se cambió el código de la aplicación.

## Repetición fría

Se repitió Lighthouse tres veces en serie para `/#/time-control`, contra la
misma imagen de staging `sha256:e427ecd64de0cd1d55081654a32646edf0b7553c76fb588c8d1b417bb8522938`
y el commit `5e3ff76e9445e09ac102bbcdf1ac8611e5496f32`. El entorno fue Node
26.10.0, Lighthouse 12.6.1, Chromium 153, viewport 412 × 823, CPU 4× simulado,
RTT 150 ms, ancho de banda 1.638,4 Kbps y almacenamiento frío.

| Captura UTC  |             FCP |             LCP |           TBT |   Bootup cost |             TTI |        CLS |
| ------------ | --------------: | --------------: | ------------: | ------------: | --------------: | ---------: |
| 23:16:50.928 |     2.050,01 ms |     2.256,01 ms |     249,51 ms |     983,72 ms |     5.251,40 ms |     0,0102 |
| 23:17:16.216 |     2.006,37 ms |     2.252,05 ms |     267,00 ms |   4.901,26 ms |     5.345,88 ms |          0 |
| 23:17:40.990 |     2.008,11 ms |     2.256,17 ms |     232,00 ms |     950,56 ms |     5.174,80 ms |     0,0102 |
| **Mediana**  | **2.008,11 ms** | **2.256,17 ms** | **249,51 ms** | **983,72 ms** | **5.251,40 ms** | **0,0102** |

La mediana de TBT queda **73,01 ms (+41,4%)** sobre el baseline sin shell
(176,50 ms). Es menor que la primera mediana posterior al cambio (291,50 ms),
por lo que esa primera diferencia también contenía variación de ejecución. El
bootup cost mediano no aumentó: pasó de 1.051,87 ms antes del cambio a 983,72 ms
en esta repetición (−6,5%). Una de las tres muestras vuelve a mostrar el outlier
de bootup cercano a 4,9 s, sin que suba el TBT en esa proporción.

## Atribución del aumento

Lighthouse calcula TBT sumando la parte de las tareas largas que excede 50 ms
entre FCP y TTI ([definición de Lighthouse](https://developer.chrome.com/docs/lighthouse/performance/total-blocking-time)).
El cambio adelantó FCP y movió trabajo de arranque dentro de esa ventana:

- **Antes del shell:** FCP estuvo entre 3.706 y 3.746 s. La tarea inicial de
  `react-core` empezó entre 3.074 y 3.078 s y duró 133–180 ms; la tarea del
  entry `index` empezó entre 3.002 y 3.009 s y duró 69–72 ms. Ambas terminaban
  antes de FCP, así que no contribuían al TBT.
- **Después del shell:** en las tres nuevas muestras FCP ocurrió entre 2.006 y
  2.050 s. La tarea inicial de `react-core` ocurrió entre 2.921 y 3.073 s y
  duró 143–154 ms. La tarea de `index` ocurrió entre 2.856 y 3.002 s y duró
  65–84 ms. Ahora suceden después de FCP y antes de TTI (5.175–5.346 s).

Esas dos tareas aportan juntas aproximadamente **110–127 ms** de bloqueo
contabilizado en cada captura nueva. Esto explica la mayor parte del cambio de
mediana observado (+73 ms); el resto varía con las otras tareas y la ejecución.
Las trazas las atribuyen a los chunks compartidos `react-core` y `index`; el
bootup cost mediano no aumentó.

## Interpretación y siguiente paso

El aumento de TBT es principalmente un **efecto de la ventana de medición**:
el shell mejora la pintura inicial en ~1,7 s, por lo que Lighthouse empieza a
contar tareas de arranque que antes terminaban antes de FCP. La mejora de LCP
permanece, con mediana de 2.256 ms en esta repetición.

Eso no significa que el hilo principal esté libre: ahora hay una tarea larga de
React aproximadamente 0,9–1,1 s después de FCP. El TBT de todas las muestras
repetidas supera 200 ms, que Lighthouse clasifica como moderado en móvil. TBT es
una señal de laboratorio y un proxy de INP; no sustituye mediciones de INP real
([guía de TBT de web.dev](https://web.dev/articles/tbt)). No hay datos CrUX/RUM
para afirmar el impacto en usuarios.

El primer perfil CDP exploratorio (una carga, CPU 4×, sin throttling de red)
atribuyó tiempo muestreado a `react-core` (272 ms), `state` (105 ms), `index`
(43 ms) y `TimeControl.container` (31 ms). Como el build de staging no tenía
source maps, esos datos no señalaban funciones de la app. Se repitió ahora la
captura con mapas locales y comparación de los bundles activos.

## Perfil con source maps

Se generó un build de producción con mapas, se compararon sus **207 archivos
JavaScript** con los servidos por staging byte por byte (excluyendo solo el
comentario `sourceMappingURL`) y se perfiló `/#/time-control` en tres cargas
frías de navegador. Staging siguió en la imagen
`sha256:e427ecd64de0cd1d55081654a32646edf0b7553c76fb588c8d1b417bb8522938`.
La captura usó Chromium, viewport 412 × 823, DPR 1,75, CPU 4×, caché deshabilitada,
service workers bloqueados y sin throttling de red. Se muestrearon los primeros
1.900 ms posteriores a FCP; el Long Tasks API delimitó cada tarea y los samples
de CPU dentro de la tarea se mapearon a código fuente.

| Muestra | FCP de esta captura | Tarea larga dentro del perfil | CPU mapeada en la tarea | Señales de app repetidas                                             |
| ------- | ------------------: | ----------------------------: | ----------------------: | -------------------------------------------------------------------- |
| 1       |              280 ms |          FCP + 892 ms, 139 ms |                80,51 ms | `socketService.connect` 14,94 ms; `useTimeControl` 6,38 ms           |
| 2       |              204 ms |          FCP + 944 ms, 131 ms |                77,71 ms | `apiClient.performRequest` 10,85 ms; `socketService.connect` 9,72 ms |
| 3       |              180 ms |          FCP + 910 ms, 138 ms |                65,05 ms | `apiClient.performRequest` 7,94 ms; `socketService.connect` 6,78 ms  |

La tarea de 131–139 ms aparece en las tres capturas, aproximadamente 0,9 s
después de FCP, en la misma zona relativa de arranque que las tareas de Lighthouse
contadas por TBT. Dentro de esos stacks también se repiten `useTimeControl`
(1,57–6,38 ms), `refreshActiveQueriesForSync` (3,70–4,55 ms) y
`formatBusinessDateCL` (2,73–6,77 ms). La hoja `date-fns` `formatDistance`
aparece como trabajo propio de dependencia en dos muestras (7,22–8,38 ms).

La inicialización de Socket.IO pasa por `src/hooks/useSocketEvents.ts:41–47` y
`src/services/socketService.ts:11–17`; las solicitudes entran por
`src/services/apiClient.ts:384–398`, mientras el montaje de la ruta ejecuta
`src/features/time-control/hooks/useTimeControl.ts:25–34`. Ninguna función propia
explica por sí sola la tarea completa. Entre 42 y 53 ms de cada ventana quedaron
como frame `program` sin archivo fuente, por lo que la atribución es parcial. Las
tareas de 94–103 ms cercanas a FCP +0,46–0,58 s no recibieron samples del perfil;
no se les asigna un origen.

Los FCP de esta captura (180–280 ms) **no son comparables** con los 2.006–2.050
ms de Lighthouse: el perfil CDP no emuló la red. El perfil tampoco recalcula TBT;
sus duraciones por función son estimaciones de muestreo. Su conclusión útil es
que la tarea repetible combina inicialización global de socket, solicitudes y
renderizado/consultas de Control horario. Esto concuerda con el desplazamiento
de la ventana TBT después del shell; no demuestra una regresión equivalente en
el tiempo total de CPU ni permite atribuir todo el aumento de 73 ms a un solo
componente.

El build normal se restauró después de la captura y se comprobó que no quedaran
mapas en `frontend/dist`. El ID de imagen de staging permaneció igual. El resumen
por tarea, con los frames fuente, está en
[`perfil-cpu-time-control-2026-10-24.json`](perfil-cpu-time-control-2026-10-24.json).

## Siguiente mejora a medir

La candidata con señal más consistente es diferir la conexión de Socket.IO hasta
después de mostrar el contenido prioritario: `connect` aparece en las tres tareas
largas, aunque aporta solo 6,78–14,94 ms muestreados. Conviene tratarlo como una
hipótesis de ganancia acotada, no como solución a los 73 ms completos. En la
siguiente iteración se debe aislar ese cambio, conservar el comportamiento de
eventos en tiempo real y repetir el mismo lote Lighthouse; las solicitudes
iniciales y el render del route quedan como la segunda línea de investigación.

## Reportes de Lighthouse

- `23:16:50.928Z`: `.lighthouseci/127_0_0_1--2026_10_24_23_16_50.report.json`
- `23:17:16.216Z`: `.lighthouseci/127_0_0_1--2026_10_24_23_17_16.report.json`
- `23:17:40.990Z`: `.lighthouseci/127_0_0_1--2026_10_24_23_17_40.report.json`

Los reportes crudos viven en `.lighthouseci` y no se versionan; las muestras y
la atribución reproducible quedan resumidas en este documento.
