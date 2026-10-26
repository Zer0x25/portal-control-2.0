# Resultado 054: diferir tabla virtualizada de Time Control

## Cambio y prueba del comportamiento

`TimeControl.view.tsx` ahora monta un wrapper liviano que espera a que el área de registros interseque el viewport antes de importar `TimeRecordTable`. El wrapper reserva 400 px, se activa una sola vez y carga la tabla inmediatamente en navegadores sin `IntersectionObserver`. En escritorio la carga ocurre al entrar la sección en el viewport.

La prueba móvil falló antes del cambio con dos solicitudes en frío: `TimeRecordTableViewMobile-BfhpxPDl.js` y `tables-BIkCK_wm.js` (53.525 B sin comprimir). Después del cambio obtuvo cero solicitudes frías y, al desplazar la sección hasta el viewport, descargó ambos chunks y mostró el control de búsqueda. Vitest cubre el disparo del observer y el fallback sin soporte. No hubo filas editables en staging; no se enviaron mutaciones.

## Corridas y entorno

- Resultado: `passed`; registro posterior [2026-10-24T08-18-04-669Z-c6f06995.json](../039-frontend-performance-battery/evidencia/runs/2026-10-24T08-18-04-669Z-c6f06995.json).
- Baseline: [2026-10-24T07-47-52-697Z-0ab420f2.json](../039-frontend-performance-battery/evidencia/runs/2026-10-24T07-47-52-697Z-0ab420f2.json), con el mismo staging local, Chromium 153, Lighthouse 12.6.1, perfil frío móvil de 412×823 y CPU 4×.
- Staging local `http://127.0.0.1:8080`; gateway y API saludables. Node 26.10.0. Perfil Lighthouse simulado: RTT 150 ms y 1.638,4 Kbit/s.
- Imagen medida: `sha256:4e184992f8b571d59d1a716399a6baf296e4577e983efb260b92eee5cc4c0eb1`. Código: commit `c6f069955baa065c8ea7e0d8b50a4361657a63cc`; `workingTreeDirty: false`.
- Playwright: 15/15. Lighthouse estándar: 17 rutas, 85/85 aserciones. Las tres muestras frías de Control horario correspondieron a la ruta y rol Admin esperados.

## Control horario frío: antes y después

Valores simulados por Lighthouse; cada versión tiene tres muestras y delta = mediana posterior menos mediana baseline.

| Métrica                      | Antes (muestras; mediana)                          | Después (muestras; mediana)                        | Cambio mediano      |
| ---------------------------- | -------------------------------------------------- | -------------------------------------------------- | ------------------- |
| FCP                          | 4.015,57 / 3.509,77 / 4.033,05 ms; **4.015,57 ms** | 3.727,88 / 3.745,37 / 3.718,10 ms; **3.727,88 ms** | −287,69 ms (−7,2%)  |
| LCP                          | 5.943,51 / 4.954,90 / 6.132,13 ms; **5.943,51 ms** | 5.488,02 / 5.486,33 / 5.404,70 ms; **5.486,33 ms** | −457,18 ms (−7,7%)  |
| TBT                          | 238 / 200,5 / 376,6 ms; **238 ms**                 | 291 / 223 / 257,5 ms; **257,5 ms**                 | +19,5 ms (+8,2%)    |
| Score                        | 0,64 / 0,71 / 0,59; **0,64**                       | 0,65 / 0,67 / 0,66; **0,66**                       | +0,02               |
| JavaScript transferido       | 357.482 / 355.225 / 391.347 B; **357.482 B**       | 296.809 / 296.816 / 296.809 B; **296.809 B**       | −60.673 B (−17,0%)  |
| Transferencia total          | 525.073 / 522.816 / 565.199 B; **525.073 B**       | 462.218 / 462.241 / 462.233 B; **462.233 B**       | −62.840 B (−12,0%)  |
| Solicitudes                  | 99 / 99 / 104; **99**                              | 85 / 85 / 85; **85**                               | −14 (−14,1%)        |
| Coste de arranque JS         | 1.389,64 / 1.596 / 1.936,98 ms; **1.596 ms**       | 1.074,53 / 1.183,79 / 1.335,36 ms; **1.183,79 ms** | −412,21 ms (−25,8%) |
| JavaScript no usado estimado | 30.505 / 30.505 / 52.648 B; **30.505 B**           | 30.802 / 31.127 / 31.097 B; **31.097 B**           | +592 B (+1,9%)      |

## Interpretación y siguiente foco

La mejora medida es clara en cantidad de recursos descargados: menos JavaScript, transferencia y solicitudes durante la ruta fría móvil. Lighthouse también reduce sus medianas simuladas de FCP y LCP. Sin embargo, no se observa una mejora global concluyente: el TBT mediano sube, el JavaScript no usado estimado queda prácticamente igual y las medianas del trace Chromium para FCP/LCP pasan de 624/1.624 ms a 726/1.661 ms. Por eso no se atribuye una mejora de Core Web Vitals de campo; son resultados de laboratorio local, con tres muestras por versión.

El siguiente foco es instrumentar el render inicial de Control horario para localizar el trabajo que sostiene el retraso observado del LCP (~1,66 s) y el TBT (~258 ms), antes de tocar reloj, filtros o tabla. La tabla estaba vacía en staging, así que su virtualización con registros reales queda fuera de esta validación.

## Validaciones

- Playwright móvil contra staging reconstruido: cero chunks fríos; chunks móvil y compartido presentes tras scroll — pasó.
- Vitest `DeferredTimeRecordTable.test.tsx` y `TimeControlView.test.tsx`: 5/5.
- `npm run perf:staging`: pasó; 15 Playwright, 17 rutas Lighthouse estándar (85/85), y tres muestras frías para cada ruta prioritaria.
- `frontend npm run check`, build Docker/Vite y preflight de gobernanza: pasaron; lint ratchet 0/0.
