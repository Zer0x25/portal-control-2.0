# Spec 086: correlacionar tareas largas de Control horario

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

En la imagen de staging `sha256:fcdcc13a…`, Control horario tuvo TBT mediano
de 349,5 ms en cinco corridas Lighthouse. Los perfiles CPU previos ubican gran
parte de las muestras en React, pero no enlazan cada tarea larga con el código
fuente que la ejecutó. Sin límites de tareas y símbolos fuente coincidentes,
no hay evidencia para atribuir o cambiar un componente.

## Alcance

Dentro:

- Capturar eventos `RunTask` del hilo principal Chromium y las llamadas JavaScript
  anidadas durante el perfil de producción de Control horario.
- Resolver símbolos a rutas fuente usando mapas que correspondan exactamente a
  los assets de staging; persistir solo tareas y frames sanitizados.
- Probar el filtrado, la correlación temporal, el resumen y la privacidad de la
  salida; comparar candidatos entre tres capturas.

Fuera (explícito):

- Cambiar el código funcional del frontend, API, autenticación o datos.
- Persistir trazas crudas, URLs, parámetros, credenciales, contenido de
  respuestas o eventos de negocio.
- Presentar la captura CDP como TBT Lighthouse o INP de usuarios reales.

## Criterios de aceptación

- [x] AC1: El perfilador resume las tareas `RunTask` de 50 ms o más en el hilo
      principal y asocia las llamadas JS solapadas con ruta, función y línea
      fuente saneadas cuando exista un mapa exacto.
- [x] AC2: Tres capturas de Control horario verifican imagen y hashes de assets,
      corren con CPU 4× y viewport 412×823, guardan solo resúmenes y restauran
      el build normal incluso ante fallos.
- [x] AC3: Pruebas sintéticas cubren límites, asociación temporal, exclusión de
      otros hilos, mapa ausente y rechazo de campos o URLs sensibles.
- [x] AC4: El informe identifica candidatos repetidos solo si aparecen en al
      menos dos de tres capturas y explica que tiempo de evento CDP no se suma
      ni sustituye TBT/INP; no cambia runtime sin evidencia causal.

## Restricciones

Constitución V: spec, plan y tareas preceden a la implementación. Mantener
aislamiento de secretos, cero `any` en runtime, no alterar datos de staging y
restaurar el build normal al terminar. El usuario autorizó el diagnóstico; no
hay autorización para restablecer cuentas o datos de prueba compartidos.

## Trazabilidad

- Tests que lo probarán: `frontend/scripts/profile-worker-production.test.mjs`.
- Docs/evidencia: `./plan.md`, `./tasks.md`, `./evidencia/resultado.md` y
  `.jules/bolt.md`.
