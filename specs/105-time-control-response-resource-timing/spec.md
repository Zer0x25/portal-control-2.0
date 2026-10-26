# Spec 105: Usar temporización de respuesta CDP validada

- Estado: Implementado (2026-10-26; 36/36 tiempos de red pasaron límites)
- Autor: zer0x
- Fecha: 2026-10-26
- ADR relacionado: N/A

## Problema

En Spec 104, 35/35 requests completados registraron
`responseReceived.timestamp > loadingFinished.timestamp`, por lo que el
recolector anuló tanto tiempo a headers como duración total. CDP también ofrece
`Network.Response.timing`, cuyo `requestTime` es una base monotónica y cuyos
campos de fase son milisegundos relativos; además expone flags de caché y
service worker. Aún no medimos si esos campos permiten recuperar tiempos
individualmente válidos.

## Alcance

Dentro:

- Clasificar el origen de respuesta con enums seguros: service worker, caché de
  disco, caché de precarga, red o desconocido.
- Derivar tiempo a headers desde `Network.Response.timing` y duración total
  desde inicio/finalización, validando cada intervalo por separado.
- Conservar nulo cualquier tiempo cuyo baseline no esté en rango o cuya
  respuesta venga de un origen no disponible para temporización de red.
- Probar unidades, límites, marcas invertidas y privacidad; capturar tres
  navegaciones frías de Control horario en staging.

Fuera (explícito):

- Cambiar runtime del portal, hooks, endpoints, OpenAPI, backend o datos.
- Interpretar CDP o CDP ResourceTiming como TBT, INP o causalidad de CPU.
- Guardar timestamps, IDs de requests, URLs, headers, credenciales, cuerpos,
  respuestas o trazas CDP crudas.

## Criterios de aceptación

- [x] AC1: El request resume origen de respuesta y estado de `Response.timing`;
      tiempo a headers solo se publica si cae entre inicio y finalización, y la
      duración total solo si inicio y finalización son ordenados.
- [x] AC2: Tests cubren conversiones requestTime + milisegundos, fuentes
      cache/service worker/red/desconocida, eventos invertidos, campos ausentes,
      límites temporales, agregación por endpoint y privacidad.
- [x] AC3: Tres perfiles de staging reportan recuentos por fuente/estado,
      duración válida por endpoint y fallos; el informe separa estas medidas
      de TBT y no atribuye causalidad.
- [x] AC4: Se conserva el digest frontend activo, staging termina `healthy`, no
      se alteran datos de negocio y el build normal queda restaurado; preflight
      local pasa.

## Resultado

Tres capturas recuperaron `timeToHeadersMs` desde `Network.Response.timing` y
`totalDurationMs` desde request start/finalización en los 36/36 requests. Las
respuestas fueron de red y HTTP 200. Se conserva la clasificación separada de
evento invertido, sin confundir esos tiempos con TBT o INP. Ver
[`evidencia/resultado.md`](./evidencia/resultado.md).

## Restricciones

Constitución V. Solo requests locales `/api` clasificados por OpenAPI. Los
timestamps quedan en memoria; serializar enums, recuentos y duraciones
derivadas que pasan sus invariantes. Ningún cambio de runtime ni contrato.

## Trazabilidad

- Tests: `frontend/scripts/profile-worker-production.test.mjs`.
- Antecedentes: Specs 087 y 104.
- Evidencia: `./evidencia/resultado.md` y tres perfiles saneados.
- Bitácora: `.jules/bolt.md`.
