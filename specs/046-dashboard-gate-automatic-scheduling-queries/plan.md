# Plan 046: Dashboard Gate Automatic Scheduling Queries

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

Mantener hooks incondicionales de React y pasar un gate explícito a los hooks de datos de `useScheduling`. En el layout, derivar la elegibilidad con la misma combinación rol/empleado/cargo usada por la automatización. Hacer que esta automatización espere a los datos necesarios antes de consumirlos o marcar el intento como completado. Los consumidores existentes que omiten la opción conservan el valor predeterminado habilitado.

1. Añadir a la prueba E2E una lista de rutas de programación que el Dashboard sin auto-inicio no debe solicitar; confirmar que falla con el baseline capturado.
2. Agregar opción `enabled` a los query hooks de configuración, patrones, asignaciones, feriados, permisos/licencias y solicitudes de corrección; combinarla con los gates de autorización/token existentes.
3. Permitir que `useScheduling` reciba una opción para desactivar su grupo de queries y exponer carga compuesta de los datos requeridos para calcular horario.
4. Derivar elegibilidad en `useLoginAutomations`, habilitar horario solo para los perfiles autorizados y esperar carga completa antes de consumirlo.
5. Validar tests focalizados, suite frontend, staging reconstruido, E2E de requests y tres registros de performance; conservar evidencia completa.

## Archivos a tocar

| Archivo                                                            | Cambio                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `frontend/src/hooks/useLoginAutomations.ts`                        | Gate de elegibilidad y espera de datos antes del auto-inicio                   |
| `frontend/src/hooks/useScheduling.ts`                              | Opción `enabled` y estado de carga de consultas de programación                |
| `frontend/src/hooks/queries/useConfigQuery.ts`                     | Opción `enabled` para los cinco datos de configuración usados por programación |
| `frontend/src/hooks/queries/useShiftPatternsQuery.ts`              | Gate `enabled` opcional                                                        |
| `frontend/src/hooks/queries/useAssignedShiftsQuery.ts`             | Gate `enabled` opcional                                                        |
| `frontend/src/hooks/queries/useHolidaysQuery.ts`                   | Gate `enabled` opcional                                                        |
| `frontend/src/hooks/queries/useLeavesQuery.ts`                     | Combinar gate de consumidor con autorización existente                         |
| `frontend/src/hooks/queries/useCorrectionRequestsQuery.ts`         | Combinar gate de consumidor con autorización existente                         |
| `frontend/src/tests/hooks/useLoginAutomations*.test.tsx`           | Regresión de elegibilidad y espera de datos                                    |
| `frontend/e2e/performance.spec.ts`                                 | Assert de ausencia de requests shell innecesarios y reporte                    |
| `specs/046-dashboard-gate-automatic-scheduling-queries/evidencia/` | Baseline, resultados y métricas por corrida                                    |
| `.jules/bolt.md`                                                   | Learning medido y siguiente candidato                                          |

## Contratos afectados

No aplica: solo opciones internas de hooks frontend; no cambian endpoints, esquemas, OpenAPI, SDK ni persistencia.

## Riesgos y rollback

El riesgo principal es ejecutar auto-inicio antes de que asignaciones, patrón, feriados y licencias carguen. El estado de carga compuesto y pruebas de la automatización protegen ese orden. Los queries siguen habilitados por defecto y respetan el gate de autorización actual. Rollback: revertir el commit de esta spec.

## Verificación

`cd frontend && npx vitest run <pruebas focalizadas>`, `cd frontend && npm run validate:ci`, `npm run preflight`, y `E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api npx playwright test e2e/performance.spec.ts --project=perf --no-deps --grep "Dashboard startup"`. Rebuild staging antes de la medición posterior al cambio.
