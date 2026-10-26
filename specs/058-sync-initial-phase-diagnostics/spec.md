# Spec 058: medir fases de sincronización inicial

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En tres arranques fríos de Control horario, el overlay permanece sobre la ruta desde aproximadamente 0,95 s hasta 1,9–2,1 s. Quitar el fade y los pulsos no superó el gate de LCP de Spec 057. `syncSlice.runSync` espera en serie los refrescos de usuarios, empleados, configuración, horarios y medidores (`frontend/src/store/slices/syncSlice.ts`), pero la batería actual no muestra qué pasos ni solicitudes prolongan el bloqueo.

## Alcance

Dentro:

- Instrumentar el probe Playwright para capturar los mensajes y porcentajes de cada paso, inicio/fin del overlay y requests API con ruta sin query, método, estado y duración.
- Repetir tres sesiones autenticadas nuevas de Control horario con el perfil móvil CPU 4× y comparar tiempos de pasos, requests y retirada del overlay.
- Guardar los tres registros crudos y una lectura que distinga correlación temporal de causalidad.

Fuera (explícito):

- Cambiar el orden, concurrencia, condiciones o datos de sincronización; modificar `syncSlice`, `authSlice` o `isInitialSync`.
- Permitir interacción antes de terminar la sincronización.
- Cambiar API, SDK, almacenamiento o configuración del staging.
- Afirmar que un request causó la demora solo porque sus tiempos se solapan.

## Criterios de aceptación

- [x] AC1: En tres contextos nuevos, el probe registra el estado inicial `lastSyncTime`, FCP/LCP, transiciones de paso/progreso, visibilidad del overlay y tiempos de inicio/fin de requests API sin guardar query strings.
- [x] AC2: En las tres muestras, el overlay conserva cobertura e hit-test, mantiene spinner y progreso, y se retira solo después de terminar el sync y persistir `lastSyncTime`.
- [x] AC3: El resultado resume las solicitudes más lentas y los cambios de paso observados. Si React agrupa cambios de estado y no deja medir cada `await`, lo indica explícitamente y no atribuye causalidad por solapamiento.
- [x] AC4: Se versionan los tres registros crudos y un resumen enlazado al commit, ruta, viewport y throttle.
- [x] AC5: Typecheck, lint de frontend, formato, `spec:check`, `docs:check` y preflight pasan; no hay cambios productivos ni de contrato.

## Restricciones

- Instrumentación solo en pruebas; no añadir marcas ni logging al runtime.
- Conservar la privacidad de requests registrada por la batería: omitir query strings y cuerpos.
- No alterar la sincronización ni su cobertura visual.

## Trazabilidad

- Tests que lo probarán: probe de sincronización inicial en `frontend/e2e/performance.spec.ts`, ejecutado contra staging con tres contextos limpios.
- Docs a actualizar: `./evidencia/resultado-2026-10-24.md` y `.jules/bolt.md`.
