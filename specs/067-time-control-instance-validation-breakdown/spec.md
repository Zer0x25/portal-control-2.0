# Spec 067: Time Control Instance Validation Breakdown

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

`validateInstanceId` fue la fase más larga del arranque de Control de Horario
en Spec 066: mediana 358,6 ms en staging, con tres muestras y CPU 4×. Esa
medición abarca el cliente completo y no separa espera antes del request,
transporte, procesamiento Fastify ni parseo/cache local. Fastify ya registra
`responseTime`, pero hoy no se puede asociar cada log con una muestra del probe.

La primera descomposición mostró una mediana de 335,9 ms entre `responseEnd` y
la resolución de `fetchReadiness`, mientras Fastify respondió en 1,02 ms. Se
requieren dos hitos adicionales dentro del cliente HTTP (`fetch()` resuelto y
cuerpo JSON leído) para ubicar ese intervalo antes de cambiar código productivo.

## Alcance

Dentro:

- Añadir marcadores y tiempos solo cuando el probe opt-in de rendimiento está
  habilitado; la llamada normal de readiness conserva su URL y comportamiento.
- Medir inicio/fin de la validación, tiempos del request con
  `PerformanceResourceTiming`, tareas largas que se solapan y el
  `responseTime` de Fastify por muestra; separar resolución de `fetch()`,
  lectura del JSON, query function y `fetchQuery`.
- Correlacionar tres contextos fríos de staging (412×823, CPU 4×) y guardar
  solo tiempos, estado HTTP, bytes y número de muestra.
- Calcular cuánto tiempo ocurre antes del request, dentro del request y después
  de recibirlo para decidir el siguiente cambio de rendimiento.

Fuera (explícito):

- Cambiar frescura, seguridad o resultado de la validación de instancia.
- Alterar el cuerpo, esquema OpenAPI o semántica de `/api/health/ready`.
- Hacer optimizaciones de código basadas solo en la mediana anterior.
- Guardar cuerpos, headers de autenticación, IDs de instancia, URLs completas o
  valores de query del probe.

## Criterios de aceptación

- [x] AC1: El probe captura, en 3/3 contextos, una fase
      `validateInstanceId` y exactamente un request readiness HTTP 200 con sus
      tiempos de inicio, respuesta y fin en la línea de tiempo del navegador;
      bajo diagnóstico opt-in, captura una marca para `fetch()` resuelto y otra
      para la lectura del cuerpo JSON.
- [x] AC2: El recolector une cada request marcado con el log Fastify de esa
      muestra usando marcas de inicio/fin del navegador y timestamps de los
      logs (tolerancia máxima 500 ms); produce un `responseTime` de servidor y
      falla si falta o hay más de un log candidato.
- [x] AC3: El informe presenta min/mediana/máx. y rangos de la fase, espera
      previa, request, respuesta del servidor, resolución del query function,
      hitos internos del cliente HTTP, `fetchQuery` y trabajo cliente posterior,
      sin afirmar causalidad ni mejora con `n=3`; registra tareas largas
      solapadas cuando Chromium las soporte.
- [x] AC4: Sin el flag diagnóstico, readiness conserva su URL, respuesta y
      flujo actual; no cambia el contrato HTTP ni se envían requests adicionales.
- [x] AC5: La siguiente oportunidad de optimización se decide desde el segmento
      dominante medido y queda anotada con los límites de la evidencia.

## Restricciones

No hay migraciones ni cambio del cuerpo/contrato del endpoint. El marcador solo
se añade al request de diagnóstico, y sus datos se omiten de los artefactos.
Usar las marcas monotónicas del navegador para calcular segmentos; los
timestamps de pared solo emparejan una muestra con su log, nunca calculan
duraciones. El `responseTime` de Fastify representa el request completo del
servidor, no tiempo exclusivo de Prisma.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/state/syncSlice.test.ts`,
  `frontend/src/tests/hooks/useHealthReadinessQuery.test.ts` y el probe de
  `frontend/e2e/performance.spec.ts`.
- Docs a actualizar: resultado y evidencia en esta spec, más la siguiente
  prioridad de rendimiento en `.jules/bolt.md`.
