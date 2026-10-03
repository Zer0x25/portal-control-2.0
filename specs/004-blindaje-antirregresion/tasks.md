# Tareas 004: Blindaje antiregresión

Spec: `./spec.md`. Plan: `./plan.md`. Estado: En ejecución.

## Fase 1 — Staging + baseline e2e

- [x] 1.1 Staging arriba (`compose.staging.yaml`) con health OK.
- [x] 1.2 Smoke headless contra staging verde.
- [x] 1.3 Baseline: correr cada spec e2e, registrar pasa/falla + causa.
      Resultado 2026-10-03 (staging prod-build, CI=1: 1 worker + 2 retries):
      12 failed / 3 passed / 1 skipped en 15.5 min. TODOS los fallos son
      timeouts de login/boot (budgets 10-15s vs boot real ~31s en staging,
      ~14s en dev); cero fallos en aserciones de negocio porque ningún spec
      llega a ellas. Smoke (budget 60s) verde en dev y staging.

## Fase 2 — Cobertura unitaria

- [x] 2.1 Medir cobertura por archivo, elegir 3 servicios críticos.
      Elegidos backend: `ShiftValidator` (361 líneas, 0%), reglas de
      scheduling (~0%), `AuthService` (~1%). Frontend: pendiente de medir.
- [x] 2.2 Unit tests nuevos hasta subir thresholds (backend + frontend).
      Hecho 1/3: `tests/unit/shiftValidator.test.ts` (14 tests, métodos
      puros + conflictos con fixtures, fechas relativas anti-calendario).
      Hecho 2/3: `tests/unit/domainRules.test.ts` (11 tests: punch-flow,
      autocierre, colación incompleta, prioridades leave/feriado/turno y
      wrap de ciclo; todo puro sin DB).
      Hecho 3/3: `src/utils/dateUtils.test.ts` +11 tests frontend
      (helpers puros; 2 supuestos TZ corregidos a asserts robustos).
- [x] 2.3 Ratchets actualizados, `validate:ci` verde, commit.
      Hecho parcial: backend 15/18/8/14 -> 16/19/9/15 (medido
      18.13% L / 20.93% F / 11.25% B / 17.49% S), luego -> 17/20/10/16
      (medido 18.96% L / 21.77% F / 12.51% B / 18.41% S).
      Frontend 15/12/12/15 -> 16/13/13/15 (medido 17.83% L /
      14.73% F / 14.61% B / 17.42% S; statements sin margen para 16).

## Fase 3 — Reescritura e2e

- [ ] 3.1 Reescribir specs podridas contra UI actual.
- [ ] 3.2 Suite completa verde en local.
- [ ] 3.3 Decisión: gatear en CI o no (costo en minutos).
