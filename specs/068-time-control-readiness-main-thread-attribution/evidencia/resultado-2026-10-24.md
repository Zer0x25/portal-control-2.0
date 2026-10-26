# Resultado Spec 068: atribución del hilo principal

## Procedimiento

- Se usó el staging local ya reconstruido por Spec 067; la aplicación no cambió en esta spec.
- Probe Playwright de Control de Horario: 412×823, CPU 4×, tres contextos fríos y `PERFORMANCE_SAVE_MAIN_THREAD_ATTRIBUTION=1`.
- Chromium 153 reportó soporte `long-animation-frame` en 3/3 contextos. Las entradas se filtraron por `validateInstanceId` y por el intervalo `fetch-resolved` → `read-body-resolved`.
- Fastify se correlacionó por muestra con tolerancia de 500 ms. Gateway readiness respondió HTTP 200.

## Mediciones

Milisegundos, mínimo / mediana / máximo con `n=3`:

| Medición                                          |  Min / mediana / máx. |
| ------------------------------------------------- | --------------------: |
| `validateInstanceId`                              | 315,9 / 432,8 / 562,1 |
| `Response.json()`                                 | 141,8 / 283,6 / 354,6 |
| Frames LoAF durante validación                    |             3 / 4 / 5 |
| Frames LoAF durante lectura JSON                  |             3 / 3 / 3 |
| Solapamiento del scheduler React con lectura JSON |   42,0 / 54,9 / 137,8 |
| Blocking duration LoAF durante lectura JSON       |    24,1 / 39,5 / 99,2 |
| `responseTime` Fastify                            |    0,99 / 1,20 / 1,23 |

En las tres muestras apareció el script `/assets/react-core-k-iqGWxC.js`, función minificada `S`, `invokerType=event-listener`, durante la validación. En el bundle local, la posición de fuente registrada (1715) corresponde a `function S()` del ciclo de trabajo del scheduler de React. Se solapó con la lectura JSON entre 42,0 y 137,8 ms según la muestra. También aparecieron scripts de almacenamiento y el cliente API, pero no dominaron de forma consistente ese intervalo.

## Lectura y siguiente foco

La correlación apunta a trabajo del scheduler de React que ocupa el hilo principal mientras la promesa de lectura JSON está pendiente; el parseo de un cuerpo de readiness de 95 B no queda identificado como costo dominante. LoAF no revela qué componente o actualización de la aplicación originó cada callback, y los intervalos incluyen ejecución y espera. No atribuimos causalidad ni declaramos mejora.

El siguiente paso es correlacionar `startTime`/`commitTime` de React Profiler con readiness y las fases de sync para identificar qué subárbol se renderiza durante esos frames. Esos datos de desarrollo servirán para localizar componentes; no se compararán como tiempos de producción. Si tampoco localizan un subárbol, el siguiente método será un perfil CPU de producción con source maps controlados.

## Privacidad y verificación

- Los campos de atribución guardan pathname, función acotada, tipo de invocador, posición y tiempos; un chequeo sobre el JSON confirmó que no retienen el origen, `?` ni `#` de `sourceURL`.
- Probe Playwright: 1 test aprobado, tres contextos fríos, soporte LoAF 3/3 y frames capturados en los intervalos observados.
- Recolector Fastify: 3/3 correlaciones; mediana 1,20 ms.
- Preflight local: 6/6 etapas aprobadas, ESLint 0/0 y tipos de backend/frontend correctos.
- Evidencia cruda: [`time-control-main-thread-attribution.json`](./final/time-control-main-thread-attribution.json) y [`fastify-response-timings.json`](./final/fastify-response-timings.json).
