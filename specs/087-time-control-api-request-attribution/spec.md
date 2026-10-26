# Spec 087: atribuir solicitudes API del arranque de Control horario

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

En la imagen actual, Lighthouse mide 349,5 ms de TBT mediano para Control
horario. Spec 086 encontró `apiClient.performRequest` dentro de tareas largas en
3/3 trazas, pero no conservó la ruta API ni el llamador. Las Specs 067–070
explicaron la validación de readiness, no el conjunto de solicitudes que se
dispara al montar la ruta; falta esa evidencia para elegir un cambio.

## Alcance

Dentro:

- Capturar, en memoria durante el perfil de producción existente, las
  solicitudes `/api` iniciadas por la navegación fría de Control horario.
- Registrar método, plantilla de ruta OpenAPI, estado, tiempos monotónicos,
  bytes recibidos y hasta cinco frames iniciadores resueltos con los source maps
  exactos de staging.
- Relacionar el inicio de cada request con límites `RunTask` del hilo principal
  usando relojes CDP, y resumir las coincidencias por ruta en tres capturas.
- Mantener diagnóstico fuera del runtime productivo y documentar candidatos y
  límites causales antes de proponer una optimización funcional.

Fuera (explícito):

- Cambiar `apiClient`, hooks, queries, sincronización, servidor, contratos HTTP
  o datos de staging.
- Hacer llamadas de medición adicionales; se observan las solicitudes del flujo
  actual de navegación.
- Guardar URLs, query strings, headers, credenciales, cuerpos, respuestas, IDs
  CDP de requests, valores de usuario o rutas no reconocidas.
- Presentar duración de request o tarea CDP como TBT/INP o afirmar causalidad.

## Criterios de aceptación

- [x] AC1: Tres capturas frías de Control horario recogen inicio, estado y
      terminación de las solicitudes API existentes, sin emitir solicitudes
      adicionales; los tiempos solo se publican cuando los eventos conservan
      orden monotónico válido.
- [x] AC2: Cada request se relaciona con el intervalo `RunTask` que contiene su
      inicio cuando coinciden los relojes; incluye la plantilla de ruta OpenAPI
      segura y frames iniciadores con source maps coincidentes.
- [x] AC3: Tests cubren conversión/unión temporal, orden inconsistente,
      plantillas con parámetros, URL desconocida, redirecciones, solicitudes
      incompletas y privacidad; la salida no contiene URL, query, headers,
      payload, response body ni request ID.
- [x] AC4: Resultado compara los mismos tres samples e imagen que Spec 086,
      resume request count, tiempos válidos/descartados, estado y callers
      repetidos, y no mezcla tiempos de red con tiempo CPU ni TBT.
- [x] AC5: El build normal queda restaurado, staging conserva su imagen y no
      cambian rutas HTTP, SDK, Prisma ni comportamiento de la aplicación. Un
      build externo solo se acepta si todos sus scripts coinciden con staging.

## Restricciones

Constitución V: spec, plan y tareas anteceden a la implementación. Limitar el
recolector a `127.0.0.1:8080` y a requests del mismo origen bajo `/api`; route
templates deben proceder de `backend/docs/swagger.json`. Procesar datos de red
en memoria y serializar solo campos permitidos. Usar timestamps monotónicos para
duraciones y coincidencias; no guardar trazas CDP crudas. No modificar cuentas
ni datos de staging.

El Dockerfile de frontend compila en `node:26-alpine`; si el build del host no
produce los mismos hashes, generar el build con mapas en esa base y pasar su
carpeta `dist/assets` con `--profiled-assets-dir`. El perfilador compara nombres
y contenido de todos los scripts antes de abrir el navegador.

## Trazabilidad

- Tests: `frontend/scripts/profile-worker-production.test.mjs`.
- Antecedentes: Specs 067–070 y 086.
- Evidencia: `./evidencia/resultado.md` y `./evidencia/time-control-api-requests-2026-10-25.json`.
- Bitácora: `.jules/bolt.md`.
