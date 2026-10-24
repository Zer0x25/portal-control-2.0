# Diagnóstico de carga fría del Dashboard — 2026-10-24

## Ejecución

- Registro de las 18 rutas: [`2026-10-24T05-47-44-993Z-90a9f766.json`](./runs/2026-10-24T05-47-44-993Z-90a9f766.json).
- Staging local `http://127.0.0.1:8080`; gateway y `/api/health` respondieron 200.
- Imagen frontend: `sha256:7167594181d29441beef688f076b156586ed69a24d97300a92913549d7e96962`.
- Runner en `90a9f766`, checkout limpio; Node 26.10.0 y Lighthouse 12.6.1.
- LHCI midió 17 rutas y aprobó 85/85 aserciones. Las tres muestras frías del Dashboard también pasaron. Playwright aprobó 10/10 pruebas.
- Para la muestra fría, Lighthouse simuló móvil 412×823, CPU 4×, RTT 150 ms y 1.638,4 Kbit/s. El registro conserva el perfil de cada muestra.

## Dashboard frío: dos corridas sobre la misma imagen

Las corridas de 04:37 y 05:47 usaron el mismo digest de frontend y Lighthouse 12.6.1. Entre ellas cambió el colector de métricas, no la imagen medida. Las cifras no representan una comparación de optimización de producto.

| Métrica                  | Corrida 04:37, mediana | Corrida 05:47, mediana | Lectura                                  |
| ------------------------ | ---------------------: | ---------------------: | ---------------------------------------- |
| FCP simulado             |            2.460,38 ms |            2.462,41 ms | +2,03 ms; estable                        |
| LCP simulado             |            2.554,67 ms |            2.558,12 ms | +3,45 ms; estable                        |
| TBT                      |              141,50 ms |                 187 ms | Mayor y variable; máximo nuevo 322,50 ms |
| Score                    |                   0,92 |                   0,91 | Una muestra nueva tuvo TBT alto          |
| Solicitudes              |                     81 |                     81 | Sin cambio                               |
| Transferencia total      |              448.319 B |              448.322 B | Sin cambio material                      |
| Transferencia de scripts |              283.343 B |              283.343 B | Sin cambio                               |

La corrida 05:47 dio FCP de 2.598,02 ms, LCP de 2.792,03 ms y TBT de 322,50 ms en su primera muestra; las otras dos muestras mantuvieron LCP en 2.554,85 y 2.558,12 ms. El resultado confirma que TBT requiere repetición y no debe inferirse de una sola captura.

## Métricas simuladas y trace observado

| Perfil de medición                       | FCP mediano | LCP mediano |
| ---------------------------------------- | ----------: | ----------: |
| Lighthouse móvil simulado                | 2.462,41 ms | 2.558,12 ms |
| Trace Chromium observado, sin throttling |      116 ms |      116 ms |

Estos valores pertenecen a modos distintos. Lighthouse estima una experiencia móvil con latencia, ancho de banda y CPU reducida; `observed` registra el trace del navegador ejecutado sin ese throttle. El candidato LCP observado fue el shell genérico del Dashboard.

Las fases del LCP observado fueron TTFB de 2,31–4,82 ms y demora de render del elemento de 110,87–119,05 ms (mediana 113,91 ms). Lighthouse no reportó demora/duración de carga de recurso para este candidato de texto; estas fases no descomponen el LCP móvil simulado de 2.558 ms.

La medición Playwright de ruta registró disponibilidad principal del Dashboard en 312 ms, reloj del servidor en 463 ms y respuesta de `/api/kpis/overview` en 467 ms. Una solicitud KPI seguía pendiente cuando apareció el reloj; el test no encontró endpoints duplicados. El contenido inicial no esperó al resultado KPI.

## Recursos y trabajo del hilo principal

- El recurso CSS `/assets/index-fLAUmBK-.css` transfirió 36.109 B (220.625 B de recurso). Lighthouse estimó 901 ms de ahorro para ese recurso y 450 ms de mejora potencial en FCP/LCP bajo la simulación móvil. El ahorro es una estimación del auditor, no una mejora medida.
- `unused-css-rules` reportó 0 B recuperables para el Dashboard. El recorte de utilidades CSS no tiene respaldo en esta ruta; cualquier experimento debe aislar solo el CSS crítico sin dejar el resto de la vista sin estilo.
- La cadena de dependencia más larga duró 559–661 ms; mediana 658 ms. El reporte enumera el CSS y fuentes como recursos de esa cadena.
- El total frío fue 448.322 B y 81 solicitudes: 283.343 B de scripts, 36.109 B de CSS y cerca de 119 KB de fuentes.
- Las tareas largas repetidas se atribuyeron principalmente a `react-core`; los máximos por muestra incluyeron tareas de 162, 140 y 139 ms. Lighthouse aún no atribuye esas tareas a un componente concreto.
- Las llamadas API visibles en el trace del Dashboard respondieron 200 en 7–23 ms. El costo principal observado está en los recursos/render inicial y tareas del hilo principal, no en el tiempo de respuesta del API.

## Señales entre rutas

El perfil Lighthouse estándar midió cada ruta una vez. Son señales para repetir, no una línea base suficiente para cambiar componentes:

| Ruta            | LCP observado |       TBT | Preparación Playwright, mediana |
| --------------- | ------------: | --------: | ------------------------------: |
| Worker Portal   |      1.564 ms | 169,15 ms |                       489,35 ms |
| Control horario |      1.535 ms | 199,23 ms |                       526,89 ms |

Estas dos rutas muestran mayor LCP observado que el resto del catálogo y pasan a una repetición fría de tres muestras antes de atribuir la demora a sus componentes.

## Siguiente experimento

Primero se comprobará la cadena CSS del shell del Dashboard con un experimento de CSS crítico mínimo. La aceptación exige bajar al menos 250 ms la mediana del FCP/LCP simulado en tres muestras frías, mantener la aparición del contenido Dashboard y aprobar la regresión visual clara/oscura. El tamaño de `dist/index.html` debe seguir bajo 5 KB y el CSS completo debe seguir disponible para todas las rutas. Luego se repetirá Lighthouse frío para Worker Portal y Control horario, con tres muestras cada uno.
