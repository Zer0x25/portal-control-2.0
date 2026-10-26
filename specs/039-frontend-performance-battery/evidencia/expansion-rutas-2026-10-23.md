# Expansión de rutas de rendimiento — 2026-10-23

## Entorno y ejecución

- Destino: staging local `http://127.0.0.1:8080`; gateway y `/api/health` saludables.
- Chromium de Playwright, viewport 1440×900, medición serial.
- Comando: `npm run perf:staging`.
- Resultado: Playwright **4/4 pruebas aprobadas**; Lighthouse CI produjo **11 reportes estándar**, pasó las aserciones y produjo tres reportes fríos de Dashboard.
- Las diez rutas Playwright tuvieron tres muestras en contextos limpios. Lighthouse autenticó Worker Portal con rol trabajador y esperó que cada ruta protegida coincidiera con su URL solicitada; las once rutas terminaron en el destino correcto.
- No se modificaron datos de negocio.

## Preparación visible de ruta en Playwright

Milisegundos desde `domcontentloaded` hasta que el contenido primario quedó visible; tres muestras por ruta.

| Ruta                     |   Mediana |    Máximo |
| ------------------------ | --------: | --------: |
| Dashboard                | 424,28 ms | 589,41 ms |
| Dashboard de supervisión | 542,55 ms | 571,90 ms |
| Control horario          | 552,05 ms | 639,03 ms |
| Planificación mensual    | 559,48 ms | 568,17 ms |
| Turnos teóricos          | 583,30 ms | 595,36 ms |
| Calendario de turnos     | 581,26 ms | 660,30 ms |
| Configuración            | 553,67 ms | 622,98 ms |
| Worker Portal            | 495,41 ms | 603,64 ms |
| Logbook                  | 545,48 ms | 561,57 ms |
| Kiosk                    | 286,87 ms | 291,37 ms |

## Lighthouse estándar

Una corrida por ruta. Tiempos y bytes corresponden al reporte Lighthouse guardado localmente.

| Ruta                     | Score |    FCP |      LCP |    TBT |
| ------------------------ | ----: | -----: | -------: | -----: |
| Dashboard                |  0,92 | 239 ms | 1.386 ms | 344 ms |
| Dashboard de supervisión |  0,85 | 260 ms | 1.474 ms | 582 ms |
| Control horario          |  0,93 | 287 ms | 1.198 ms | 301 ms |
| Planificación mensual    |  0,96 | 325 ms | 1.032 ms | 214 ms |
| Turnos teóricos          |  0,89 | 225 ms | 1.438 ms | 443 ms |
| Calendario de turnos     |  0,93 | 199 ms | 1.354 ms | 326 ms |
| Configuración            |  0,98 | 231 ms |   878 ms | 153 ms |
| Worker Portal            |  0,92 | 247 ms | 1.370 ms | 339 ms |
| Logbook                  |  0,96 | 280 ms |   963 ms | 227 ms |
| Kiosk                    |  0,99 | 199 ms | 1.095 ms | 107 ms |
| Governance audit         |  0,96 | 245 ms | 1.058 ms | 219 ms |

## Lectura y siguiente foco

- De las rutas añadidas, Dashboard de supervisión tuvo el TBT más alto (**582 ms**), seguida por Turnos teóricos (**443 ms**). Son señales de una sola corrida; repetir antes de adjudicar causa.
- Dashboard estándar mostró score **0,92**, FCP **239 ms** y LCP **1.386 ms**. En perfil frío, tres corridas dieron medianas FCP/LCP de **4.458/6.397 ms** y TBT entre **170 y 518 ms**. Mantener Dashboard como foco de carga fría; investigar luego el hilo principal de supervisión.
- Los reportes históricos que pedían `#/worker-portal` pero terminaban en `#/dashboard` se excluyen del baseline de Worker Portal. Esta corrida nueva termina en `#/worker-portal` correctamente.
- Lighthouse ejecutó una muestra por ruta; estos resultados priorizan la investigación y no prueban una mejora causal.
