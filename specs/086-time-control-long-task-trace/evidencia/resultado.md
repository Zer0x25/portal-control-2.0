# Resultado Spec 086: correlacionar tareas largas de Control horario

## Método y alcance

- Se capturaron tres sesiones frías de `/#/time-control` autenticadas como
  administrador contra staging local. La imagen de frontend fue
  `sha256:fcdcc13af02ae5891514463b2f5bec9d8c22202417edbb1a63de7e17544e5524`;
  los 208 scripts locales con source maps coincidieron con los servidos.
- Playwright/CDP, Chromium 153.0.8010.12, viewport 412×823, escala 1,75, CPU
  4×, caché deshabilitada y muestreo CPU de 1 ms. El trace registró desde la
  navegación hasta un segundo después de mostrar el reloj de la ruta.
- Se conservaron `RunTask` de 50 ms o más del hilo `CrRendererMain` y llamadas
  JS anidadas. Los tiempos CPU se alinearon con las tareas por su reloj CDP;
  mapas válidos resolvieron archivos, funciones y líneas. La traza cruda se
  procesó en memoria y no se guardó.
- Las tres capturas no perdieron eventos, alinearon el reloj de CPU y no tuvieron
  fallos API. Para evitar duraciones negativas, el correlacionador omitió entre
  82 y 91 intervalos no positivos del perfil CPU por captura; todos los tiempos
  atribuidos son no negativos. El perfilador restauró el build normal, no dejó
  mapas en `dist` y verificó que la imagen de staging no cambiara. No se
  alteraron cuentas ni datos.

## Muestras

| Captura | Tareas `RunTask` ≥50 ms | Tarea más larga | `performRequest` propio muestreado | Tiempo inclusivo muestreado |
| ------: | ----------------------: | --------------: | ---------------------------------: | --------------------------: |
|       1 |                       5 |      193,568 ms |                          45,136 ms |                   75,602 ms |
|       2 |                       7 |      168,405 ms |                           8,915 ms |                   27,453 ms |
|       3 |                       6 |      199,863 ms |                          16,399 ms |                   57,715 ms |

La mediana de tareas largas por captura fue 6. El tiempo propio muestreado de
`performRequest` tuvo mediana 16,399 ms; su tiempo inclusivo dentro de la tarea
tuvo mediana 57,715 ms. La diferencia incluye frames anidados, entre ellos el
`fetch` nativo. Las capturas varían entre sí; ninguna de esas cifras equivale a
tiempo de bloqueo Lighthouse.

## Candidatos repetidos

| Fuente                                                                       | Mediana muestreada dentro de tareas largas | Presencia |
| ---------------------------------------------------------------------------- | -----------------------------------------: | --------: |
| `src/services/apiClient.ts` — `performRequest` (línea 384)                   |                                  57,715 ms |       3/3 |
| `src/App.tsx` — callback lazy de `PersistentLayout` (línea 16)               |                                  28,974 ms |       3/3 |
| `src/App.tsx` — callback lazy de `TimeControlPage` (línea 35)                |                                  17,063 ms |       3/3 |
| `src/utils/timePolicy.ts` — `formatBusinessDateCL` (línea 26)                |                                   7,546 ms |       2/3 |
| `src/features/time-control/views/TimeControl.view.tsx` (línea 102)           |                                   7,137 ms |       3/3 |
| `src/hooks/queries/useConfigQuery.ts` — `useControlInternoEnabledQuery` (73) |                                   6,874 ms |       3/3 |

La vista de Control horario aporta poco frente a la carga compartida de la
aplicación. Los frames directos más largos de las tareas fueron de React y del
React Compiler; la muestra CPU ubica trabajo de `performRequest`, carga lazy y
formateo de fechas dentro de esos límites. No se puede
atribuir toda la duración de una tarea a un solo frame ni sumar frames
inclusivos.

## Decisión

El trace hace que `performRequest` y el arranque compartido de `App.tsx` sean
candidatos repetidos para una prueba enfocada. `performRequest` mezcla ejecución
propia, `fetch` nativo y actividad asincrónica; el código no muestra una
transformación pesada obvia y el perfil no indica cuál endpoint o consulta
aporta cada muestra. No se hizo un cambio de runtime ni un A/B, por lo que no se
declara una reducción de TBT.

Siguiente: medir qué solicitudes y sincronizaciones iniciales coinciden con la
tarea `performRequest`; después probar una sola reducción de trabajo de arranque
con la batería focalizada. Conservar el cambio solo si cinco muestras en el
mismo build bajan el TBT mediano al menos 20% o a menos de 200 ms, sin empeorar
LCP más de 5% y con regresiones funcionales aprobadas.

## Evidencia y verificación

- [Registro saneado de las tres capturas](./time-control-long-task-trace-2026-10-25.json)
- Pruebas del perfilador: 10/10 aprobadas, incluyendo límites de tarea,
  asociación temporal, exclusión de otros hilos, source maps ausentes y
  privacidad.
- El build normal se restauró y `frontend/dist` quedó sin `.map`. La imagen de
  staging se mantuvo sin reconstruir.
- No se adjunta la traza CDP cruda; se guardan solo tareas, funciones y tiempos
  saneados.
