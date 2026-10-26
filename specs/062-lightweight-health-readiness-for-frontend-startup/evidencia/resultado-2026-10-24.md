# Resultado Spec 062: readiness ligero al arrancar

## Captura

- Fecha: 2026-10-24, `2026-10-24T14:45:27.048Z`.
- Entorno: staging local reconstruido (backend y frontend); tres contextos fríos autenticados; Chromium, viewport 412×823, CPU 4×.
- Método: el mismo probe Playwright de Spec 061. Los tiempos crudos están en [time-control-sync-phase-diagnostics.json](./time-control-sync-phase-diagnostics.json); el probe registra rutas, estados y longitud de las respuestas de health, pero no conserva sus cuerpos.

## Resultado de rendimiento

| Medición                          |                     Spec 061 |                     Spec 062 |             Cambio |
| --------------------------------- | ---------------------------: | ---------------------------: | -----------------: |
| Overlay bloqueante visible        |         394,1 ms (357–428,9) |       440,9 ms (438,2–459,6) | +46,8 ms (+11,9 %) |
| Validación de instancia           |       369,5 ms (363,1–370,2) |       393,4 ms (390,5–546,7) |  +23,9 ms (+6,5 %) |
| Overlay retirado desde navegación | 1.298,9 ms (1.255,7–1.351,1) | 1.424,8 ms (1.394,6–1.586,1) | +125,9 ms (+9,7 %) |
| FCP                               |             744 ms (696–752) |             772 ms (716–856) |    +28 ms (+3,8 %) |

En esta captura los rangos de overlay, validación y retiro quedaron por encima de Spec 061; el rango de FCP se solapa. No se demuestra una mejora de latencia y tres muestras no permiten atribuir el aumento a este cambio. El candidato LCP fue el distintivo de la aplicación; no se afirma una mejora de Core Web Vitals.

## Trabajo y red

- `/api/health/ready` devolvió 95 bytes en cada muestra; una consulta manual consecutiva a staging midió 2.840 bytes para `/api/health` y 95 para readiness (−96,7 % de cuerpo en esa captura). Readiness evita además la consulta de tamaño de BD.
- El shell hizo una solicitud readiness por contexto y ninguna a `/api/health`. El total permaneció en 20 solicitudes API por contexto; las 60 respuestas fueron HTTP 200.
- Tiempo de respuesta de readiness observado por Playwright: 200, 426 y 185 ms (mediana 200 ms). Los logs de Fastify midieron 1–6 ms de procesamiento para readiness; la mayor espera queda fuera del handler. La validación continúa alrededor de 393 ms.
- La fase Usuarios quedó en 269,8, 289,7 y 281,8 ms (mediana 281,8 ms), la siguiente espera medible tras la validación. Se conserva su refresco y la secuencia de sync.

## Validación

- `fastifyApp.test.ts` + `healthService.test.ts`: 74/74.
- `syncSlice.test.ts` + `useHealthReadinessQuery.test.ts`: 14/14.
- Probe real de readiness contra PostgreSQL aislado: 1/1.
- `test:schemas-refactor`: 9/9; snapshot del contrato API: 2/2.
- Typecheck backend y frontend: aprobados.
- `npm run preflight`, `npm run spec:check`, `npm run docs:check` y `check:sdk`: aprobados; ESLint 0/0.
- Probe de rendimiento Playwright: 1/1 test, tres contextos; aserciones de overlay, readiness, requests y estado aprobadas.
- Staging: backend, frontend, PostgreSQL y PgBouncer `healthy`; `GET /api/health` HTTP 200 y readiness `ready/healthy`.

## Conclusión y siguiente paso

Se conserva la respuesta ligera porque elimina una consulta y reduce el payload, aunque no haya bajado el tiempo de arranque en esta medición. El backend atiende readiness en milisegundos; la siguiente medición debe separar request start, respuesta de Fastify y recepción en browser para ubicar la espera de validación, y trazar los consumidores de `/api/users` en la fase Usuarios (mediana 281,8 ms). No cambiar la validación de instancia ni adelantar interacción hasta tener esa evidencia.
