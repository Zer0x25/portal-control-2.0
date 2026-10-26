# Resultado Spec 067: descomposición de `validateInstanceId`

## Procedimiento

- Staging local reconstruido con `docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend`.
- Probe Playwright de Control de Horario: 412×823, CPU 4×, tres contextos fríos, `PERFORMANCE_REQUIRE_CLOCKING_OPTIONS_ENDPOINT=1` y `PERFORMANCE_DIAGNOSTIC_RUN_ID=perf067-20261024-1322a`.
- Correlación de logs Fastify con Resource Timing por muestra, tolerancia de 500 ms; el recolector produjo exactamente una coincidencia por cada request.
- Staging quedó saludable y `GET /api/health/ready` respondió HTTP 200 desde el gateway.

## Mediciones

Todos los valores son milisegundos. La tabla muestra mínimo / mediana / máximo en `n=3`:

| Segmento                                               |  Min / mediana / máx. | Observación                                                       |
| ------------------------------------------------------ | --------------------: | ----------------------------------------------------------------- |
| `validateInstanceId` completo                          | 313,5 / 369,6 / 409,1 | Fase instrumentada en el navegador.                               |
| Inicio de request tras comenzar validación             |    11,1 / 13,9 / 14,4 | Espera previa baja.                                               |
| Request readiness, `PerformanceResourceTiming`         |       2,9 / 4,4 / 6,2 | TTFB: 2,0 / 2,9 / 5,1.                                            |
| `responseTime` Fastify                                 |    0,83 / 1,34 / 1,43 | Las tres respuestas fueron HTTP 200.                              |
| `fetch()` resuelto después de `responseEnd`            |   26,6 / 26,8 / 159,1 | Hay demora variable antes de que el cliente procese la respuesta. |
| `Response.json()` desde que `fetch()` resuelve         | 186,0 / 271,1 / 359,2 | El cuerpo medía 95 bytes en las tres muestras.                    |
| Retorno de `apiClient` después de leer el cuerpo       |       0,1 / 0,2 / 0,7 | Sin costo relevante después de la lectura.                        |
| Resolución del query function después de `responseEnd` | 298,1 / 345,2 / 386,5 | Incluye la espera de procesamiento del cliente.                   |
| Espera de `fetchQuery` después del query function      |       0,6 / 0,9 / 3,5 | No domina la fase.                                                |
| Trabajo de validación después de `fetchQuery`          |       0,3 / 0,8 / 3,4 | No domina la fase.                                                |
| Long tasks solapadas con validación                    |   88,0 / 97,4 / 102,6 | Explican parte, no todo, del intervalo cliente.                   |

FCP fue 688 / 724 / 736 ms y el overlay permaneció visible 366,6 / 405,0 / 438,5 ms. Se conservan como observaciones de esta corrida, sin afirmar mejora respecto de otras muestras.

## Lectura y siguiente foco

Fastify y el transporte de readiness tardan pocos milisegundos. La espera se concentra en el procesamiento/planificación de la respuesta en el navegador: `Response.json()` tarda una mediana de 271,1 ms para un cuerpo pequeño. Como la API `response.json()` combina lectura, decodificación y parseo, estos datos no identifican cuál parte domina ni prueban causalidad. Las tareas largas observadas cubren alrededor de 97,4 ms en mediana, por lo que tampoco explican por sí solas todo el tiempo.

El siguiente paso es capturar atribución de trabajo del hilo principal durante esa ventana y relacionarla con las tareas largas. No se debe reescribir el endpoint ni sustituir el parseo JSON hasta saber qué código o espera ocupa el tiempo. `n=3`, CPU 4× y los intervalos son cortos; no se declara mejora estable en latencia ni Core Web Vitals.

## Verificación

- Probe Playwright: 1 test aprobado, tres contextos fríos; un request readiness HTTP 200 por contexto y marcador correlacionado en 3/3.
- Recolector Fastify: 3/3 respuestas correlacionadas; mediana de `responseTime` 1,34 ms.
- Tests dirigidos: 20/20 aprobados; TypeScript frontend aprobado.
- `spec:check`, `node --check` del recolector y `git diff --check` aprobados.
- Preflight local: 6/6 etapas aprobadas, incluyendo ESLint 0/0 y tipos de backend/frontend.
- Evidencia cruda: [`time-control-sync-phase-diagnostics.json`](./final/time-control-sync-phase-diagnostics.json) y [`fastify-response-timings.json`](./final/fastify-response-timings.json).
