# Spec 003: Gobernanza de base roca ( supply chain + cobertura )

- Estado: Implementado
- Autor: opencode
- Fecha: 2026-10-02
- ADR relacionado: `docs/adr/0012-rock-solid-governance.md` (crear al implementar)

## Problema

La base ya tiene higiene (implementada el 2026-10-02 sin cambio de
comportamiento): `.dockerignore` x3, `.gitattributes`, `.editorconfig`,
`CODEOWNERS`, PR template, hook `commit-msg` (`scripts/commit-conventional.cjs`),
`secrets:scan` con allowlist (`scripts/secret-scan.*`) y steps en CI.
Falta cerrar 5 brechas:

- G-01: 5 commits históricos con prefijo emoji (`🔒 Fix ...`,
  `⚡ perf: ...`) que `release-please` no parsea (el tipo debe ir en
  posición 0). El hook solo blinda futuro; Jules debe dejar de emitirlos.
- G-02: sin umbrales de cobertura en vitest (backend y frontend).
- G-03: e2e Playwright existe pero CI no lo corre.
- G-04: `docs/adr/` y `specs/` sin check de enlaces ni Prettier en CI.
- G-05: `secrets:scan` es grep; migrar a gitleaks cuando el ruido lo pida.

## Alcance

Dentro:

- Instrucción anti-emoji en `AGENTS.md`/prompts Jules + thresholds de
  cobertura + smoke e2e en CI + docs check en CI.

Fuera (explícito):

- Subir cobertura existente (trabajo por spec aparte).
- Firmado de imágenes/SBOM (futuro, anotar en ADR).

## Criterios de aceptación

- [x] AC1: `AGENTS.md` y `jules-scheduled.yml` exigen subject
      Conventional sin prefijo; verificado en el siguiente ciclo Jules.
- [x] AC2: `vitest --coverage` con thresholds falla bajo el umbral.
- [x] AC3: CI corre al menos 1 smoke e2e contra `compose.staging`.
- [x] AC4: CI falla con enlace roto en `docs/adr/` o `specs/`.
- [x] AC5: criterio escrito de cuándo migrar a gitleaks.

## Restricciones

Constitución I–V. Sin cambios de runtime.

## Trazabilidad

- Tests: los propios gates de CI son el test.
- Docs a actualizar: ADR nuevo, `AGENTS.md`, `README.md` §7.
