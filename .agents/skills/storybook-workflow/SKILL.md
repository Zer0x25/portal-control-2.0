---
name: storybook-workflow
description: >-
  Ejecutable runbook for the agentic UI workflow with Storybook: consult the certified component docs before editing UI, write CSF3 stories with the project conventions, detect which stories a change affects, run story tests (smoke + axe a11y), and publish a visual review. Use this skill whenever creating, changing, or reviewing UI components, stories, styles, themes, or design tokens in frontend/src.
---

# Storybook Agentic Workflow Runbook

This runbook integrates agents (Copilot, session agents, humans) with the
project's certified design system catalog via Storybook 10.6 (spec 122 /
ADR-0033). Storybook is **development tooling**: it never reaches the
production bundle (`check:storybook-runtime` guards it).

All commands run from `frontend/` unless noted.

## 1. Before editing UI: discover, don't reinvent

Before creating or changing any component, check what the design system
already provides. Never hand-roll a duplicate of a certified primitive, and
never invent props.

```bash
# List every documented component (id + name)
npx storybook tools docs list --json

# Full docs for one component: real props, usage examples, stories
npx storybook tools docs show --input '{"id":"certified-components-ui-button"}'
```

If the dev server is running (`npm run storybook`, port 6006), the same
tools are available via the MCP server (`storybook` in `.vscode/mcp.json`):
`docs-list`, `docs-show`, `docs-show-story`,
`get-storybook-story-instructions`. The MCP server also offers
`stories-preview`, `stories-changed`, `stories-find-by-component` and
`review-create`. `test-run` only appears when the dev server runs with
`STORYBOOK_TESTS=1` (which also registers `@storybook/addon-vitest` and
enables the "Component tests" panel).

The authoritative list of certified entries is
`frontend/design-system-certified.json` (83 files); the audit script and
`designSystemGuardrails.test.ts` enforce that every certified file has a
story.

## 2. Writing stories: project conventions (CSF3)

Every component created or substantially changed gets stories covering the
states its props contract can reach (variants, loading, empty, error,
disabled — _not_ a universal template: `Container` or `Skeleton` have no
error state).

- **Imports are type-only**: `import type { Meta, StoryObj } from
"@storybook/react-vite"`. Zero runtime imports of `@storybook/*` anywhere
  in production code; stories must not import app services.
- **Import the component under its real name** (`import Button from
"./Button"`), never a generic alias: the agents' component manifest
  derives display names and JSX examples from it.
- **Certified ids**: `id: "certified-..."` and `title:
"Design System/components/ui/..."` (or `features/...`, `layout/...`).
- **`tags: ["autodocs"]`** and a docs description `"Archivo certificado: <path>"`.
- **Component that fetches on render gets no story** until it takes props
  or MSW mocks exist (current policy; see `src/tests/mocks/handlers.ts`).
- Register new primitives in `frontend/design-system-certified.json` and
  run `npm run catalog:manifest` + `npm run catalog:manifest:check`.

Isolated-story contract notes:

- A story must render a component's DOM contract truthfully: if the
  component is an `<li>` by contract (e.g. `SidebarNavItem`), the story
  provides the `<ul>` context; if it declares `aria-controls` toward a
  layout element (e.g. Header → `app-sidebar`), the story provides that
  target. axe runs per story with `test: "error"`.

## 3. After a UI change: impact + story tests

```bash
# Which stories do my uncommitted changes affect? (module graph)
npx storybook tools stories changed

# Stories that use a given component file
npx storybook tools stories find-by-component --input '{"componentPaths":["src/components/ui/Button.tsx"]}'

# Smoke render + a11y (axe) for all certified stories (browser mode)
npm run test:storybook

# Only what changed
npx storybook tools test run --changed
```

`test:storybook` runs the Vitest project `storybook` (activated via
`STORYBOOK_TESTS=1` in `frontend/vite.config.ts`; normal `vitest` runs are
unaffected). Failures are real a11y/render bugs — fix them; never lower
`a11y.test` or remove rules to make a run pass. The `color-contrast` rule
is currently disabled as a documented ratchet (TD-005 in
`docs/tech-debt-register.md`); new UI should still meet 4.5:1.

The interactive "Component tests" panel and `npx storybook tools test run`
need the dev server itself started with the flag
(`STORYBOOK_TESTS=1 npm run storybook` — `@storybook/addon-vitest` is
registered in `.storybook/main.ts` only under that flag, so the plain
dev server shows no panel). Export `STORYBOOK_TESTS=1` for the CLI call
too; without it the CLI falls back to a local toolset catalog without
`test`.

For certified primitives also refresh visual baselines if appearance
changed intentionally: `npm run storybook:visual` (compare) /
`npm run storybook:visual:update` (accept).

## 4. Reviewing UI work

With the dev server running, publish a visual review of the changed
stories (links per story for the human):

```bash
npx storybook tools review create
```

Include the returned preview URLs in your final response so the user can
see the changed components.

## 5. Preflight

The pre-PR gate runs `npm run test:storybook` when `frontend/src` changed
(`node .agents/skills/ci-preflight/scripts/preflight.cjs --pr`). Storybook
build integrity is part of `validate:ci` (`storybook:build`), and the
production bundle is guarded by `check:storybook-runtime`.
