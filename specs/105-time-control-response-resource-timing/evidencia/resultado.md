# Resultado Spec 105: recuperar tiempos API con límites válidos

Fecha: 2026-10-26. Ruta: `/#/time-control`. Se hicieron tres perfiles fríos
contra staging con la imagen frontend
`sha256:f0ceceddd67ef66fbc702cbd76fcd19200818ea851f1e5f91eefdfc45d48f116`.
El artefacto saneado está en
[`time-control-response-timing-2026-10-26.json`](./time-control-response-timing-2026-10-26.json).

## Método

El recolector deriva tiempo a headers usando `requestTime` (segundos
monotónicos) más `receiveHeadersEnd` (milisegundos relativos). Lo publica solo
si el instante de headers cae entre request start y finalización. La duración
total se calcula por separado entre request start y `loadingFinished`, si ese
intervalo es no negativo. Se clasifican flags de red, caché, precarga y service
worker como enums; las marcas crudas no se serializan.

## Resultado

|    Perfil | Requests | HTTP 200 | Origen red | Headers válidos | Total válido | Evento `response-after-completion` |
| --------: | -------: | -------: | ---------: | --------------: | -----------: | ---------------------------------: |
|         1 |       12 |       12 |         12 |              12 |           12 |                                 12 |
|         2 |       12 |       12 |         12 |              12 |           12 |                                 12 |
|         3 |       12 |       12 |         12 |              12 |           12 |                                 12 |
| **Total** |   **36** |   **36** |     **36** |          **36** |       **36** |                             **36** |

En las 36 llamadas, el TTFB derivado tuvo mediana **17,484 ms** y rango
2,335–51,776 ms; la duración total tuvo mediana **19,251 ms** y rango
3,369–54,114 ms. Medianas por endpoint:

| Endpoint                          | Requests | Headers mediano | Total mediano |
| --------------------------------- | -------: | --------------: | ------------: |
| `/api/configs/{key}`              |        6 |       13,608 ms |     15,441 ms |
| `/api/audit-logs`                 |        3 |       21,814 ms |     23,032 ms |
| `/api/corrections/stats`          |        3 |       20,136 ms |     26,983 ms |
| `/api/employees/clocking-options` |        3 |       25,338 ms |     27,167 ms |
| `/api/health/ready`               |        3 |        2,895 ms |      3,787 ms |
| `/api/holidays`                   |        3 |       16,178 ms |     18,336 ms |
| `/api/leaves`                     |        3 |       17,587 ms |     18,811 ms |
| `/api/records`                    |        3 |       22,280 ms |     24,151 ms |
| `/api/shift-reports`              |        3 |       24,800 ms |     25,708 ms |
| `/api/shifts/assignments`         |        3 |       15,914 ms |     17,703 ms |
| `/api/shifts/patterns`            |        3 |       12,974 ms |     14,376 ms |

El timestamp del evento `responseReceived` siguió después de
`loadingFinished` en las 36 capturas. `Response.timing` y start/finish, sin
embargo, produjeron intervalos finitos y ordenados en todos los requests; el
artefacto conserva ambas señales por separado. El protocolo oficial describe
`requestTime` como base monotónica y los offsets de fase como milisegundos
relativos ([CDP Network](https://chromedevtools.github.io/devtools-protocol/tot/Network/)).

## Decisión y límites

La medición del API local queda utilizable para separar espera de red de CPU del
frontend. No demuestra una mejora de código, ni equivale a TBT, INP o latencia
de producción. No se cambió el runtime de la aplicación. Los 19 tests del
perfilador y el preflight local pasaron. El perfilador cotejó 210 assets con
staging, restauró `frontend/dist` sin source maps y el digest activo
`sha256:f0ceceddd67ef66fbc702cbd76fcd19200818ea851f1e5f91eefdfc45d48f116` no
cambió. Readiness final `healthy`; no se escribieron marcaciones ni se
modificaron datos de negocio.

Siguiente foco: revisar tareas largas React/DOM con estos tiempos de red aparte,
y escoger una operación síncrona repetida del frontend antes de otra
optimización.
