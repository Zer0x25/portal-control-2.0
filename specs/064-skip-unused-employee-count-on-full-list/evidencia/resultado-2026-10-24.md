# Resultado Spec 064: omitir el conteo no usado

## Cambio

`EmployeeService.listEmployees` ahora ejecuta solo `findMany` para listas sin
`page/pageSize` y deriva el total del número de filas devueltas. Las consultas
paginadas conservan el `findMany` más `count` en paralelo. El contrato HTTP no
cambió.

## Capturas

- Baseline de staging con backend anterior: [detalle](./baseline-2026-10-24.md) y [muestras](./baseline/time-control-sync-phase-diagnostics.json), capturado a las 15:17:00 UTC.
- Final tras reconstruir backend: capturado a las 15:19:51 UTC; [muestras](./final/time-control-sync-phase-diagnostics.json).
- Tres contextos fríos por corrida, Chromium 412×823, CPU 4×. Los archivos guardan tiempos, dimensiones permitidas, estados HTTP y bytes. No incluyen cuerpos ni PII.

## Rendimiento observado

| Métrica                         | Baseline mediana | Final mediana | Cambio observado |
| ------------------------------- | ---------------: | ------------: | ---------------: |
| Fase Empleados                  |         204,5 ms |      204,6 ms |          +0,1 ms |
| GET `/api/employees` en browser |           186 ms |        185 ms |            −1 ms |
| Respuesta de `/api/employees`   |         75.926 B |      75.926 B |       sin cambio |
| Overlay visible                 |         407,6 ms |      378,2 ms |         −29,4 ms |
| FCP                             |           724 ms |        736 ms |           +12 ms |

La fase Empleados y las peticiones individuales variaron poco; todos los rangos
se solapan con n=3. Overlay bajó en la mediana, pero FCP subió y tampoco se
demuestra causalidad. Conclusión: se quitó un `COUNT(*)` que el consumidor no
usa en listas completas, pero no hay evidencia de mejora de frontend perceptible
ni de Core Web Vitals. El payload de 75,9 KB pasa a ser la oportunidad visible
para investigar si Time Control necesita todos los empleados/campos.

## Validación

- Test del servicio de lista: 2/2; incluye conteo omitido y conteo paginado.
- Integración Fastify empleados: 13/13; filtros, delta, permisos y metadatos paginados conservados.
- Typecheck backend y frontend aprobados; `spec:check` aprobó 64 specs.
- Probe staging: 1/1, tres contextos; las respuestas API observadas fueron HTTP 200.
- Staging reconstruido: gateway HTTP 200, readiness `ready/healthy`; backend y PgBouncer healthy.
- `npm run preflight`: aprobado; ratchet ESLint 0/0.
