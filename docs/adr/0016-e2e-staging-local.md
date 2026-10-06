# ADR-0016: Staging local como objetivo de QA y performance; e2e completo solo pre-release

- Estado: Aceptado
- Fecha: 2026-10-04
- Autores: zer0x
- Spec:related: specs/004, specs/005

## Contexto

spec 004 dejó la e2e completa verde contra staging (prod build) y la
dev stack inicial era lenta por Vite dev; spec 005 sumó baseline de
carga. Quedó implícito que la suite completa corre local contra el
stack `compose.staging.yaml`, pero ni el AGENTS.md ni un ADR lo
registraban como decisión, y las specs 004/005 quedaron con
"ADR relacionado: pendiente".

## Decisión

1. La suite e2e completa (16+3 specs) corre pre-release contra
   `compose.staging.yaml` con `npm run e2e:staging` (workers 4 local,
   CI en 1, proyecto perf dependiente en serie). CI solo gatea smoke
   por costo y por ser el único con presupuesto de tiempo acotado.
2. `compose.staging.yaml` requiere `--env-file .env.staging`
   explícito (sin él, interpolación falla). El seed de worker
   (`SEED_E2E_USERS=1`, password por `E2E_WORKER_PASSWORD`) está
   activo solo en staging local, nunca en prod real.
3. Los tokens de worker (`Usuario`) expiran ~2 min por diseño: el
   quiosco solo marca y consulta horario/registros. No se alarga el
   fallback `Usuario: 0.03h`.
4. Carga pre-release con `npm run load:staging` (Artillery,
   tokens fuera del escenario para no chocar con rate-limit de login).
5. Accesibilidad: axe-core gatea 0 críticas; serías/moderadas son
   backlog justificado hasta una decisión de diseño sobre la paleta
   Industrial.
6. Integración backend usa la BD de dev mapeada a host 5433
   (`TEST_DATABASE_URL`/derivado), nunca la de staging.

## Alternativas consideradas

1. E2E contra la pila local DB-only — descartada: Vite dev penaliza ~3-4s por
   test y oculta regresiones de build prod (como el #185 de zustand).
2. CI gateando la suite e2e completa — descartada por costo (stack
   completo + ~40s serían gate, pero el mismo criterio de 004: smoke
   basta como gate, full suite es red pre-release local).
3. Acortar o alargar tokens worker — descartada: decisión de producto
   tomada (corto por seguridad de quiosco).

## Consecuencias

Positivas:

- QA local reproduce el build prod real; hallazgos (zustand #185,
  login 31s, colisiones de sesión) fueron detectables solo así.
- Un solo comando por ambiente: `e2e:staging`, `load:staging`.

Negativas / costos aceptados:

- Staging compartido no da aislamiento per-run: usuarios fijos,
  `describe.serial` del rol Usuario, limpieza vía API. Aislamiento
  fino queda en fase 4 de spec 005 (Testcontainers / factorías).
- Rebuild de imagen staging ~8-9 min por cambio de frontend.

## Referencias

- `frontend/e2e/a11y.spec.ts` — gate de accesibilidad.
- `frontend/playwright.config.ts` — projects functional/perf, workers.
- `backend/load/run-staging.cjs` + `backend/load/staging-read.yaml`.
- `compose.staging.yaml` — servicio staging local.
- supersedes: ninguna; ADR-0001/0015 cubren el fondo.
