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

- [x] 3.1 Reescribir specs podridas contra UI actual.
      Causas raíz (todas verificadas contra `src/`, ninguna suposición):
      HashRouter (`/#/` faltante en goto), presupuestos 10-15s vs boot
      real ~14-30s, tabs en Title Case con uppercase solo-CSS, redirects
      (`/audit-logs`, `/admin/tools` -> governance `?tab=`), LeaveManager
      tras tab Permisos (`?tab=leaves`), saludo partido en dos nodos +
      display-name (no username), auditoría con divs virtualizados (no
      trs), `Usuarios` ambiguo con sidebar colapsado, `integrity-status`
      envuelto en `data`, OmniSearch inexistente (test eliminado,
      reemplazado por tab-switch perf), attendance no-idempotente
      (reset vía API + ciclo entrada->salida), workers paralelos
      expulsándose (límite 1 sesión Usuario + rate-limit login).
- [x] 3.2 Suite completa verde en local.
      2026-10-03, dev (`compose.dev.yaml`), serial (`workers: 1`
      fijado en `playwright.config.ts`): **16 passed / 0 failed en
      5.0 min** (`/tmp/e2e-final.log`, EXIT 0). Commits: helper +
      user-flows, admin-tools, governance-hub, data-validation,
      performance+workers.
- [x] 3.3 Decisión: gatear en CI o no (costo en minutos).
      Decisión: NO gatear la suite completa; solo el smoke sigue
      gateado (spec 003 G-03). La suite completa (5 min serial +
      stack dev con seed) corre local pre-release. Reevaluar si baja
      de 3 min o aparece runner con caché.

## Post-004 — Eficiencia + paridad staging (2026-10-03)

- [x] E1: `loginFast` (auth por API + siembra de `sessionStorage`,
      replica `_verifyAuth`): suite dev 5.0 min -> 1.2 min, 16/16.
      Smoke mantiene login UI real como gate.
- [x] E2: crash React #185 en dashboard (selector objeto zustand sin
      `useShallow` en `useQuickNotes`, idem latente en `useTimeControl`):
      loop bajo writes del sync inicial -> ErrorBoundary. Fix con
      `useShallow`, verificado con sonda (seeded session a `/#/dashboard`).
- [x] E3: seed worker en staging (`SEED_E2E_USERS=1` opt-in,
      `E2E_WORKER_PASSWORD`): prod-mode solo creaba admin, worker e2e
      imposible. No-destructivo, solo staging local.
- [x] E4: suite completa contra staging (build prod) 16/16 en 1.1 min
      (~2s/test vs ~3-4s en dev: confirma que Vite dev penaliza).
      Nota: `juan.perez` se había bloqueado 21h por reintentos contra
      password inexistente; restart del backend limpia limiters en memoria.
