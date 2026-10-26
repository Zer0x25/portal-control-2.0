# Resultado Spec 066: opciones mínimas de empleados para Control de Horario

- Fecha: 2026-10-24.
- Destino: staging local `http://127.0.0.1:8080`.
- Ruta: `/#/time-control`; viewport 412×823; CPU 4×; tres contextos fríos por corrida.
- Capturas: baseline a las 15:37 UTC y final a las 15:54 UTC. Cada registro omite cuerpos, tokens e identidades.

## Resultado de payload y solicitudes

| Medición por arranque                       | Baseline |               Final |    Cambio |
| ------------------------------------------- | -------: | ------------------: | --------: |
| GET `/api/employees`                        |        2 |                   0 |        −2 |
| GET `/api/employees/clocking-options`       |        0 |                   1 |        +1 |
| Bytes de respuesta por empleado             |   75.926 |              29.764 |   −60,8 % |
| Bytes acumulados de respuestas de empleados |  151.852 |              29.764 |   −80,4 % |
| Solicitudes API totales                     |       20 |                  19 | −1 (−5 %) |
| Filas de la respuesta liviana               |        — | 207 en 3/3 muestras |   estable |

La proyección evaluada incluye `id`, `name`, `position`, `area`, `workdayType` y `status`. Las tres respuestas del endpoint liviano fueron HTTP 200. No se guardó contenido de empleados.

## Tiempos observados

| Mediana de tres muestras            |   Baseline |      Final |   Cambio |
| ----------------------------------- | ---------: | ---------: | -------: |
| Fase `Empleados`                    |   195,4 ms |   182,1 ms | −13,3 ms |
| FCP                                 |     712 ms |     708 ms |    −4 ms |
| Overlay inicial                     |   372,7 ms |     355 ms | −17,7 ms |
| Retiro del overlay desde navegación | 1.297,1 ms | 1.249,7 ms | −47,4 ms |

Los rangos baseline/final se solapan en estas métricas y `n=3` es pequeño; no afirmo una mejora estable de latencia ni de Core Web Vitals. La mejora demostrada es la reducción del payload y de una solicitud API completa por arranque.

La validación de instancia sigue siendo el tramo instrumentado de mayor duración: mediana 360 ms en baseline y 358,6 ms al final. Es la siguiente oportunidad a estudiar con nuevas muestras antes de cambiar el código.

## Validación

- Playwright de sincronización inicial: 1/1 suite, tres contextos; staging respondió healthy.
- Endpoint: autenticación obligatoria, DTO exacto, activos y scope de `Usuario`; integración también cubre el scope de área de `Supervisor`.
- TypeScript backend/frontend: OK. Pruebas dirigidas: backend integración 14/14; frontend afectado 28/28.
- OpenAPI y SDK frontend sincronizados. Preflight completo: secrets scan sin secretos, 66 specs, 360 Markdown y 28 ADR consistentes, Prettier, ratchet ESLint 0/0 y TypeScript backend/frontend aprobados.
- Staging saludable: gateway, `/api/health` y `/api/health/ready` respondieron HTTP 200.
- Capturas: [baseline](baseline/time-control-sync-phase-diagnostics.json) y [final](final/time-control-sync-phase-diagnostics.json).
