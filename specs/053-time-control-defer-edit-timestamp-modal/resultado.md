# Resultado 053: diferir el editor de marcajes

## Cambio

`TimeControl.view.tsx` importa el editor directamente y solo renderiza el componente lazy cuando recibe `editingRecordInfo`. El editor deja de descargarse y montarse mientras está cerrado.

La prueba de captura fría reprodujo antes del cambio la solicitud a `EditTimestampModal.container-CzuYN9jw.js`; después, la lista de recursos no contiene el chunk. Vitest valida que la vista no monte el modal cerrado y que lo muestre al recibir un registro de edición. El staging no tenía filas editables, por lo que la apertura no se ejercitó con datos vivos; no se enviaron mutaciones.

## Corrida y entorno

- Resultado: `passed`; registro [2026-10-24T07-47-52-697Z-0ab420f2.json](../039-frontend-performance-battery/evidencia/runs/2026-10-24T07-47-52-697Z-0ab420f2.json).
- Baseline comparable: [2026-10-24T07-19-00-817Z-465361c6.json](../039-frontend-performance-battery/evidencia/runs/2026-10-24T07-19-00-817Z-465361c6.json).
- Staging local `http://127.0.0.1:8080`; gateway y API saludables. Node 26.10.0, Chromium 153, Lighthouse 12.6.1; viewport Lighthouse 412×823, CPU 4×, RTT 150 ms y 1.638,4 Kbit/s.
- Imagen medida: `sha256:c5f62d257afa413b347f77eb3f221449e2debe3c8848f3baebb6a58f8ca472e6`. El JSON conserva `workingTreeDirty: true` porque se capturó antes del commit.
- Playwright de rendimiento: 14/14. Lighthouse estándar: 17 rutas, 85/85 aserciones. Control horario y Worker Portal: tres muestras frías válidas cada uno.

## Control horario frío: antes y después

Valores Lighthouse simulados; delta = después menos antes, con tres muestras por corrida.

| Métrica                      | Antes (muestras; mediana)                          | Después (muestras; mediana)                        | Cambio mediano     |
| ---------------------------- | -------------------------------------------------- | -------------------------------------------------- | ------------------ |
| FCP                          | 4.353,35 / 4.278,08 / 4.380,81 ms; **4.353,35 ms** | 4.015,57 / 3.509,77 / 4.033,05 ms; **4.015,57 ms** | −337,78 ms (−7,8%) |
| LCP                          | 6.248,44 / 6.472,80 / 6.487,29 ms; **6.472,80 ms** | 5.943,51 / 4.954,90 / 6.132,13 ms; **5.943,51 ms** | −529,29 ms (−8,2%) |
| TBT                          | 215,5 / 235,5 / 232 ms; **232 ms**                 | 238 / 200,5 / 376,6 ms; **238 ms**                 | +6 ms (+2,6%)      |
| Score                        | 0,63 / 0,62 / 0,62; **0,62**                       | 0,64 / 0,71 / 0,59; **0,64**                       | +0,02              |
| JavaScript transferido       | 406.495 / 404.238 / 406.487 B; **406.487 B**       | 357.482 / 355.225 / 391.347 B; **357.482 B**       | −49.005 B (−12,1%) |
| Transferencia total          | 574.048 / 571.857 / 574.089 B; **574.048 B**       | 525.073 / 522.816 / 565.199 B; **525.073 B**       | −48.975 B (−8,5%)  |
| Solicitudes                  | 107 / 107 / 107; **107**                           | 99 / 99 / 104; **99**                              | −8 (−7,5%)         |
| JavaScript no usado estimado | 55.352 / 55.352 / 55.670 B; **55.352 B**           | 30.505 / 30.505 / 52.648 B; **30.505 B**           | −24.847 B (−44,9%) |

La prueba Playwright posterior confirma cero solicitudes del chunk del editor en frío. Los módulos compartidos `forms` y `validation` todavía aparecen en el grafo de la ruta; este cambio solo atribuye el ahorro observado a la descarga omitida del modal y su frontera dinámica, no a la eliminación de esos chunks compartidos.

## Interpretación y siguiente foco

La mejora reduce transferencia y solicitudes, y las medianas de FCP/LCP bajan en esta comparación. TBT no mejora de forma concluyente: su mediana sube 6 ms y una muestra alcanza 376,6 ms. El render delay del LCP sigue alto, con mediana de 1.621,61 ms, y la ruta conserva CPU de React considerable. La siguiente iteración debe capturar un perfil de render de Control horario con un conjunto representativo de registros y localizar el trabajo dominante antes de cambiar la tabla, el reloj o el panel de marcaje.

## Validaciones

- Playwright: `Time Control excludes the timestamp editor from its cold route` — pasó; test focalizado inicial confirmó la solicitud prematura antes de la corrección.
- Vitest `TimeControlView.test.tsx`: 3/3 pruebas pasaron.
- Batería completa `npm run perf:staging`: pasó; 14 pruebas Playwright, 17 rutas Lighthouse y 85/85 aserciones.
- TypeScript frontend, build Vite y `spec:check`: pasaron antes de la corrida. Preflight final se registra al cerrar la tarea.
