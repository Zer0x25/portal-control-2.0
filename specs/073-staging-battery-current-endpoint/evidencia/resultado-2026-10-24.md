# Resultado Spec 073: batería de staging con el endpoint vigente

## Corrida

- `runId`: `2026-10-24T17-23-56-778Z-9e6c151b`.
- Commit registrado: `9e6c151b9b5a727b6bfe1b71d6f1a8cf59ffbf64`; árbol limpio al
  comenzar.
- Imagen frontend: `sha256:74211fb0a76a9cd5fe7dd2f52d8c0982b37ca385108f43ac6172632f1a949cdb`.
- Gateway y API `/health`: HTTP 200; Playwright: 18/18; Lighthouse: 17 rutas
  estándar, tres Dashboard frías y tres muestras frías de cada ruta prioritaria.
- Los seis stages terminaron en `passed`. El test de sincronización observó el
  endpoint `/api/employees/clocking-options` con HTTP 200 y 207 filas.
- No se enviaron mutaciones de negocio. La primera corrida fallida se conserva
  aparte como diagnóstico del flag ausente antes de la corrección.

## Lighthouse frío: rutas prioritarias

Medianas de tres muestras con Chromium 153, móvil simulado y CPU 4×:

| Ruta            | Score |      FCP |      LCP |    TBT | Transferencia | JS transferido |
| --------------- | ----: | -------: | -------: | -----: | ------------: | -------------: |
| Dashboard       |  0,93 | 2.021 ms | 2.254 ms | 214 ms |     449.506 B |      285.415 B |
| Control horario |  0,69 | 3.720 ms | 5.472 ms | 167 ms |     461.644 B |      299.115 B |
| Worker Portal   |  0,68 | 4.001 ms | 5.780 ms | 118 ms |     510.000 B |      348.466 B |

Worker Portal es la primera ruta para investigar: tiene las medianas más altas
de FCP y LCP y el mayor payload entre las tres rutas. Su auditoría observada
atribuye unos 1.584 ms a `elementRenderDelay`; el TTFB observado es ~3 ms. En el
perfil frío, `react-core` entrega 80.217 B comprimidos (218.860 B sin comprimir),
y el CSS global 36.052 B (220.561 B sin comprimir). Esto localiza recursos
compartidos importantes, pero aún no identifica qué función causa el trabajo
principal ni permite adjudicar todo el LCP a `react-core`.

El Lighthouse estándar de Worker Portal midió una muestra con TBT 782 ms,
LCP 1.451 ms y 1.410 ms de scripting atribuido a `react-core`, con una tarea de
346 ms. Ese perfil conserva storage/cache y no sustituye la medición fría; se
usa solo como señal para atribuir la carga del shell.

## Otras señales y límites

- Playwright midió Control horario SPA en 498 ms de mediana la primera visita y
  142 ms la repetida; son tiempos de transición, no LCP.
- Scroll de Governance dio p95 83,4 ms, máximo 183,3 ms y 14 de 90 frames sobre
  50 ms. Una corrida previa registró p95 33,4 ms, por lo que debe repetirse
  antes de tocar esa ruta.
- El último baseline completo anterior es de un árbol sucio y una imagen distinta;
  además, entre ambos hay cambios en queries, readiness, diagnósticos y auth.
  No se presenta la diferencia como una mejora causal de Spec 072. Esta corrida
  queda como baseline limpio para el siguiente paso.

## Decisión

La batería ahora configura su expectativa del endpoint vigente sin depender de
variables exportadas en la terminal. El selector auth de Spec 072 cumple su
gate estructural de commits React en desarrollo, pero esta corrida no demuestra
una mejora en Lighthouse de producción.

Siguiente foco: perfilar la carga fría de Worker Portal y los long tasks del
shell compartido para localizar la parte con mayor potencial antes de cambiar
el código. La evidencia completa está en
[`runs/2026-10-24T17-23-56-778Z-9e6c151b.json`](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-23-56-778Z-9e6c151b.json).
