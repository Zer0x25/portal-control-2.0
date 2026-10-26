# Plan 105: Usar temporización de respuesta CDP validada

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Escribir tests antes del cambio para conversión de la base `requestTime`,
   orden de inicio/headers/finalización, fuentes y salida segura.
2. Guardar solo categorías de origen y estado de temporización, manteniendo los
   valores CDP crudos en memoria.
3. Calcular el tiempo a headers a partir de `requestTime + receiveHeadersEnd`
   solo si el instante resultante queda entre request start y finalización.
4. Calcular duración total solo a partir de request start y `loadingFinished`
   cuando ambas marcas sean válidas, aunque el evento `responseReceived` esté
   invertido. Mantener separada la advertencia de orden de eventos.
5. Agregar estados y medianas válidas por endpoint; capturar tres navegaciones
   sobre la misma imagen staging, restaurar build normal y registrar límites.

## Archivos a tocar

| Archivo                                               | Cambio                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `frontend/scripts/profile-worker-production.mjs`      | Resolver origen CDP, derivar tiempos con límites y agregar por endpoint. |
| `frontend/scripts/profile-worker-production.test.mjs` | Probar fuentes, conversiones, estados, agregaciones y privacidad.        |
| `specs/105-time-control-response-resource-timing/`    | Guardar método, decisión y tres muestras saneadas.                       |
| `.jules/bolt.md`                                      | Registrar conclusión y siguiente foco.                                   |

## Contratos afectados

Ninguno. Solo cambia la salida del perfilador local; no cambia el runtime,
API, OpenAPI, SDK, servidor ni base de datos.

## Riesgos y rollback

- `Network.Response.timing` puede faltar en respuestas de caché/service worker;
  reportar el origen y dejar el tiempo a headers nulo.
- Una conversión de `requestTime` y `receiveHeadersEnd` incorrecta fabricaría
  duraciones. Probar las unidades y validar inicio ≤ headers ≤ finalización.
- Revertir solo perfilador, tests y evidencia; no hay cambios de producto.

## Verificación

```bash
fnm exec --using=26.10.0 -- node --test frontend/scripts/profile-worker-production.test.mjs
fnm exec --using=26.10.0 -- node frontend/scripts/profile-worker-production.mjs --route=time-control --output=../specs/105-time-control-response-resource-timing/evidencia/time-control-response-timing-2026-10-26.json
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
fnm exec --using=26.10.0 -- npm run preflight
git diff --check
```

## Resultado de ejecución

Tres perfiles de staging recuperaron 36/36 tiempos a headers y duraciones
totales válidos. Las medianas observadas fueron 17,484 ms y 19,251 ms,
respectivamente; todos los orígenes se clasificaron como red. El evento
`responseReceived` continúa invertido frente a `loadingFinished`, pero las
medidas derivadas pasaron los límites definidos. No equivalen a TBT ni a INP.
Ver [`evidencia/resultado.md`](./evidencia/resultado.md).
