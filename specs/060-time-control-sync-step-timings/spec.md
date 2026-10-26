# Spec 060: Time Control Sync Step Timings

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En las tres capturas frías de Spec 058, el primer texto de sincronización apareció cerca del final y las etapas quedaron agrupadas en pocos milisegundos. `/api/health` tardó 295–349 ms, y antes de la segunda oleada hubo 300–556 ms sin solicitudes API observadas. El probe no distingue validación, lectura de IndexedDB y cada `step.action` de `runSync`.

Hace falta medir esos límites para escoger la siguiente optimización por espera real, no por correlación de requests.

## Alcance

Dentro:

- Añadir medición optativa alrededor de `validateInstanceId`, la comprobación de las stores críticas de IndexedDB y cada paso ejecutado por `runSync`.
- Activarla solo desde el probe E2E y guardar fase, nombre, duración y resultado.
- Repetir tres contextos fríos en staging y guardar evidencia resumida y cruda.

Fuera (explícito):

- Cambiar el orden, concurrencia, condiciones o resultado de sincronización, o permitir interacción antes de terminarla.
- Registrar IDs, nombres de usuarios, query strings, bodies o datos locales.
- Cambiar endpoints, SDK, base de datos o datos de staging.

## Criterios de aceptación

- [x] AC1: Con el flag diagnóstico apagado no se emiten eventos ni se escriben marcas; con el flag encendido se emite duración para validación, lectura de stores y cada paso ejecutado, incluso si un paso falla.
- [x] AC2: Tests unitarios demuestran que la instrumentación está apagada por defecto y que, al habilitarla, los eventos contienen solo fase, nombre, duración y resultado.
- [x] AC3: En tres contextos fríos de staging el probe conserva cobertura/hit-test del overlay y registra todas las fases esperadas en orden, sin IDs ni datos de request; se guardan los registros y un resumen con medianas y rangos.
- [x] AC4: Typecheck, lint, formato, `spec:check`, `docs:check` y preflight pasan.

## Restricciones

No se cambia el comportamiento funcional. El flag se activa solo mediante `page.addInitScript` del test y por defecto permanece apagado; los eventos existen en memoria del navegador únicamente durante la captura. Sin migraciones ni contratos. Rollback: quitar el helper, el flag y las aserciones de prueba.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/state/syncSlice.test.ts` y el probe de sync frío en `frontend/e2e/performance.spec.ts`.
- Docs a actualizar: resultado/evidencia de esta spec y `.jules/bolt.md`.
