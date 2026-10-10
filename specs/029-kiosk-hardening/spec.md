# Spec 029: Kiosk Hardening

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-10
- ADR relacionado: N/A

## Problema

El modo kiosko (`src/features/kiosk/`) es el reloj físico principal y presenta pérdida de auditoría y fallos silenciosos detectados al probar tras el fix backend `cd5bb05`. Evidencia:

- `useKioskData.ts:34-36`: wrapper `punch(id, source, type?, _location?)` ignora el 4.º arg; `useTimeRecordsQuery.ts:187` solo acepta `{employeeId, source, forcedType}` → la geolocalización obtenida en `useKioskData.ts:232` nunca llega a `timeRecordService.punch()` ni a `PunchService.handlePunch(lat, lng)`. Coordenadas de entrada/salida siempre null en kiosko.
- `useKioskData.ts:268-269`: `catch` de `handleClockingAction` solo `console.error`, sin toast ni `logger`. Fallo de marcaje deja al usuario en `actions` sin feedback (mismo patrón AC6 de spec 028).
- `useKioskData.ts:143,158`: `console.error` directo en producción (usar `logger` según `AGENTS.md`).
- `Kiosk.view.tsx:367`: `if (isLoadingEmployees || false)` con `|| false` muerto.

## Alcance

Dentro:

- Kiosko frontend: `useKioskData`, `useTimeRecordsQuery` (mutación punch), `Kiosk.view`.
- Tests antiregresión para geolocalización, toast en fallo y logger.
- Sin cambio de API: `POST /api/records/punch` ya acepta `latitude/longitude`.

Fuera (explícito):

- Cambios backend (ya acepta camel+snake y lat/lng).
- Cambios visuales del design system.
- E2E staging (se mantiene `gap-coverage.spec.ts` kiosko smoke).

## Criterios de aceptación

- [ ] AC1: `handleClockingAction` reenvía `latitude/longitude` a `punchMutation` cuando hay posición; con `null` no envía coords y el marcaje sigue OK.
- [ ] AC2: Fallo de `punch` en kiosko muestra toast de error y usa `logger.error`, no `console.error` en el hook.
- [ ] AC3: Sin `console.error`/`console.log` en `useKioskData.ts`; condición de loading sin `|| false`.
- [ ] AC4: `npm run check`, `lint`, `lint-budget 0/0` limpios; tests kiosko verdes.

## Restricciones

- Constitución I–V; Fastify único servidor (sin cambios backend aquí).
- Cero `any` en `src/`, ESLint 0 warnings (`lint-budget.json` 0/0), `npm run check` limpio.
- Rollback: revert de los 3 archivos fuente + tests.

## Trazabilidad

- Tests: `src/tests/features/kiosk/useKioskData.regression.test.tsx`, ampliación `KioskView.test.tsx`.
- Docs: esta spec.
