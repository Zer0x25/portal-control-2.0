# Plan 028: Worker Portal Hardening

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Fijar condición de carga en `WorkerPortal.view.tsx` (`isLoadingEmployees && !employee` → loading) con test antiregresión (AC1).
2. Filtrar `enrichedRecords` por `selectedMonth` (prefijo `YYYY-MM` sobre `record.date`) y derivar `status` desde el último registro del empleado (orden por `date`+timestamps, no `recentRecordData[0]` global) (AC2, AC3).
3. Enviar `forcedType` canónico camel desde `useWorkerPortalData` (`inicioColacion`/`finColacion`) para alinear con `PunchSchema`; documentar deuda backend snake vs camel (AC4).
4. Hacer visible el botón `[Corregir]` sin hover exclusivo (`focus-within`/`focus-visible`, opacity en foco) (AC5).
5. Toast + `logger` en errores de `punch`/`export` (AC6) y `sort` estable por `date` desc.
6. Subir cobertura con tests del hook (mocks de `useAuth`/`useEmployees`/`useTimeRecords`/`useScheduling`) y de la vista (AC7).

## Archivos a tocar

| Archivo                                                                                 | Cambio                                                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `frontend/src/features/worker-portal/views/WorkerPortal.view.tsx`                       | Fix loading (línea 158), botón corregir visible en foco                         |
| `frontend/src/features/worker-portal/hooks/useWorkerPortalData.ts`                      | Filtro mes, status por empleado, forcedType camel, logger+toast, sort por fecha |
| `frontend/src/tests/features/worker-portal/WorkerPortalView.regression.test.tsx`        | Nuevo: AC1, AC5 + ramas vista                                                   |
| `frontend/src/tests/features/worker-portal/useWorkerPortalData.test.tsx`                | Nuevo: AC2, AC3, AC4, AC6                                                       |
| `frontend/src/tests/features/worker-portal/useCorrectionRequestModalController.test.ts` | Ampliar: formato inválido, archivo >5MB, fallo base64                           |
| `specs/028-worker-portal-hardening/*`                                                   | Spec/plan/tasks                                                                 |

## Contratos afectados

- Ningún cambio de API: `POST /api/records/punch` sigue recibiendo `inicioColacion`/`finColacion` (canónico). Deuda backend: `attendanceRules.determineNextPunchAction` debe aceptar camel además de snake (fuera de alcance, se documenta).

## Riesgos y rollback

- Riesgo: cambiar `status` puede alterar habilitación de botones en E2E `user-flows.spec.ts` (flujo asistencia). Mitigación: mantener fallback `"fuera"` y correr ese E2E si hay backend staging.
- Rollback: `git revert` de los 2 archivos fuente; los tests nuevos quedan como documentación aunque se revierta.

## Verificación

- `npm run check` (frontend), `npm run lint`, `node ../scripts/lint-budget.cjs --only frontend`
- `npm run test:run -- src/tests/features/worker-portal --reporter=verbose`
- `npx vitest run --coverage` (verificar suba worker-portal, thresholds globales intactos)
