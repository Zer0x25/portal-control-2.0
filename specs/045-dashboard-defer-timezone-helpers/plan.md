# Plan 045: Defer Dashboard Timezone Helpers

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Mantener los formatos de negocio y extraer de la ruta inicial las dependencias de fecha con zona horaria que solo usan acciones puntuales.

1. Escribir primero una aserción E2E de que la carga fría del Dashboard no pide los chunks de fecha/formato y una prueba unitaria de parsing UTC sin DST.
2. Extraer un parser pequeño de fecha ISO a UTC para los cálculos síncronos de `useScheduling`; dejar intacta la API actual de `dateUtils` para otros consumidores.
3. Importar `dateUtils` y `formatters` de forma dinámica dentro de las acciones de archivar empleado e iniciar turno, justo antes de usarlas.
4. Ejecutar regresiones enfocadas, build y medición Lighthouse fría en staging; guardar conteos, bytes, métricas por corrida y la imagen usada.

## Archivos a tocar

| Archivo                                                         | Cambio                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| `frontend/src/utils/dateOnly.ts`                                | Parser ISO-UTC liviano para aritmética de días              |
| `frontend/src/utils/dateOnly.test.ts`                           | Paridad de fechas válidas, inválidas y cruce DST            |
| `frontend/src/hooks/useScheduling.ts`                           | Usar parser UTC liviano en diferencias de días              |
| `frontend/src/hooks/useEmployees.ts`                            | Cargar fecha de negocio al archivar, no al importar el hook |
| `frontend/src/hooks/useShiftManager.ts`                         | Cargar formateadores al iniciar un turno                    |
| `frontend/src/tests/hooks/useEmployeesArchiveLazyDate.test.tsx` | Verificar helper de fecha al archivar una asignación        |
| `frontend/src/tests/hooks/useShiftManagerLazyDates.test.tsx`    | Verificar fecha/hora del reporte al iniciar turno           |
| `frontend/e2e/performance.spec.ts`                              | Evitar regresión de chunks de inicio del Dashboard          |
| `specs/045-dashboard-defer-timezone-helpers/evidencia/`         | Resultado y perfiles de medición                            |

## Contratos afectados

No aplica: no cambia rutas, esquemas, OpenAPI, SDK ni migraciones.

## Riesgos y rollback

El parser nuevo podría cambiar el resultado de aritmética cerca de DST; la prueba explícita de marzo y la suite de programación lo detectan. Las acciones de archivo/inicio podrían perder una importación durante la primera invocación; se verificará que las utilidades y los servicios existentes conservan los mismos formatos. Rollback: revertir el commit de esta spec.

## Verificación

`cd frontend && npx vitest run src/utils/dateOnly.test.ts`, `cd frontend && npm run check && npm run lint && npm run build`, `cd frontend && E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api npx playwright test e2e/performance.spec.ts --project=functional`, tres Lighthouse fríos con `npx lhci autorun --config=.lighthouserc-dashboard-cold.json`, y los gates root `spec:check`, `docs:check`, `lint:budget` y preflight.
