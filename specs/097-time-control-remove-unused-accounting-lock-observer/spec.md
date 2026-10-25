# Spec 097: quitar observador contable sin consumidor

- Estado: Completado y verificado en staging
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

`useTimeControl` llama `useAccountingLockDateQuery()` sin leer el resultado
(`frontend/src/features/time-control/hooks/useTimeControl.ts:31`). El mismo
flujo sí consume esa consulta desde `useTimeControlModals` para bloquear acciones
y desde `useTimeControlData` para calcular `effectiveLockDate`. TanStack Query
deduplica el fetch, pero mantiene un observador y sus suscripciones adicionales.

## Alcance

Dentro:

- Retirar solo la suscripción sin consumidor en `useTimeControl`.
- Mantener intactos el bloqueo de edición/eliminación/comentarios y
  `effectiveLockDate`.
- Verificar el número de requests, errores y perfiles de CPU en staging.

Fuera (explícito):

- Cambiar query keys, política de cache, API, contratos o datos.
- Editar `TimeControl.view.tsx` (`UI-PROTECTED`) o mover las consultas que sí
  consumen fecha de cierre.
- Afirmar una reducción de TBT por eliminar un observador.

## Criterios de aceptación

- [x] AC1: `useTimeControl` no invoca `useAccountingLockDateQuery`; la prueba
      focalizada detecta el observador redundante antes del cambio.
- [x] AC2: `useTimeControlModals` mantiene el bloqueo de acciones de registros
      con fecha cerrada y `useTimeControlData` conserva un `effectiveLockDate`
      válido.
- [x] AC3: tres visitas frías a Control horario mantienen las 12 solicitudes
      API existentes y todas responden HTTP 200; no se agrega una lectura.
- [x] AC4: el perfil de producción registra tres muestras antes/después; se
      informa CPU activo, React core y tareas largas con sus rangos, sin afirmar
      una mejora global cuando las muestras se solapen.

## Restricciones

No cambian datos ni contratos. La fecha de cierre sigue siendo leída por los
consumidores actuales; rollback: restaurar la llamada sin uso en
`useTimeControl.ts`.

## Trazabilidad

- Tests: `frontend/src/tests/features/time-control/useTimeControl.test.ts`,
  `useTimeControlModals.test.ts` y `useTimeControlData.test.ts`.
- Evidencia final: `./evidencia/resultado.md` y perfil CDP posterior.
- Bitácora: `.jules/bolt.md`.
