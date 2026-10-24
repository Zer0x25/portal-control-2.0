# Plan 067: Time Control Instance Validation Breakdown

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Instrumentación opt-in y reporte diagnóstico; no se cambia la ruta productiva.

1. Permitir que el probe de rendimiento adjunte a readiness un marcador opaco
   de corrida y muestra; con el flag apagado, dejar el URL sin cambios.
2. Añadir `startedAtMs` a los eventos de fase ya opt-in, más marcas al resolver
   el query function y `fetchQuery`; dentro del cliente HTTP, medir la
   resolución de `fetch()` y la lectura del JSON. Cubrir emisiones y ausencia
   por defecto.
3. Capturar `fetchStart`, `requestStart`, `responseStart` y `responseEnd` de la
   entrada `PerformanceResourceTiming` de readiness, junto a estado y tiempos
   existentes, sin guardar URL ni query.
4. Crear un recolector de logs Fastify con `execFile` que una el intervalo
   Resource Timing de cada contexto con el log de servidor dentro de 500 ms y
   escriba únicamente muestra, estado y `responseTime`.
5. Ejecutar el probe de tres contextos en staging, revisar salud, agregar el
   análisis segmentado y elegir la siguiente oportunidad solo si los datos la
   respaldan.

## Archivos a tocar

| Archivo                                                    | Cambio                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `frontend/src/hooks/queries/useHealthQuery.ts`             | Añadir el marcador de correlación solo con los flags opt-in del probe.          |
| `frontend/src/services/apiClient.ts`                       | Emitir hitos internos readiness solo cuando el diagnóstico opt-in está activo.  |
| `frontend/src/tests/services/httpContract.test.ts`         | Verificar los hitos internos y su condición opt-in.                             |
| `frontend/src/store/slices/syncSlice.ts`                   | Exponer el inicio monotónico de la fase de validación en su evento diagnóstico. |
| `frontend/src/tests/state/syncSlice.test.ts`               | Cubrir timestamp de inicio y mantener la ausencia de eventos por defecto.       |
| `frontend/src/tests/hooks/useHealthReadinessQuery.test.ts` | Verificar URL normal y URL marcada bajo diagnóstico.                            |
| `frontend/e2e/performance.spec.ts`                         | Capturar Resource Timing e hitos del cliente por contexto frío.                 |
| `scripts/performance/collect-readiness-server-timings.cjs` | Correlacionar logs Fastify y escribir salida sanitizada por muestra.            |
| `specs/067-time-control-instance-validation-breakdown/`    | Guardar plan, procedimiento, resultado y evidencia sin secretos ni payloads.    |
| `.jules/bolt.md`                                           | Registrar hallazgo, límites y siguiente oportunidad medida.                     |

## Contratos afectados

Ningún cambio al contrato HTTP: método, respuesta, autenticación y schema
OpenAPI permanecen iguales. La query de correlación solo se envía con los flags
de diagnóstico; el handler actual la ignora.

## Riesgos y rollback

Una correlación incompleta o logs concurrentes podría asignar un tiempo de
servidor a la muestra equivocada; el recolector exige un único log candidato
dentro de 500 ms de inicio y fin, y rechaza faltantes/ambiguos. Los timestamps
de pared solo correlacionan muestras; las duraciones salen del reloj monotónico
del navegador. Rollback: retirar el marcador,
el campo `startedAtMs`, el recolector y la instrumentación E2E; la ruta y su
flujo funcional no cambian.

## Verificación

`fnm exec --using=26.10.0 -- npm --prefix frontend run test:jsdom -- src/tests/services/httpContract.test.ts src/tests/state/syncSlice.test.ts src/tests/hooks/useHealthReadinessQuery.test.ts`,
`npm run check` en frontend, probe Playwright `Render Performance` de tres
muestras contra staging, recolector de logs marcado, `npm run spec:check`,
`npm run docs:check` y el preflight antes del commit.
