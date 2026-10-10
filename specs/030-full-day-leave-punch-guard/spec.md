# Spec 030: Full-Day Leave Punch Guard

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-10
- ADR relacionado: N/A

## Problema

Caso real (Ana Alonso Vargas): empleada con licencia/vacación/permiso del día intenta marcar en kiosko y recibe error de marcación activa; además logró una marcación a futuro para 2026-10-11 (hoy 2026-10-10). La página `/#/user-management` no lista usuarios, impidiendo ver su user ID. Evidencia:

- `backend/src/services/PunchService.ts:97-111`: la búsqueda de jornada abierta usa `status notIn [Completado, Ausente, Feriado]` sin filtro por fecha ni chequeo de `LeaveRecord`. Una fila materializada por licencia (`LeaveService.ts:318-335`, `status: Vacaciones/Permiso Especial`, sin punches) se trata como jornada abierta: el primer punch la sobrescribe (`status → Laborando`) y el segundo choca con `ACTION_ALREADY_TAKEN` (`PunchService.ts:256-257`, mensaje en `flows.ts:28`).
- `PunchService.ts:78-80` usa siempre `serverDate/serverTime`, así que la fila futura no vino del punch: `POST /api/records` y `/bulk` aceptan `date` arbitrario (`TimeRecordWriteSchema` solo regex en `time-correction.schemas.ts:5-17`; `flows.ts:87-109` solo chequea periodo cerrado; `validateEditableRecord` nunca compara `date <= hoy`; `createBulkRecords` ni valida). Vectores extra: corrección con `datetime-local` sin max (`CorrectionRequestModal.view.tsx:114-121`, `CorrectionRequestSchema.requestedValue` sin guard futuro) y `resolve-anomaly` virtual `MISSING-<emp>-<date>` (`TimeRecordService.ts:488-513`).
- `backend/src/modules/users/http/routes.ts:20-24`: `GET /api/users` exige `Administrador`, pero `frontend/src/App.tsx:263` permite también `Supervisor_Elevado` → 403 tragado en silencio (`userSlice.ts` solo `console.error`) y la vista (`UserManagement.view.tsx:270-282`) no tiene rama error/empty → página en blanco.

## Alcance

Dentro:

- Backend: guard de licencia en punch, ignorar filas de otros días en punch, rechazo de fecha futura en save/bulk/correcciones/resolve-anomaly, lectura de usuarios para Supervisor_Elevado.
- Frontend: mensaje de denegación por licencia en kiosko, max + guard futuro en modal de corrección, estado vacío y botones con foco en user-management.
- Tests antiregresión de cada guard.

Fuera (explícito):

- Limpieza de la fila futura existente de Ana (dato, se indica SQL).
- Cambios visuales del design system.
- Medio día / permisos parciales (las licencias son por día completo).

## Criterios de aceptación

- [ ] AC1: Punch con licencia/vacación/permiso vigente hoy devuelve 400 con mensaje claro y no modifica la fila de licencia.
- [ ] AC2: El punch de hoy ignora filas de otros días (futura y licencia pasada sin punches); la jornada huérfana con punches mantiene su autocierre.
- [ ] AC3: `save`/`bulk` rechazan `date` posterior a hoy (fecha negocio Chile).
- [ ] AC4: Crear corrección con `requestedValue` futuro se rechaza; `resolve-anomaly` virtual con fecha futura se rechaza.
- [ ] AC5: `GET /api/users` accesible para `Supervisor_Elevado` (solo lectura); POST/PUT/DELETE siguen admin-only.
- [ ] AC6: User-management muestra estado vacío informativo y acciones visibles con teclado; sin `console.error` nuevo.
- [ ] AC7: Kiosko muestra el mensaje de licencia en vez del genérico ante denegación ON_LEAVE.
- [ ] AC8: `check`, `lint`, `lint-budget 0/0`, suites unitarias verdes.

## Restricciones

- Constitución I–V; Fastify único servidor.
- Cero `any` en `src/`, ESLint 0 warnings, `npm run check` limpio.
- Rollback: revert por archivo; guards nuevos fallan cerrado solo en los vectores descritos.

## Trazabilidad

- Tests: `backend/tests/unit/recordFlows.test.ts` (AC1-mapping, AC3), nuevo `backend/tests/unit/correctionSchemas.test.ts` (AC4), `frontend/src/tests/features/kiosk/useKioskData.regression.test.tsx` (AC7), `frontend/src/tests/features/user-management/*` (AC6), ampliación modal controller (AC4).
- Docs: esta spec.
