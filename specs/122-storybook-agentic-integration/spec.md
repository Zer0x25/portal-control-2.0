# Spec 122: Integración agéntica de Storybook

- Estado: Borrador
- Autor: zer0x
- Fecha: 2026-11-26
- ADR relacionado: `docs/adr/0033-storybook-agentic-integration.md`

## Problema

Storybook 10.6.3 está integrado como catálogo (spec 038 / ADR-0027: 83 historias
certificadas, `storybook:build` en `validate:ci`, guard anti-runtime,
regresión visual de primitivas y audit con evidencia visual), pero la **capa
agéntica** del ecosistema 10.6 no se usa:

1. La CLI `storybook tools` (`docs list/show`, `stories changed`,
   `stories find-by-component`, `review create`) **funciona hoy** con la
   instalación existente (verificado localmente), pero ningún runbook, regla ni
   skill del proyecto la menciona: los agentes reescriben primitivas en vez de
   reutilizarlas y no saben qué historias afecta un cambio de UI.
2. No existe el servidor MCP de Storybook (`@storybook/addon-mcp`): Copilot no
   puede consultar el manifiesto de componentes ni las historias afectadas sin
   pasar por comandos ad-hoc que desconoce.
3. Las 83 historias certificadas no se **ejecutan** como tests: solo compilan
   (`storybook:build`) y las primitivas tienen regresión visual en claro/oscuro.
   No hay smoke tests de render ni verificación a11y sistemática por historia,
   pese a que el proyecto declara invariantes WCAG AA duras
   (`.agents/rules/design-system-governance.md` §5) y el preview ya fija
   `a11y: { test: "error" }` (`frontend/.storybook/preview.ts`).

## Alcance

Dentro:

- Bump de `storybook` y addons `10.6.3 → 10.6.9` (patch, mismo major).
- Instalación y registro de `@storybook/addon-mcp` y `@storybook/addon-vitest`.
- Proyecto Vitest `storybook` aislado (browser mode) con script
  `test:storybook` que ejecuta smoke+a11y de las historias certificadas.
- Triage del primer run a11y: corrección directa o ratchet documentado.
- Registro del servidor MCP para VS Code (`.vscode/mcp.json`).
- Runbook agéntico (skill `storybook-workflow`) + regla modular
  `.agents/rules/storybook-agentic.md` + sección de comandos en
  `frontend/README.md`.
- Story tests en el preflight pre-PR (gate local), sin tocar `validate:ci`.
- Spec 122 + ADR-0033.

Fuera (explícito):

- Extender la regresión visual Playwright a features/layout (sigue solo
  primitivas certificadas).
- Skills oficiales `/write-stories` `/component-docs` etc. de Storybook:
  requieren Storybook 11; se revisan cuando el repo migre.
- Story tests dentro de `validate:ci` o CI remoto (el ADR documenta el
  criterio de promoción).
- Chromatic o visual tests en la nube.
- Métricas de cobertura desde historias.
- Componentes que fetchean: siguen sin certificarse sin mocks MSW (política
  existente; el runbook la documenta, no la cambia).

## Criterios de aceptación

- [ ] AC1: `@storybook/addon-mcp@10.6.9` está registrado en
      `frontend/.storybook/main.ts`; con `npm run storybook` activo,
      `http://127.0.0.1:6006/mcp` responde con el inventario de herramientas;
      `.vscode/mcp.json` registra el servidor para VS Code Copilot.
- [ ] AC2: `@storybook/addon-vitest@10.6.9` está registrado; `npm run
      test:storybook` ejecuta un smoke test de render por historia certificada
      en browser mode y termina en verde, con las violaciones a11y preexistentes
      corregidas o exceptuadas con ratchet documentado (nunca silenciadas sin
      registro).
- [ ] AC3: `storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`,
      `@storybook/addon-docs`, `@storybook/addon-mcp` y
      `@storybook/addon-vitest` están en `10.6.9`; `npx storybook doctor` pasa,
      `npm run storybook:build` compila y `npm run storybook:visual` sigue
      verde (los baselines de primitivas no cambian).
- [ ] AC4: La skill `.agents/skills/storybook-workflow/SKILL.md` y la regla
      `.agents/rules/storybook-agentic.md` existen con frontmatter válido,
      documentan el ciclo agéntico completo (consultar docs → escribir historias
      CSF3 → detectar impacto → ejecutar story tests → revisión) y
      `npm run spec:check` + `npm run docs:check` + `npm run lint:budget`
      quedan verdes; `AGENTS.md` se mantiene ≤ 120 líneas.
- [ ] AC5: El preflight pre-PR ejecuta `npm run test:storybook` en modo `--pr`
      cuando hay cambios de UI/historias en `frontend/src`; `node
      .agents/skills/ci-preflight/scripts/preflight.cjs --pr` termina verde.
- [ ] AC6: El bundle de producción sigue sin runtime de Storybook:
      `npm run build && npm run check:storybook-runtime` verde.
- [ ] AC7: ADR-0033 promovido a Aceptado e indexado en `docs/adr/README.md`;
      spec 122 con tareas completadas y evidencia de la suite final.

## Restricciones

- Principio V (spec antes que código): esta spec nace antes del código.
- Ratchets existentes intocables en su valor: `check:storybook-runtime`
  (cero runtime en bundle), ratchets de cobertura (el proyecto `storybook`
  se aísla del proyecto `jsdom` para no mover los umbrales), budgets del
  audit de design system (solo decrecen).
- `AGENTS.md` ≤ 120 líneas: la nueva regla es modular en `.agents/rules/`,
  nunca texto inline en AGENTS.md si supera el presupuesto.
- Validación secuencial de paquetes (nunca backend y frontend en paralelo).
- Historias CSF3 con imports de tipo; cero imports de runtime de
  `@storybook/*` en código de producción (invariante ADR-0027).
- Rollback: revert del PR restaura 10.6.3 sin datos ni migraciones de por
  medio (solo devDependencies, config de Vitest y documentación).

## Trazabilidad

- Tests que lo probarán: `npm run test:storybook` (nuevo proyecto Vitest),
  suite visual Playwright `npm run storybook:visual`
  (`frontend/e2e/design-system-visual.spec.ts`), `npm run guardrails`
  (`designSystemGuardrails.test.ts` verifica cero runtime), `npm run
  check:storybook-runtime` tras build.
- Docs a actualizar: `docs/adr/0033-storybook-agentic-integration.md`,
  `docs/adr/README.md`, `frontend/README.md`,
  `.agents/rules/design-system-governance.md` (§7/§8 enlaces),
  `docs/tech-debt-register.md` (si el triage a11y deja exceptions).
