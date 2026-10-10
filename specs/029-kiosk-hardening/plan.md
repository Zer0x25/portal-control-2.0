# Plan 029: Kiosk Hardening

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Extender `punchMutation` en `useTimeRecordsQuery.ts` para aceptar `latitude/longitude` opcionales y reenviarlos a `timeRecordService.punch(employeeId, source, forcedType, geolocation)` (AC1). Sin cambiar la firma existente: campos opcionales.
2. En `useKioskData.ts`: el wrapper `punch` acepta `geolocation` y lo reenvía; `handleClockingAction` pasa el resultado de `getCurrentGeolocation()` (null-safe) (AC1).
3. `handleClockingAction` y `fetchRecords`/`handlePinConfirm`: sustituir `console.error` por `logger.error`; en `catch` de marcaje agregar `addToast(error, "error")` (AC2, AC3).
4. Limpiar `Kiosk.view.tsx:367` (`|| false`) (AC3).
5. Tests primero (TDD): mock de `punchMutation.mutateAsync`, `getCurrentGeolocation`, `logger` y `addToast` para verificar reenvío de coords, toast en fallo y ausencia de `console.error` (AC1-AC3).

## Archivos a tocar

| Archivo                                                              | Cambio                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `frontend/src/hooks/queries/useTimeRecordsQuery.ts`                  | `punchMutation` acepta y reenvía `latitude/longitude`      |
| `frontend/src/features/kiosk/hooks/useKioskData.ts`                  | Reenvía geolocation, `logger` + toast en errores           |
| `frontend/src/features/kiosk/views/Kiosk.view.tsx`                   | Quitar `\|\| false` en condición de loading                |
| `frontend/src/tests/features/kiosk/useKioskData.regression.test.tsx` | Nuevo: AC1 (coords), AC2 (toast+logger), AC3 (sin console) |
| `specs/029-kiosk-hardening/*`                                        | Spec/plan/tasks                                            |

## Contratos afectados

- Ningún cambio de API: `POST /api/records/punch` ya define `latitude/longitude` opcionales y `PunchService` los persiste en `entrada/salidaLatitude/Longitude`. Solo se cablea el frontend.

## Riesgos y rollback

- Riesgo: otros llamantes de `punchMutation` (worker-portal, time-control) pasan solo 3 campos; al ser opcionales los nuevos, no se rompen. Mitigación: correr tests de `useTimeRecordsQuery` y worker-portal.
- Rollback: `git revert` de los 3 archivos fuente; tests quedan como documentación.

## Verificación

- `npm run check` (frontend), `npm run lint`, `node ../scripts/lint-budget.cjs` / preflight
- `npm run test:run -- src/tests/features/kiosk --reporter=verbose`
- `npm run test:run -- src/tests/hooks/useTimeRecordsQuery.test.tsx --reporter=verbose`
