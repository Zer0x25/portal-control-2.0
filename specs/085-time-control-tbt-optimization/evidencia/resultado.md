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

- React representa la mayor categoría del perfil CDP: mediana de 675,7 ms de
  muestras inclusivas dentro de una ventana de perfil de 2.758 ms; 275,6 ms son
  muestras propias de React. El perfil no enlaza cada muestra con una tarea
  Lighthouse concreta, por lo que esto localiza la categoría dominante, no un
  componente culpable.
- `apiClient.performRequest` apareció en las seis capturas con 70–84 ms
  muestreados por perfil. Su costo no está correlacionado con una tarea TBT
  individual y no se debe interpretar como 70–84 ms de bloqueo atribuible a una
  sola operación.
- `socketService.connect` consumió aproximadamente 10–16 ms por perfil. Diferir
  el socket no tiene ganancia potencial suficiente para explicar el TBT mediano
  de 349,5 ms.
- El ordenamiento en `useClockingPanel.ts` apareció una sola vez (42,4 ms de
  muestras) entre seis perfiles; no es repetible. La vista protegida tuvo cerca
  de 8–9 ms por perfil, sin evidencia para editarla.
- No se aplicó una optimización de runtime. No hay un componente o función
  propia que las trazas vinculen repetidamente con las tareas largas ni una
  medición A/B que pruebe una reducción de TBT. Evitar un cambio especulativo
  cumple la condición de la spec.

La mejora concreta de esta entrega es de medición y diagnóstico: existe una
corrida Lighthouse reproducible de cinco muestras y un perfilador reutilizable
para Control horario y Worker Portal. **No se afirma una mejora del desempeño de
la app**; la línea base nueva deja documentado el TBT alto para guiar el siguiente
experimento.

## Evidencia y verificación

- [Resumen de las cinco corridas Lighthouse](./time-control-lighthouse-baseline.json)
- [Perfil CDP de producción](./time-control-production-cpu-2026-10-25.json)
- [Tanda de confirmación CDP](./time-control-production-cpu-confirmation.json)
- Las pruebas de perfilador, ruta/rol y privacidad pasaron; el catálogo mantiene
  sus 18 rutas y 8 familias. `spec:check`, `docs:check` y `git diff --check`
  pasaron tras registrar esta evidencia.
- Staging siguió healthy con la imagen indicada. El perfilador restauró el
  `dist` normal y no dejó source maps en el build local.

## Siguiente experimento

Capturar un trace de navegador que conserve los límites y marcas de las tareas
largas junto con sus stacks fuente; luego correlacionarlo con commits React y
consultas iniciales. El perfil actual no ofrece esa unión temporal. Empezar por
la tarea repetida del bundle `react-core` cercana a FCP y reducir el árbol o el
trabajo que dispara solo cuando el trace identifique el componente responsable.
