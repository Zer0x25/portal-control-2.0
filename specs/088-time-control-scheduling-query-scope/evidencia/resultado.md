# Resultado Spec 088: limitar consultas de Control horario

## Cambio

`useScheduling` conserva `full` como modo predeterminado y ahora permite limitar
sus consultas a enriquecimiento de horario o a solicitudes de corrección. La
ruta usa esos modos en sus dos consumidores: el cálculo de jornada mantiene
patrones, asignaciones, feriados y permisos; la tabla mantiene solicitudes de
corrección. Los otros consumidores conservan el modo completo.

## API observada

Tres perfiles fríos antes y tres después, con la misma ruta, viewport, CPU 4×,
Chromium 153 y backend staging (`sha256:247bcb9a6cb0dcd8ab7c15cd586be4e7ec1eaf7b31a3b2f8899fa95fcf03d27f`).
El frontend candidato es `sha256:db6ba88711e801f0063484d2904126036659d97cf11465172a1863fd9afe2bac`.

| Muestra   | Requests por carga | Completados | Fallidos | Inicio dentro de tarea larga |
| --------- | -----------------: | ----------: | -------: | ---------------------------: |
| Antes 1   |                 19 |          19 |        0 |                           13 |
| Antes 2   |                 19 |          19 |        0 |                           13 |
| Antes 3   |                 19 |          19 |        0 |                           18 |
| Después 1 |                 14 |          14 |        0 |                           13 |
| Después 2 |                 14 |          14 |        0 |                           13 |
| Después 3 |                 14 |          14 |        0 |                            8 |

Se quitaron cuatro lecturas de configuración y una lectura de solicitudes de
corrección de este flujo. Los endpoints de patrones, asignaciones, feriados,
permisos y registros siguieron presentes. La consulta de opciones de marcación
continúa porque también la consumen el shell y los controles de marcación.
La mediana de requests que comenzaron dentro de tareas largas quedó en 13 antes
y después; reducir el fanout no eliminó esa coincidencia.

`performRequest` pasó de 71,027 a 56,531 ms de CPU muestreado mediano en tres
perfiles. Es una asociación de muestreo, no una duración de red ni prueba de
causalidad.

## Lighthouse frío

Cinco corridas antes y cinco después en Lighthouse 12.6.1, modo móvil simulado,
CPU 4×, RTT 150 ms, 412×823. Se mantuvieron el backend, el navegador y la
configuración; solo cambió la imagen frontend. Los rangos de TBT no se solapan.

| Métrica                      |              Antes |          Después |             Cambio |
| ---------------------------- | -----------------: | ---------------: | -----------------: |
| TBT mediano                  | 349,5 ms (287–402) | 239 ms (211–271) | −110,5 ms (−31,6%) |
| FCP mediano                  |        2.035,63 ms |      2.109,12 ms |  +73,49 ms (+3,6%) |
| LCP mediano                  |        2.477,47 ms |      2.468,79 ms |   −8,68 ms (−0,4%) |
| JS transferido mediano       |          300.620 B |        300.739 B |             +119 B |
| Requests Lighthouse, mediana |                 85 |               85 |         sin cambio |

El TBT mejoró en esta comparación y lo conservan las cinco muestras candidatas;
la mínima fue 211 ms, así que la mediana aún supera 200 ms. FCP subió un 3,6%,
LCP quedó prácticamente igual y el peso JS se mantuvo estable. Esto es una
mejora de laboratorio de la navegación fría, no una medición de INP real. Como
la comparación se ejecutó antes y después en secuencia y no como A/B
intercalado, es evidencia favorable al cambio, no atribución causal exacta de
los 110,5 ms a cada consulta retirada.

Los long tasks Lighthouse aún aparecen principalmente en `react-core`: 17 de
los 25 elementos largos mostrados por el audit `long-tasks` usaron ese bundle.
La siguiente mejora debe medir el trabajo de render de React en la ruta; esta
reducción de solicitudes no removió ese costo.

## Límites y archivos

Los tiempos de red de CDP se omitieron porque las 42 solicitudes posteriores
también llegaron con timestamps fuera de orden. Las trazas crudas de Lighthouse
permanecen localmente en `frontend/.lighthouseci`.

- [Perfil API después](./time-control-api-requests-after-2026-10-25.json)
- [Cinco muestras Lighthouse después](./time-control-lighthouse-after-2026-10-25.json)
- [Baseline Lighthouse Spec 085](../../085-time-control-tbt-optimization/evidencia/time-control-lighthouse-baseline.json)
