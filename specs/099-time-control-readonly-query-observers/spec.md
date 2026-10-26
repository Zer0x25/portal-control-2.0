# Spec 099: Time Control Readonly Query Observers

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

El perfil CDP de tres visitas de Control horario ubicó `useTimeRecordMutations`
entre las funciones de aplicación repetidas (mediana muestreada: 11,47 ms).
`TimeRecordFilters` y `useClockingPanel` llaman `useTimeRecords` solo para leer
la consulta; el hook genérico también monta observadores de mutación que esos
consumidores no usan.

## Alcance

Dentro:

- Evitar montar observadores de escritura desde los dos consumidores de solo
  lectura, conservando opciones, claves y datos de query.
- Añadir perfiles React de desarrollo para aislar panel, filtros e historial.
- Permitir que `measure:renders` elija un puerto Vite libre.

Fuera (explícito):

- Cambiar comportamiento de API, filtros, paginación o datos.
- Retirar mutaciones que sí consumen acciones y modales de Control horario.
- Modificar `TimeControl.view.tsx`, protegida por política UI-PROTECTED.

## Criterios de aceptación

- [x] AC1: Los consumidores de solo lectura llaman `useTimeRecordsQuery` con los mismos parámetros que antes y no instancian `useTimeRecordMutations`.
- [x] AC2: Las pruebas de filtros y marcación conservan resultados visibles, estados de carga y habilitación de consultas por viewport/selección.
- [x] AC3: Tres visitas de producción registran 11–12 requests API, sin respuestas fallidas; el perfil React separa panel, filtros e historial.

## Restricciones

Constitución V: refactor acotado y documentado aquí. Sin cambios de contrato,
persistencia ni comportamiento de negocio. Rollback directo de los dos
consumidores a `useTimeRecords`.

## Trazabilidad

- Tests que lo probarán: `TimeRecordFilters.spec.tsx` y `ClockingPanel.spec.tsx`.
- Docs a actualizar: evidencia de medición y `.jules/bolt.md`.
