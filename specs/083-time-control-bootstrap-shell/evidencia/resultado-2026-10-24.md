# Resultado: shell temprano de Control horario

## Conclusión

La mejora cumple los criterios medibles de la spec en staging local. En tres
muestras frías comparables, el LCP Lighthouse simulado mediano de Control
horario bajó de **5.492,90 ms** a **2.259,44 ms** (**−58,9%**). La muestra más
lenta terminó en **2.472,49 ms**, bajo la meta de laboratorio de 2.500 ms.
Dashboard y Worker Portal quedaron dentro del margen de no regresión; el CLS
máximo de las tres rutas fue **0,01**.

## Comparación

Se comparó el staging reconstruido antes del cambio con el staging de la versión
final. Se usaron tres muestras frías por ruta, Lighthouse 12.6.1, Chromium 153,
viewport móvil 412 × 823, throttling simulado de CPU 4×, RTT 150 ms y ancho de
banda 1.638,4 Kbps. La mediana se calcula sobre las tres muestras de cada
ejecución.

| Ruta            | LCP mediano antes | LCP mediano después |     Cambio | LCP después, tres muestras            | CLS máximo después |
| --------------- | ----------------: | ------------------: | ---------: | ------------------------------------- | -----------------: |
| Dashboard       |       2.255,19 ms |         2.254,51 ms |     −0,03% | 2.254,11 / 2.258,19 / 2.254,51 ms     |               0,01 |
| Worker Portal   |       2.251,94 ms |         2.254,55 ms |     +0,12% | 2.255,05 / 2.254,49 / 2.254,55 ms     |               0,01 |
| Control horario |       5.492,90 ms |         2.259,44 ms | **−58,9%** | **2.254,09 / 2.259,44 / 2.472,49 ms** |               0,01 |

El FCP mediano de Control horario bajó de **3.711,94 ms** a **2.010,29 ms**
(−45,8%) y su score Lighthouse mediano subió de **0,69** a **0,91**. El shell
temprano es el candidato de LCP en las tres muestras frías. La prueba Playwright
de sincronización confirma que el overlay cubre la pantalla y recibe el hit test;
la medición de contenido pendiente registra el encabezado real despejado a
**2.226 ms** mientras los registros aún cargan.

### Seguimiento de TBT

El TBT mediano de Control horario subió inicialmente de **176,5 ms** a
**291,5 ms** (+65,2%), mientras el bootup cost cambió solo 1,5%. Una repetición
fría de tres muestras dio **249,51 ms** de TBT mediano y **983,72 ms** de bootup
cost mediano. Las trazas muestran que el shell adelantó FCP desde ~3,71 s a
~2,01 s; tareas de `react-core` y `index` que antes acababan antes de FCP ahora
quedan dentro de la ventana FCP–TTI. La atribución, los datos por muestra y los
límites del perfil están en
[`diagnostico-tbt-2026-10-24.md`](./diagnostico-tbt-2026-10-24.md).

El TBT repetido sigue sobre 200 ms en las tres muestras, por lo que queda una
señal de carga del hilo principal para abordar. El bootup cost no aumentó y no
hay datos de INP de campo. El perfil con source maps encontró trabajo repetido
de conexión Socket.IO, solicitudes y montaje de Control horario dentro de una
tarea larga; su atribución es parcial y no explica por sí solo los +73 ms. El
historial también registra variación de TBT entre corridas en
[`seguimiento-css-critico-2026-10-24.md`](../../039-frontend-performance-battery/evidencia/seguimiento-css-critico-2026-10-24.md).

## Validación funcional y de cobertura

- Batería final: **20/20** pruebas Playwright, **18/18** rutas de readiness,
  **17/17** rutas Lighthouse estándar y **85/85** aserciones Lighthouse.
- Cargas frías: tres muestras para Dashboard, Worker Portal y Control horario;
  las nueve URL/rutas quedaron emparejadas con el destino solicitado.
- Las seis fases del runner terminaron en `passed`; staging respondió 200 en el
  gateway y `/api/health`.
- Build frontend, guard CSP y presupuesto del HTML compilado de **5.115 bytes**
  (límite 5.120) pasaron.

## Límites y próximo paso

Estas son mediciones de laboratorio con Lighthouse simulado; no hay datos de
CrUX ni telemetría de usuarios reales. La referencia pública de LCP clasifica
como bueno un valor de hasta 2,5 s en el percentil 75 de visitas; nuestro p50 de
tres ejecuciones simuladas bajo esa cifra no certifica el p75 de campo.
[Guía de LCP de web.dev](https://web.dev/articles/optimize-lcp).

El próximo paso recomendado es aislar y medir la inicialización global de
Socket.IO: aparece en las tres tareas largas, aunque aporta solo 6,78–14,94 ms
muestreados, así que no se espera que explique por sí sola los +73 ms. Después
se debe medir el trabajo de consultas y montaje de ruta. Mantener sin cambios
Dashboard y Worker Portal, cuya no regresión quedó medida.

## Registros reproducibles

- Baseline inmediatamente anterior al cambio, imagen
  `sha256:3211e650a543f8a6298e086ccaa0ac1d9c21d04a9215649d15344f85b31dca55`:
  [`2026-10-24T21-50-24-919Z-5e3ff76e.json`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T21-50-24-919Z-5e3ff76e.json).
- Resultado final, imagen
  `sha256:e427ecd64de0cd1d55081654a32646edf0b7553c76fb588c8d1b417bb8522938`:
  [`2026-10-24T22-41-51-168Z-5e3ff76e.json`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T22-41-51-168Z-5e3ff76e.json).
- Las corridas intermedias fallidas o con variación atípica se conservaron en el
  registro append-only; no se usan para aceptar el cambio.
