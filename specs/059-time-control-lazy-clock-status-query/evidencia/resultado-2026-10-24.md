# Resultado Spec 059: diferir consulta de estado de marcaje

## Ejecución

- Fecha: 2026-10-24.
- Entorno: staging local reconstruido, `http://127.0.0.1:8080`, Chromium, viewport 412×823, CPU 4×.
- Muestras: tres contextos autenticados nuevos en `/#/time-control`.
- Evidencia cruda: [time-control-sync-phase-diagnostics.json](./time-control-sync-phase-diagnostics.json). El probe guarda `pageSize` y presencia de filtros solamente; no registra valores de usuario, fechas, query strings completos ni cuerpos.

## Solicitudes

| Medida por contexto frío           | Antes (Spec 058) | Después (Spec 059) |
| ---------------------------------- | ---------------: | -----------------: |
| `GET /api/records`                 |                3 |                  2 |
| Solicitudes API totales            |               21 |                 20 |
| Consulta `pageSize=5` sin empleado |                1 |                  0 |

Después del cambio, los dos patrones que permanecen son `pageSize=30` con rango de fechas para la tabla y `pageSize=50` para las opciones de filtros. Ambas solicitudes estuvieron presentes en las tres muestras y devolvieron HTTP 200. La llamada innecesaria evitada era la del panel de marcaje sin empleado seleccionado; al escoger un empleado, el hook habilita la consulta filtrada.

Se eliminó una llamada de asistencia por entrada fría: 33 % menos solicitudes a `/api/records` y 4,8 % menos solicitudes API totales en esa ruta. Esto mide menor tráfico; no cuantifica el trabajo de base de datos ni demuestra menor latencia visible.

## Métricas de carga

| Métrica                 | Antes, mediana (rango) | Después, mediana (rango) | Cambio de medianas |
| ----------------------- | ---------------------: | -----------------------: | -----------------: |
| FCP                     |       696 ms (672–724) |         712 ms (708–720) |             +16 ms |
| Candidato LCP observado | 1.568 ms (1.356–1.628) |   1.608 ms (1.592–1.700) |             +40 ms |
| Overlay visible         | 871,5 ms (798,4–937,7) |   904,4 ms (879,4–993,9) |           +32,9 ms |

Las muestras de ambos grupos se solapan y cada grupo tiene solo tres observaciones. No se demuestra una mejora de FCP, LCP ni del tiempo de overlay, y no se atribuyen las diferencias pequeñas a este cambio. El objetivo verificado de esta iteración es reducir una solicitud que no tenía consumidor mientras no hubiera selección.

## Validación

- Regresión `ClockingPanel.spec.tsx`: 5/5; primero falló al exigir que la query permaneciera deshabilitada sin empleado y luego pasó con el cambio.
- Probe Playwright de staging: 1/1; tres contextos, overlay cubriendo la vista y hit-test, dos requests `/api/records` por contexto, firmas de tabla/filtros conservadas, todas las respuestas API HTTP 200.
- Typecheck, ESLint, Prettier, `spec:check`, `docs:check` y `npm run preflight`: aprobados.
- Staging frontend reconstruido y saludable; `/api/health` y frontend respondieron HTTP 200.

## Siguiente paso

Localizar el mayor tiempo de espera de la sincronización inicial instrumentando `validateInstanceId` y cada `step.action`. La reducción de esta llamada no acortó de forma demostrable el overlay.
