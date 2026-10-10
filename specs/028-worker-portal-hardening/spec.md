# Spec 028: Worker Portal Hardening

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-10
- ADR relacionado: N/A

## Problema

El Worker Portal (`src/features/worker-portal/`) presenta fallas funcionales detectadas en uso real y cobertura crítica (hook `useWorkerPortalData.ts`: 1.38% líneas, 0% funciones/ramas; vista 48%/22% ramas; modal 25%). Evidencia:

- `WorkerPortal.view.tsx:158`: `if (!currentUser || (isLoadingEmployees && !!employee))` muestra "Error de Configuración" durante la resolución cuando `employee` aún es null (lógica invertida, deberia ser `&& !employee`).
- `useWorkerPortalData.ts:32-36,184-207`: `useTimeRecords({pageSize:-1, filters:{}})` sin filtro por mes ni empleado; `enrichedRecords` filtra solo por `employeeId`, ignora `selectedMonth` → selector de mes es decorativo (solo afecta export PDF).
- `useWorkerPortalData.ts:151-170`: `status` deriva de `recentRecordData[0]` global sin filtrar por empleado/fecha → contaminación cruzada entre empleados.
- Contrato `forcedType` colación inconsistente transversal: frontend envía `inicio_colacion`/`fin_colacion` (snake, `useWorkerPortalData.ts:248-258`, idem `useClockingPanel.ts:140-149`, `useKioskData.ts:239-243`, `useTimeRecordActions.ts:24-32`), `timeRecordService.ts:74-88` normaliza a camel `inicioColacion`/`finColacion` (contrato API `PunchSchema`), pero `backend/src/domain/attendanceRules.ts:36-44` compara contra snake → los forzados de colación caen a flujo automático y los guards (`ALREADY_BREAK_STARTED`, `NO_BREAK_STARTED`) no se aplican.
- `WorkerPortal.view.tsx:150`: botón `[Corregir]` con `opacity-0 group-hover/cell:opacity-100` → inaccesible en táctil/teclado (patrón repetido transversalmente en `TimeRecordRow.tsx`, `EmployeeListCard.tsx`, etc.).
- `useWorkerPortalData.ts:277-278,236`: `catch` de `handleClockingAction` solo `console.error` sin toast; `console.error` en producción viola `AGENTS.md` (usar `logger`).

## Alcance

Dentro:

- Worker Portal frontend: view, container, `useWorkerPortalData`, `useCorrectionRequestModalController`, modal view/container.
- Tests antiregresión y de cobertura para los bugs anteriores.
- Documentación del hallazgo transversal (kiosk, time-control, backend domain) sin fix backend en esta spec.

Fuera (explícito):

- Fix backend `attendanceRules.ts` (se registra como deuda para spec backend aparte).
- Cambios visuales del design system.
- E2E staging (suite ya existe; se agregan asserts unitarios/integración).

## Criterios de aceptación

- [ ] AC1: Con `isLoadingEmployees=true` y `employee=null`, la vista muestra "Cargando..." y no "Error de Configuración".
- [ ] AC2: `enrichedRecords` solo contiene registros del empleado y del `selectedMonth` (YYYY-MM); cambiar mes cambia el listado.
- [ ] AC3: `status` se deriva del último registro del empleado actual (no del primero global); con records de otro empleado, el estado no se contamina.
- [ ] AC4: `handleClockingAction("colacion_inicio"|"colacion_fin")` invoca `punch` con tipo canónico camel `inicioColacion`/`finColacion` (contrato API), verificado por test.
- [ ] AC5: El botón `[Corregir]` es visible/foco sin hover (clase sin `opacity-0` exclusivo, con `focus-visible`/`focus-within`).
- [ ] AC6: Fallo de `punch`/`export PDF` muestra toast de error y usa `logger`, no `console.error` en el hook.
- [ ] AC7: Cobertura worker-portal: `useWorkerPortalData` >50% líneas y vista >70% líneas, sin bajar ratchets globales (`vite.config.ts` thresholds intactos).

## Restricciones

- Constitución I–V; Fastify único servidor (sin cambios backend aquí).
- Cero `any` en `src/`, ESLint 0 warnings (`lint-budget.json` 0/0), `npm run check` limpio.
- Rollback: revert de los 2 archivos fuente + tests.

## Trazabilidad

- Tests: `src/tests/features/worker-portal/WorkerPortalView.regression.test.tsx`, `useWorkerPortalData.test.tsx`, ampliación `useCorrectionRequestModalController.test.ts`.
- Docs: esta spec + `docs/adr/` solo si se promueve decisión de contrato camel.
