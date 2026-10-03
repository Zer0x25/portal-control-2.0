# Plan 005: Flujos de testing

## Fase 1 — Carga pre-release (en curso)

1. Agregar `artillery` como devDependency del backend + script
   `load:staging` (config en `backend/load/`).
2. Escenario v1 (solo lecturas, sin ensuciar datos): login una vez por
   rol fuera de Artillery (rate-limit de login: 5/min por ip:user en
   prod), tokens por env; VUs solo GET (sync de dashboard: overview,
   employees, records del día, audit-logs, holidays, configs).
3. Dimensionar bajo el limiter global (5000/15min por IP): rampa
   corta, picos que imiten inicio de turno tras NAT de oficina.
4. Correr contra staging, registrar p95/error-rate/top lentos y
   abrir hallazgos (pool, limiters, endpoints) como follow-ups.
5. Escenario v2 (escrituras con cleanup) solo si v1 deja margen:
   ciclo fichaje con usuarios de carga dedicados + borrado posterior.

## Fase 2 — Accesibilidad

1. `axe-core` + `@axe-core/playwright` en frontend devDeps.
2. Spec `e2e/a11y.spec.ts`: login, dashboard admin, worker-portal;
   gatea 0 violaciones `critical`/`serious`.
3. Backlog justificado para lo no corregible en el acto.

## Fase 3 — Regresión visual

1. `toHaveScreenshot` en páginas críticas con `animations: "disabled"`.
2. Máscaras en zonas dinámicas (clima, timestamps, DNIs).
3. Baselines commiteadas; `npm run e2e:update-snapshots` documentado.

## Fase 4 — Aislamiento de datos

1. Testcontainers en `test:integration` (matriz: unit sin DB +
   integración con Postgres efímera).
2. Factorías e2e (helper `mkWorker()`/`mkAdmin()` vía API + cleanup
   en `afterEach`); retirar `describe.serial` si deja de hacer falta.

## Fase 5 — Supply chain

1. `renovate.json` + workflow con auto-merge de patch (CI verde).
2. Minor con auto-merge solo si `validate:ci` + smoke pasan; majors
   manuales como hoy.

## Riesgos

- Carga contra staging puede quemar rate-limits y dejar sesiones:
  dimensionar conservador y limpiar sesiones de carga al final.
- Screenshots flaky por fuentes/animaciones: congelar y enmascarar.
- Testcontainers en CI necesita Docker en el runner (ya lo hay por
  el smoke de compose.dev).
