# Spec 061: Skip Empty Cache Check Without Sync Marker

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En el arranque frío de Time Control, la lectura de las stores críticas duró una mediana de 956,7 ms en tres sesiones de staging ([resultado de Spec 060](../060-time-control-sync-step-timings/evidencia/resultado-2026-10-24.md)). Sin `lastSyncTime`, ese resultado no puede cambiar la condición `isCacheEmpty && since`; aun así, el flujo espera a que IndexedDB abra y ejecute ambas lecturas antes de continuar.

## Alcance

Dentro:

- Omitir la lectura de las stores de empleados y usuarios cuando no existe una marca de sincronización anterior.
- Conservar ambas lecturas y la rama de caché vacía cuando sí existe una marca anterior.
- Probar el arranque frío en tres contextos de staging y comparar duración del overlay con Spec 060.

Fuera (explícito):

- Cambiar validación de instancia, orden o contenido de los pasos de sincronización.
- Permitir interacción antes de completar la sincronización inicial.
- Cambiar IndexedDB, APIs, datos de staging o contratos.

## Criterios de aceptación

- [x] AC1: Given que `lastSyncTime` es nulo, when se ejecuta la sincronización inicial, then no se consulta ninguna store crítica y siguen ejecutándose las cinco acciones de sync.
- [x] AC2: Given que existe una marca previa, when corre la sincronización, then se consultan ambas stores críticas en paralelo y se conserva el comportamiento existente si las dos están vacías.
- [x] AC3: Given tres contextos fríos de staging, when se abre Time Control, then el probe no registra la fase `cache-check`, registra validación y las cinco acciones en orden, conserva el overlay bloqueante y guarda tiempos comparables con Spec 060.
- [x] AC4: El test de estado, typecheck, lint, formato, `spec:check`, `docs:check` y preflight pasan; el frontend staging queda reconstruido y saludable.

## Restricciones

Sin cambios de API, SDK, base de datos ni ADR. La omisión solo aplica cuando `since` es nulo, condición en la que la lectura no altera la decisión existente. Rollback: restaurar la lectura incondicional de stores en `runSync` y retirar las aserciones de la Spec 061.

## Trazabilidad

- Tests: `frontend/src/tests/state/syncSlice.test.ts`; probe frío en `frontend/e2e/performance.spec.ts`.
- Evidencia: `evidencia/resultado-2026-10-24.md` y `evidencia/time-control-sync-phase-diagnostics.json`.
- Registro de aprendizaje: `.jules/bolt.md`.
