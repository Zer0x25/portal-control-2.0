# Resultado Spec 104: motivo de los tiempos CDP inválidos

Fecha: 2026-10-26. Ruta: `/#/time-control`. Se perfiló tres veces el frontend
activo `sha256:f0ceceddd67ef66fbc702cbd76fcd19200818ea851f1e5f91eefdfc45d48f116`.
La salida saneada está en
[`time-control-request-timing-2026-10-26.json`](./time-control-request-timing-2026-10-26.json).

## Cambio del perfilador

El recolector publica motivos cerrados (`response-before-start`,
`completion-before-start`, `response-after-completion`) por request y recuentos
por captura y endpoint OpenAPI. Mantiene como `null` las duraciones cuando las
marcas violan el orden esperado, y no guarda timestamps, URLs, IDs, headers ni
cuerpos. Tests cubren los tres motivos, el caso válido y eventos incompletos.

## Capturas

|    Perfil | Requests completados | HTTP 200 | Fallidos | Orden válido | `response-after-completion` |
| --------: | -------------------: | -------: | -------: | -----------: | --------------------------: |
|         1 |                   12 |       12 |        0 |            0 |                          12 |
|         2 |                   12 |       12 |        0 |            0 |                          12 |
|         3 |                   11 |       11 |        0 |            0 |                          11 |
| **Total** |               **35** |   **35** |    **0** |        **0** |                      **35** |

Los otros motivos tuvieron recuento cero. Los 35 requests se distribuyeron en
11 endpoints: `/api/configs/{key}` (6); `/api/audit-logs`,
`/api/corrections/stats`, `/api/employees/clocking-options`,
`/api/health/ready`, `/api/holidays`, `/api/leaves`, `/api/records`,
`/api/shifts/assignments` y `/api/shifts/patterns` (3 cada uno); y
`/api/shift-reports` (2). Todos fueron GET y respondieron HTTP 200.

La única relación inválida fue que `responseReceived.timestamp` quedó después
de `loadingFinished.timestamp` en las tres capturas. El protocolo CDP tipa los
tres eventos de red usados aquí con `Network.MonotonicTime`, descrito como
tiempo monotónico en segundos ([referencia oficial del protocolo](https://chromedevtools.github.io/devtools-protocol/tot/Network/)).
La inversión observada no valida tiempo a headers ni duración completa; no se
convierten esos valores en una estimación de red. Esta captura tampoco permite
determinar si el origen fue caché, service worker, evento asociado o la fuente
de tiempo elegida por el recolector.

## Decisión y verificación

No cambia el runtime y no se declara mejora de rendimiento en esta Spec. El
recolector, sus 18 tests y la agregación por endpoint quedaron validados. El
perfilador restauró el build normal y cotejó sus 210 assets con staging; la
imagen activa no cambió. Readiness volvió a `healthy`, 35/35 respuestas fueron
HTTP 200 y no se generaron marcaciones ni se modificaron datos.

Siguiente foco: cotejar las marcas de red con `Network.Response.timing` y
registrar, como enums, si la respuesta vino de red, caché o service worker.
Solo después se deben publicar duraciones que pasen invariantes temporales.
