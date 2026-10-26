# Plan 099: Time Control Readonly Query Observers

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Actualizar primero las pruebas de filtros y marcación para comprobar el hook
   de query directo y la preservación de sus parámetros.
2. Cambiar ambos consumidores de solo lectura a `useTimeRecordsQuery` y derivar
   la misma página de registros/estado de carga que antes.
3. Añadir scopes React de desarrollo para los bloques visibles y permitir un
   puerto Vite configurable en `measure:renders`.
4. Repetir tres navegaciones frías contra staging; comparar scopes y requests
   con Spec 098. No atribuir ganancias si los rangos se solapan.
5. Completar pruebas focalizadas, preflight y bitácora de rendimiento.

## Archivos a tocar

| Archivo                                                                                 | Cambio                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `frontend/src/features/time-control/components/TimeRecordFilters.tsx`                   | Consulta directa de solo lectura y scope React de desarrollo. |
| `frontend/src/features/time-control/hooks/useClockingPanel.ts`                          | Consulta directa de solo lectura.                             |
| `frontend/src/features/time-control/components/ClockingPanel.tsx`                       | Scope React de desarrollo, sin wrapper en producción.         |
| `frontend/src/features/time-control/components/DeferredTimeRecordTable.tsx`             | Scope React de desarrollo, sin wrapper en producción.         |
| `frontend/scripts/measure-renders.mjs`                                                  | Puerto Vite seleccionable por `E2E_VITE_PORT`.                |
| `frontend/src/tests/components/time_control/{TimeRecordFilters,ClockingPanel}.spec.tsx` | Expectativas de query actualizadas.                           |
| `.jules/bolt.md`                                                                        | Resultado y siguiente candidato medido.                       |
| `specs/099-time-control-readonly-query-observers/`                                      | Criterios, tareas y evidencia.                                |

## Contratos afectados

Ninguno. Se conservan `queryKeys.timeRecordsList`, filtros y paginación.

## Riesgos y rollback

El riesgo es cambiar los parámetros por defecto al dejar el hook genérico. Los
tests comparan opciones explícitas; la captura E2E verifica cantidad y estado de
requests. Se revierte usando `useTimeRecords` en los dos sitios.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npx vitest run src/tests/components/time_control/TimeRecordFilters.spec.tsx src/tests/components/time_control/ClockingPanel.spec.tsx
E2E_VITE_PORT=5174 E2E_API_URL=http://127.0.0.1:8080/api VITE_API_URL=/api VITE_PROXY_TARGET=http://127.0.0.1:8080 fnm exec --using=26.10.0 -- npm run measure:renders -- --route=time-control --viewport=mobile --cpu-throttle=4 --samples=3
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run lint
cd ..
npm run spec:check
npm run docs:check
npm run lint:budget
node .agents/skills/ci-preflight/scripts/preflight.cjs
```
