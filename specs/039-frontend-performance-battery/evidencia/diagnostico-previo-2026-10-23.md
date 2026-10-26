# Diagnóstico previo a Spec 039

- Fecha local: 2026-10-23
- Commit: `45138318f801c54307efd60d6a86a1729313caee`
- Entorno: compose staging local; gateway y `/api/health` devolvieron HTTP 200; servicios healthy.
- Comando: `E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api npx playwright test e2e/performance.spec.ts --project=perf --no-deps --workers=1`
- Resultado: 3/3 pruebas aprobadas en 15,4 s.

| Medición existente                   | Resultado |
| ------------------------------------ | --------: |
| Filas auditables renderizadas        |        23 |
| Scroll, promedio del método anterior |  89,36 ms |
| Cambio de pestaña Governance         | 574,70 ms |
| Ruta dashboard                       |    635 ms |
| Ruta planning                        |    720 ms |
| Ruta worker portal                   |    826 ms |
| Ruta logbook                         |    483 ms |
| Ruta kiosk                           |    908 ms |

El test existente advierte al superar 50 ms y falla solo sobre 500 ms. El
promedio de scroll incluye tiempos entre llamadas remotas de Playwright y un
único `requestAnimationFrame`; no debe interpretarse como tiempo puro de frame
ni compararse numéricamente con la nueva medición in-browser. Sirve para
priorizar una medición mejor del scroll. La nueva línea base está en
`baseline-2026-10-23.md`.
