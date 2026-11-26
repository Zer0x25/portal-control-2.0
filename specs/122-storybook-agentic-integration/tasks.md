# Tareas 122: Integración agéntica de Storybook

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

- [ ] T1: Bump `storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`,
      `@storybook/addon-docs` a **10.6.9** e instalar
      `@storybook/addon-mcp@10.6.9` + `@storybook/addon-vitest@10.6.9` como
      devDependencies; registrar ambos addons en
      `frontend/.storybook/main.ts`. Validar: `npx storybook doctor` y
      `npm run storybook:build` (AC3, AC1, AC2).
- [ ] T2: Verificar el servidor MCP: con `npm run storybook` activo,
      `http://127.0.0.1:6006/mcp` lista las herramientas (splash); crear
      `.vscode/mcp.json` registrando el servidor (AC1).
- [ ] T3: Añadir el proyecto Vitest `storybook` (browser mode, Playwright
      chromium, solo `src/**/*.stories.tsx`) a `frontend/vite.config.ts` y el
      script `test:storybook` en `frontend/package.json`; verificar que los
      ratchets de cobertura del proyecto jsdom no se mueven (AC2).
- [ ] T4: Primer run completo de `npm run test:storybook`; triage de
      violaciones a11y: corregir las aplicables o degradar a ratchet
      documentado (`preview.ts` + exceptions + `docs/tech-debt-register.md`);
      el run debe terminar verde (AC2).
- [ ] T5: Verificar que la regresión visual de primitivas sigue verde tras el
      bump (`npm run storybook:visual`) y que el bundle de producción sigue
      limpio (`npm run build && npm run check:storybook-runtime`) (AC3, AC6).
- [ ] T6: Crear la skill `.agents/skills/storybook-workflow/SKILL.md`
      (ciclo agéntico: docs → historias CSF3 → stories changed → story tests
      → review) y la regla `.agents/rules/storybook-agentic.md`; enlazarlas
      desde `.agents/rules/design-system-governance.md` §7/§8 y documentar los
      comandos en `frontend/README.md`; mantener `AGENTS.md` ≤ 120 líneas (AC4).
- [ ] T7: Integrar `test:storybook` en el preflight `--pr`
      (`.agents/skills/ci-preflight/scripts/preflight.cjs`) con detección de
      cambios en `frontend/src`; `preflight --pr` verde (AC5).
- [ ] T8: Redactar y promover `docs/adr/0033-storybook-agentic-integration.md`
      a Aceptado; verificar su index en `docs/adr/README.md` (AC7).
- [ ] T9: Suite final: `npm run validate:ci` (backend y frontend, secuencial),
      `npm run test:storybook`, `npm run storybook:build`,
      `npm run storybook:visual`, `npm run guardrails`,
      `npm run audit:design-system`, `npm run spec:check`, `npm run docs:check`,
      `npm run lint:budget`; cerrar ACs y estado de la spec (AC7).
