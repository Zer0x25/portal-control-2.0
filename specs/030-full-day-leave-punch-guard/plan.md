# Plan 030: Full-Day Leave Punch Guard

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. `PunchService.handlePunch`: tras resolver `employee`, consultar `tx.leaveRecord` vigente hoy (`startDate <= serverDate <= endDate`, `isDeleted: false`) → `throw ON_LEAVE`. Tras el `findFirst` abierto, si `record.date !== serverDate`: futura (`>`) → `null`; pasada con estado de licencia (`Vacaciones`, `Permiso Especial`, `Licencia Médica`, `DiaLibre`) y sin punches → `null`. Huérfanas con punches conservan flujo actual + `shouldAutoClose` (AC1, AC2).
2. `flows.ts`: mapear `ON_LEAVE` a 400 con mensaje ES; en `save`/`bulk` rechazar `date > businessDate(now)` con `ValidationError` (después del chequeo de periodo cerrado para no alterar su precedencia) (AC1, AC3).
3. `CorrectionRequestSchema`: `refine` que rechaza `requestedValue > now`; `TimeRecordService.resolveAnomaly`: virtual con `date > hoy Chile` → `AppError 400 FUTURE_DATE`, mapeado a `ValidationError` en `flows.resolve` (AC4).
4. `users/http/routes.ts`: guard `reader` (`Administrador`, `Supervisor_Elevado`) solo para `GET /api/users`; POST/PUT/DELETE con `admin` (AC5). Contratos de ruta solo exigen auth+validación, sin cambio.
5. Frontend: kiosko prefiere mensaje backend si menciona licencia/vacación/permiso (AC7); modal corrección valida futuro en controller + `max` en el input (AC4); user-management muestra vacío informativo y acciones con `focus-within` (AC6).
6. Tests primero (TDD): flujos save/bulk futuro + mapping ON_LEAVE, schema corrección futura, toast licencia en kiosko, vacío en user-management, controller rechaza futuro.

## Archivos a tocar

| Archivo                                                                            | Cambio                                                           |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `backend/src/services/PunchService.ts`                                             | Guard licencia, ignorar filas otros días, `logger` por `console` |
| `backend/src/modules/records/application/flows.ts`                                 | Mapeo ON_LEAVE, guards futuro en save/bulk/resolve               |
| `backend/src/models/schemas/time-correction.schemas.ts`                            | `refine` futuro en `CorrectionRequestSchema`                     |
| `backend/src/services/TimeRecordService.ts`                                        | Guard futuro en `resolveAnomaly` virtual                         |
| `backend/src/modules/users/http/routes.ts`                                         | `reader` para GET, `admin` para writes                           |
| `backend/tests/unit/recordFlows.test.ts`                                           | AC1-mapping, AC3                                                 |
| `backend/tests/unit/correctionSchemas.test.ts`                                     | Nuevo: AC4                                                       |
| `frontend/src/features/kiosk/hooks/useKioskData.ts`                                | Mensaje licencia (AC7)                                           |
| `frontend/src/features/worker-portal/hooks/useCorrectionRequestModalController.ts` | Guard futuro (AC4)                                               |
| `frontend/src/features/worker-portal/components/CorrectionRequestModal.view.tsx`   | `max` datetime-local (AC4)                                       |
| `frontend/src/features/user-management/views/UserManagement.view.tsx`              | Vacío + foco (AC6)                                               |
| Tests frontend kiosk / user-management / modal                                     | AC4, AC6, AC7                                                    |
| `specs/030-full-day-leave-punch-guard/*`                                           | Spec/plan/tasks                                                  |

## Contratos afectados

- `POST /api/records/punch`: nuevo 400 `ON_LEAVE` (mensaje ES). Sin cambio de schema.
- `POST /api/records`, `/bulk`: nuevo 400 fecha futura. Sin cambio de schema.
- `POST /api/corrections`: nuevo 400 corrección futura (refine zod).
- `POST /api/records/:id/resolve-anomaly`: nuevo 400 fecha futura virtual.
- `GET /api/users`: 403 → 200 para `Supervisor_Elevado`. Sin cambio de schema.

## Riesgos y rollback

- Riesgo: punch legítimo sobre día con licencia que el supervisor quiere pisar. Mitigación: el supervisor elimina la licencia primero (`LeaveService.delete` limpia filas sin punch); el mensaje lo indica.
- Riesgo: `CorrectionRequestSchema.refine` con `Date.now()` rompe tests con fechas fijas futuras. Mitigación: correr suite de correcciones y ajustar fixtures a pasado.
- Rollback: revert por archivo; cada guard es independiente.

## Verificación

- Backend: `npx vitest run tests/unit/recordFlows.test.ts tests/unit/correctionSchemas.test.ts tests/unit/domainRules.test.ts` + `npm run check` + `npm run lint`
- Frontend: `npm run test:run -- src/tests/features/kiosk src/tests/features/user-management` + `npm run check` + `npm run lint`
- Preflight raíz + `npm run spec:check` + `npm run docs:check`
