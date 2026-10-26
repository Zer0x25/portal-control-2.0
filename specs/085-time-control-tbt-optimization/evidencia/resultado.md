# Resultado Spec 085: diagnóstico TBT de Control horario

## Alcance y método

- Se midió `/#/time-control` autenticado como administrador en staging local
  `127.0.0.1:8080`. El frontend quedó en la imagen
  `sha256:fcdcc13af02ae5891514463b2f5bec9d8c22202417edbb1a63de7e17544e5524`;
  backend y base de datos no se reconstruyeron ni modificaron.
- Lighthouse 12.6.1: cinco corridas móviles, viewport 412×823, CPU 4×,
  throttling simulado de red (150 ms RTT / 1638,4 Kbps), almacenamiento frío y
  la misma imagen en las cinco corridas.
- El perfilador CDP produjo dos tandas de tres perfiles de CPU, Chromium 153,
  CPU 4× y muestreo de 1 ms. Los source maps locales coincidieron con los 208
  scripts servidos por staging. No se guardaron respuestas, URLs con query,
  credenciales ni pilas crudas. El build normal se restauró al terminar.
- El checkout parte del commit `8eec1f5bdf01119a6799f47223e9966772893dcf`;
  `workingTreeDirty` es verdadero por el harness/evidencia de esta spec. No se
  modificó código de runtime.

## Lighthouse

| Métrica                  |   Mediana |             Rango |
| ------------------------ | --------: | ----------------: |
| FCP                      |   2,036 s |     2,004–2,131 s |
| LCP                      |   2,477 s |     2,254–5,645 s |
| TBT                      |  349,5 ms |        287–402 ms |
| CLS                      |         0 |            0–0,01 |
| Transferencia total      | 463.540 B | 463.524–502.344 B |
| Transferencia JavaScript | 300.620 B | 300.620–334.482 B |
| Solicitudes              |        85 |             85–89 |

Cuatro de las cinco muestras tuvieron LCP entre 2,254 y 2,483 s; una llegó a
5,645 s. El TBT superó 200 ms en las cinco muestras. Lighthouse atribuyó las
tareas largas más consistentes al bundle `react-core`; las principales duraron
143–264 ms y aparecieron aproximadamente 2,9 s y 5,0–5,3 s después de navegar.
Esta medición confirma una brecha de laboratorio, no un INP de usuarios reales.

## Atribución y decisión

- Los seis perfiles CDP iniciales encontraron React como la categoría dominante
  y `apiClient.performRequest` como actividad repetida, pero no tenían marcas
  temporales para enlazar esos stacks con cada tarea larga.
- La captura posterior de Spec 086 sí enlaza los perfiles CPU con límites
  `RunTask` de Chromium: `apiClient.performRequest` aparece dentro de tareas
  largas en las tres muestras. Su costo inclusivo mediano fue 66,3 ms; su tiempo
  propio muestreado fue 11,5–47,5 ms (mediana 39,6 ms). También aparecen las
  funciones lazy de `App.tsx` y la inicialización de IndexedDB.
- Esa correlación ubica candidatos, pero no demuestra que `performRequest` sea
  por sí solo la causa del TBT de Lighthouse. El trace registra trabajo React,
  fetch y código de aplicación dentro de tareas de 189–288 ms; los perfiles
  usan muestreo, y sus tiempos no se suman ni equivalen a TBT o INP.
- No se aplicó una optimización de runtime ni se midió un A/B. La vista de
  Control horario aporta alrededor de 6–8 ms de CPU muestreada, muy por debajo
  de los candidatos de arranque compartidos. No hay evidencia para editar la
  vista ni diferir Socket.IO por conjetura.

La mejora concreta de esta entrega es de medición y diagnóstico: existe una
corrida Lighthouse reproducible de cinco muestras y un perfilador reutilizable
para Control horario y Worker Portal, más una correlación temporal entre tareas
largas y muestras fuente. **No se afirma una mejora del desempeño de la app**;
la línea base nueva deja documentado el TBT alto para guiar el siguiente
experimento.

## Comparación de rutas en la imagen actual

Dashboard, Control horario y Kiosk se midieron en frío con Lighthouse 12.6.1,
cinco muestras por ruta, Chrome 155, viewport 412×823, CPU 4× y red simulada a
150 ms RTT / 1638,4 Kbps. Las capturas usaron la misma imagen de frontend
`sha256:fcdcc13af02ae5891514463b2f5bec9d8c22202417edbb1a63de7e17544e5524`.

| Ruta            | FCP mediano | LCP mediano | TBT mediano (rango) | CLS máximo | JS transferido | Solicitudes |
| --------------- | ----------: | ----------: | ------------------: | ---------: | -------------: | ----------: |
| Control horario |     2,036 s |     2,477 s |  349,5 ms (287–402) |     0,0102 |      300.620 B |       85–89 |
| Dashboard       |     2,037 s |     2,255 s |    213 ms (182–466) |     0,0102 |      285.508 B |       81–82 |
| Kiosk           |     2,998 s |     3,825 s |     49 ms (29,5–86) |          0 |      203.526 B |          48 |

Control horario tiene el mayor TBT mediano confirmado: 136,5 ms más que
Dashboard. Kiosk mantiene TBT bajo, pero su LCP mediano de 3,83 s es otro foco
de carga. El percentil máximo de TBT de Dashboard llega a 466 ms; comparar solo
medianas ocultaría esa variación. Worker Portal no tiene una medición actual
comparable: la batería completa falló al autenticar su usuario de prueba antes
de iniciar Lighthouse. El registro confirma 2 tests fallidos, 16 dependientes
omitidos y ninguna fase Lighthouse ejecutada; no se alteraron cuentas ni datos.

## Evidencia y verificación

- [Resumen de las cinco corridas Lighthouse](./time-control-lighthouse-baseline.json)
- [Comparación actual de Dashboard, Control horario y Kiosk](./current-route-comparison-2026-10-25.json)
- [Perfil CDP de producción](./time-control-production-cpu-2026-10-25.json)
- [Tanda de confirmación CDP](./time-control-production-cpu-confirmation.json)
- [Correlación de tareas largas Spec 086](../../086-time-control-long-task-trace/evidencia/resultado.md)
- Las pruebas de perfilador, ruta/rol y privacidad pasaron; el catálogo mantiene
  sus 18 rutas y 8 familias. `spec:check`, `docs:check` y `git diff --check`
  pasaron tras registrar esta evidencia.
- Staging siguió healthy con la imagen indicada. El perfilador restauró el
  `dist` normal y no dejó source maps en el build local.

## Siguiente experimento

Revisar la ejecución inicial de `apiClient.performRequest` y la sincronización
de estado local para separar el costo de `fetch`, los callbacks y los renders
que coinciden en la misma tarea. Probar un cambio solo si reduce el TBT mediano
al menos 20% o lo deja bajo 200 ms, mantiene LCP dentro de 5% y pasa regresión
funcional; por ahora no hay ganancia de runtime demostrada.
