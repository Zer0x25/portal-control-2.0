# Resultado Spec 102 — descartada

Fecha: 2026-10-25. Ruta: `/#/time-control`. Staging local aislado, misma
base de datos ya existente y backend sin cambios funcionales entre las
capturas. La comparación completa está en
[`comparison-2026-10-25.json`](./comparison-2026-10-25.json); los perfiles CPU
antes y después están junto a este informe.

## Qué se probó

El candidato sustituyó cuatro catálogos de enriquecimiento por una matriz
acotada a la página visible. En tres perfiles fríos bajó de 12 a 9 solicitudes
API, no hubo errores HTTP y la respuesta de `/api/records` se mantuvo en 1.923
bytes en las seis capturas. Los cuatro catálogos sumaban 4.262 bytes; la matriz
respondió 1.504 bytes, un ahorro de 2.758 bytes (64,71%). Las pruebas del
contrato, permisos, empleados inactivos, páginas y deduplicación pasaron en el
candidato.

## Medición comparable

Cinco corridas Lighthouse por versión, secuenciales, con Lighthouse 12.6.1,
perfil frío móvil, CPU 4x y RTT 150 ms:

| Métrica             |                         Base |                    Candidato | Cambio de mediana |
| ------------------- | ---------------------------: | ---------------------------: | ----------------: |
| Performance         |             0,94 (0,72–0,96) |             0,93 (0,82–0,94) |            −1,06% |
| TBT                 |           202 ms (122,5–310) |         194,5 ms (150–570,5) |            −3,71% |
| LCP                 | 2.255,2 ms (2.253,3–5.345,6) | 2.406,1 ms (2.254,6–3.392,6) |        **+6,69%** |
| FCP                 | 1.999,1 ms (1.997,6–2.570,4) | 2.004,0 ms (1.995,9–2.494,1) |            +0,25% |
| Transferencia total |                    457.651 B |                    455.693 B |            −0,43% |

LCP supera el máximo permitido de +5%, por lo que el candidato no cumple la
condición de retención. TBT mejora en la mediana, pero los rangos se solapan y
no prueban una mejora consistente.

En tres perfiles CDP, CPU activo mediano fue 828,8 ms en base y 1.002,9 ms en el
candidato; React inclusivo 497,9 y 626,3 ms; React propio 204,6 y 289,6 ms; las
tareas largas medianas fueron 7 y 10. La dispersión incluye una captura
candidata de 1.889 ms de CPU activo. Son datos descriptivos de pocas corridas,
no una atribución causal al cambio.

## Decisión y estado final

**Descartar el runtime de Spec 102.** Se restauraron las llamadas de catálogo y
se retiró `includeInactive` del contrato, servicio, OpenAPI y SDK. Los JSON de
medición y las pruebas que documentan el candidato quedan como evidencia; no
se declara que el endpoint o el hook experimental estén implementados.

Próxima investigación: separar el trabajo de evaluación del chunk de ruta
(`loadTimeControlPage`, ~28,7 ms muestreados de mediana en base) del trabajo de
renderizado React/DOM. Esta medición del importador es pequeña frente al React
propio (204,6 ms mediano), así que no justifica por sí sola dividir el chunk.
Mantener fuera de alcance `TimeControl.view.tsx`.

No se escribieron marcaciones ni se modificaron datos de negocio en staging.
