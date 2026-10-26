# Spec 104: Diagnosticar tiempos CDP de requests de Control horario

- Estado: Implementado (2026-10-26; 35/35 solicitudes mostraron response-after-completion)
- Autor: zer0x
- Fecha: 2026-10-26
- ADR relacionado: N/A

## Problema

Spec 087 observó 57/57 requests API completados, pero descartó sus duraciones
porque el recolector solo publicó `out-of-order`. La salida no identifica cuál
relación temporal falla; por eso seguimos sin poder distinguir una mala
alineación de eventos de red, una anomalía de ciclo de vida o un error del
recolector. Spec 103 confirma que `apiClient.performRequest` aparece en 3/3
perfiles, pero esa atribución no basta para escoger una optimización.

## Alcance

Dentro:

- Clasificar cada orden temporal inválido usando un conjunto cerrado de motivos
  y agregar sus recuentos por captura y endpoint OpenAPI.
- Conservar las duraciones como `null` cuando el orden no sea válido.
- Actualizar pruebas del perfilador y capturar tres navegaciones frías actuales
  de Control horario en staging.
- Guardar solo estados y categorías saneadas, sin valores temporales crudos.

Fuera (explícito):

- Cambiar el runtime del portal, solicitudes, hooks, API, OpenAPI, servidor o
  datos de staging.
- Corregir la semántica de tiempos hasta conocer qué condición falla; esa
  decisión queda para un siguiente experimento basado en la captura.
- Guardar trazas CDP crudas, timestamps, IDs de requests, URLs, headers,
  credenciales, cuerpos o respuestas.

## Criterios de aceptación

- [x] AC1: Si un response llega antes del inicio, una finalización llega antes
      del inicio, o un response queda después de la finalización, el perfilador
      conserva `out-of-order`, asigna el motivo enum correspondiente y cuenta
      ese motivo en el resumen sin serializar timestamps.
- [x] AC2: Tests cubren cada motivo, tiempos ordenados, response/finish ausente,
      agregación por endpoint y privacidad; nunca se publican duraciones
      inválidas ni IDs/URLs crudos.
- [x] AC3: Tres perfiles de staging documentan completadas, fallidas, válidas,
      no disponibles y cada motivo de orden inválido por endpoint; no se afirma
      latencia válida para capturas que no pasen las invariantes.
- [x] AC4: Se conserva el frontend activo de staging, vuelve a `healthy`, no hay
      cambios de runtime ni datos de negocio, el build normal queda restaurado
      y pasa el preflight local.

## Resultado

El recolector clasificó las 35 solicitudes completadas como
`response-after-completion`, en los 11 endpoints observados; no hubo fallos ni
otros motivos temporales. Por tanto, sus duraciones siguen anuladas. No cambia
el runtime ni se reporta una ganancia de rendimiento. La siguiente medición
debe comparar `Network.Response.timing` y el origen de respuesta antes de
seleccionar otra optimización. Ver [`evidencia/resultado.md`](./evidencia/resultado.md).

## Restricciones

Constitución V. El recolector se limita a `127.0.0.1:8080` y plantillas de
`backend/docs/swagger.json`. Mantener los timestamps crudos solo en memoria.
No modificar rutas HTTP, SDK, Prisma, base de datos, permisos ni marcaciones.

## Trazabilidad

- Tests: `frontend/scripts/profile-worker-production.test.mjs`.
- Antecedentes: Specs 086, 087 y 103.
- Evidencia: `./evidencia/resultado.md` y tres perfiles saneados.
- Bitácora: `.jules/bolt.md`.
