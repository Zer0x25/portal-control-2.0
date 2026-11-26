---
trigger: model_decision
description: Agentic Storybook integration invariants — CLI tools, MCP server, story tests, and the UI change workflow with the certified catalog.
---

# Storybook Agéntico (spec 122 / ADR-0033)

## 1. Herramientas y cuándo usarlas

- **Descubrir antes de crear UI**: `npx storybook tools docs list` /
  `docs show` (o MCP `docs-list`/`docs-show` con `npm run storybook`
  activo, server registrado en `.vscode/mcp.json`,
  `http://127.0.0.1:6006/mcp`). Reusar primitivas certificadas
  (`frontend/design-system-certified.json`); no inventar props: si no está
  en el manifiesto, no existe.
- **Tras cambiar UI**: `npx storybook tools stories changed` detecta las
  historias afectadas por el diff (ejecutar desde `frontend/`); correr
  `npm run test:storybook` (smoke render + axe a11y por historia,
  proyecto Vitest `storybook` en browser mode) y arreglar las fallas —
  nunca bajar niveles ni reglas para pasar.
- **Runbook completo**: skill `storybook-workflow`
  (`.agents/skills/storybook-workflow/SKILL.md`).

## 2. Invariantes

- Storybook es tooling de desarrollo: cero runtime de `@storybook/*` en
  el bundle de producción (guard `check:storybook-runtime`); historias con
  imports de tipo (`import type { Meta, StoryObj }`) y sin imports de
  services de la app.
- El proyecto Vitest `storybook` se activa solo con `STORYBOOK_TESTS=1`;
  las suites `jsdom`/`browser` y los ratchets de cobertura no deben verse
  afectados por su configuración.
- Historias certificadas: `id: "certified-..."`, título
  `Design System/...`, componente importado con su **nombre real** (el
  manifiesto de agentes deriva nombre y ejemplos JSX del import).
- La historia aislada debe sostener el contrato DOM del componente
  (contexto `<ul>` para items `li`, destino de `aria-controls`, nombres
  accesibles de diálogos con `showHeader={false}` vía `ariaLabelledBy`).
- Ratchet a11y: la regla `color-contrast` está deshabilitada de forma
  documentada (TD-005, `docs/tech-debt-register.md`) hasta cerrar la deuda
  de contraste de tokens de estado; el resto de reglas axe corre con
  `test: "error"`. El UI nueva debe cumplir 4.5:1 de todos modos.
- Componentes que fetchean al renderizar no obtienen historia hasta tener
  props o mocks MSW (`src/tests/mocks/handlers.ts`).

## 3. Actualización de dependencias

`storybook` y todos los paquetes `@storybook/*` se versionan juntos
(hoy 10.6.9). Tras actualizar: `npx storybook doctor`,
`npm run storybook:build`, `npm run test:storybook` y
`npm run storybook:visual` deben pasar antes de confirmar.
