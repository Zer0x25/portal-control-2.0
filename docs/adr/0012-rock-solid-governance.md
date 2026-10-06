# ADR-0012: Gobernanza de base roca (spec 003)

- Estado: Aceptado
- Fecha: 2026-10-02
- Autores: opencode
- Spec: `specs/003-rock-solid-governance/`

## Contexto

La higiene base ya estaba implementada sin cambio de comportamiento
(`.dockerignore` x3, `.gitattributes`, `.editorconfig`, `CODEOWNERS`,
PR template, hook `commit-msg`, `secrets:scan` con allowlist y steps en
CI). Faltaban 5 brechas (G-01…G-05 del spec):

- G-01: 5 commits históricos con prefijo emoji que `release-please` no
  parsea (el tipo debe ir en posición 0). El hook solo blinda futuro.
- G-02: sin umbrales de cobertura en vitest.
- G-03: e2e Playwright existe (`frontend/e2e/`) pero CI no lo corre.
- G-04: `docs/adr/` y `specs/` sin check de enlaces ni Prettier en CI.
- G-05: `secrets:scan` es grep casero; ¿cuándo migrar a gitleaks?

## Decisión

1. Anti-emoji para agentes: `AGENTS.md` §6 + los 3 prompts de
   `jules-scheduled.yml` exigen subject Conventional puro, sin emoji ni
   prefijos (rompen `release-please` y el hook `commit-msg` los
   rechaza). Historia con emoji queda grandfathered, no se imita.
2. Ratchet de cobertura con `@vitest/coverage-v8`: umbrales = cobertura
   real medida el 2026-10-02 menos un margen anti-flakiness. Solo pueden
   subir. Backend (`backend/vitest.config.ts`): líneas 14, funciones 17,
   ramas 8, statements 14 (medido 16.47% líneas, 19.1% funciones, 9.48%
   ramas, 15.84% statements en unit sin DB).
   Frontend (`frontend/vite.config.ts`): líneas 17, funciones 35, ramas
   60, statements 17 (medido 19.82% líneas, 37.66% funciones, 64.11%
   ramas). Job `coverage-ratchet` en CI.
   Subir cobertura real queda fuera de alcance (spec aparte).
3. Smoke e2e en CI: job `e2e-smoke` levanta `compose.staging.yaml`
   (base de producción local con migraciones/seed), espera
   `/api/health` y corre solo `frontend/e2e/smoke.spec.ts` (health +
   login admin). Los flujos de negocio siguen en los otros
   `e2e/*.spec.ts` y se corren en local con `npx playwright test`.
4. Docs as Code con gate: `scripts/docs-check.cjs` (cero dependencias)
   falla con enlaces relativos rotos en `docs/adr/` o `specs/`, o con
   ADR numerado sin indexar en `docs/adr/README.md`. Job `docs-check`
   en CI + Prettier check sobre `docs/adr/*.md` y `specs/**/*.md`.
   `README.md` y `AGENTS.md` quedan fuera del Prettier gate (formato
   histórico previo); solo `docs/adr/` y `specs/` son estrictos.
5. Gitleaks: NO migrar ahora. Criterio de migración (revisar cada
   trimestre o al tocar `secret-scan`): migrar cuando se cumpla al
   menos uno: (a) `secret-scan.allow` supera 15 entradas (ruido
   inmanejable con grep); (b) se necesita escanear historial
   (`git log`), no solo árbol; (c) se requieren patrones de alta
   entropía o reglas por defecto mantenidas por terceros. Hasta
   entonces, el grep auditable con allowlist justificada sigue siendo
   la herramienta (cero dependencias, reglas legibles en el repo).

## Alternativas consideradas

1. Thresholds altos (70%+) desde el día uno — descartada: bloquearía
   todos los PR hasta subir cobertura, trabajo de otro spec.
2. e2e completo en CI (todos los `*.spec.ts`) — descartada: frágil y
   lento sin seed dedicado; el smoke cubre "el sistema levanta y
   autentica", que es lo que CI necesita como señal.
3. Migrar ya a gitleaks action — descartada: el grep actual tiene 0
   falsos positivos fuera de allowlist y 5 entradas justificadas;
   añadir SaaS sin necesidad viola el principio zero-dep del repo.

## Consecuencias

Positivas:

- Cobertura que baja falla CI (`coverage-ratchet`).
- Stack roto o login roto falla CI (`e2e-smoke`).
- Link roto en ADRs/specs falla CI (`docs-check`).
- Jules deja de emitir subjects con emoji (verificado en el siguiente
  ciclo programado).

Negativas / costos aceptados:

- `e2e-smoke` añade ~5-10 min al CI (build de `compose.staging` +
  chromium). Solo corre en PR/push no-bot, igual que el resto.
- Thresholds bajos al inicio: la señal es débil hasta que un spec
  futuro suba la cobertura y el ratchet con ella.
- Firmado de imágenes/SBOM queda futuro (fuera de alcance explícito).

## Referencias

- `backend/vitest.config.ts` — thresholds backend + include `src/**`.
- `frontend/vite.config.ts` — thresholds frontend.
- `backend/package.json` / `frontend/package.json` — `test:coverage`.
- `frontend/e2e/smoke.spec.ts` — smoke de CI.
- `scripts/docs-check.cjs` — gate de enlaces e índice.
- `package.json` — `docs:check`.
- `.github/workflows/ci.yml` — jobs `coverage-ratchet`, `docs-check`,
  `e2e-smoke`.
- `AGENTS.md` §6 — disciplina de commits sin emoji.
- `.github/workflows/jules-scheduled.yml` — prompts sin emoji.
- `scripts/secret-scan.cjs` + `scripts/secret-scan.allow` — gate actual.
