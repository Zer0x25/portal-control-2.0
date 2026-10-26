# Plan 106: Evitar sincronizaciones redundantes del filtro rápido

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Medir el comportamiento actual con la prueba de renders y tres perfiles React
   de desarrollo, sin cambiar el runtime.
2. Compartir una comparación semántica de `is24h`, `desde` y `hasta` entre el
   efecto de sincronización y el manejador. El efecto actualiza solo los estados
   que difieren; el manejador vuelve sin escribir estado si la selección ya
   está activa y aplicada.
3. Verificar inicialización, selección rápida, cambio de fecha de negocio y
   filtros personalizados con tests del hook.
4. Repetir perfiles comparables, revisar el diff y aplicar los gates locales.
5. Construir/reconstruir staging y validar que la ruta mantiene sus filtros y
   el servicio queda saludable.

## Archivos a tocar

| Archivo                                                                  | Cambio                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `frontend/src/features/time-control/hooks/useTimeRecordFilters.ts`       | Evitar escrituras de estado cuando el rango rápido calculado ya coincide. |
| `frontend/src/tests/features/time-control/useTimeRecordFilters.test.tsx` | Regresión de renders, rango, cambio de fecha y estado personalizado.      |
| `specs/106-time-control-filter-sync-guard/*`                             | Criterios, plan, tareas y evidencia antes/después.                        |
| `.jules/bolt.md`                                                         | Registrar el resultado medido y el siguiente foco.                        |

## Contratos afectados

Ninguno. Sin cambios HTTP, OpenAPI, SDK, persistencia ni esquema.

## Riesgos y rollback

El riesgo es dejar de sincronizar fechas cuando cambia el reloj de negocio.
El efecto seguirá recalculando y actualizando el rango si alguno de sus tres
valores difiere. Revertir solo el guard si las pruebas de fecha o filtros no
conservan el contrato.

## Verificación

Desde `frontend/`: test focalizado de Vitest, `npm run check`, lint focalizado,
`npm run build` y tres perfiles con `measure-renders.mjs`. Desde la raíz:
`npm run spec:check`, `npm run docs:check` y
`node .agents/skills/ci-preflight/scripts/preflight.cjs`.
