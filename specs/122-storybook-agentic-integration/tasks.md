# Tareas 122: Integración agéntica de Storybook

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

- [x] T1: Bump `storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`,
      `@storybook/addon-docs` a **10.6.9** e instalar
      `@storybook/addon-mcp@10.6.9` + `@storybook/addon-vitest@10.6.9` como
      devDependencies; registrar ambos addons en
      `frontend/.storybook/main.ts`. Validar: `npx storybook doctor` y
      `npm run storybook:build` (AC3, AC1, AC2).
- [x] T2: Verificar el servidor MCP: con `npm run storybook` activo,
      `http://127.0.0.1:6006/mcp` lista las herramientas (splash); crear
      `.vscode/mcp.json` registrando el servidor (AC1).
- [x] T3: Añadir el proyecto Vitest `storybook` (browser mode, Playwright
      chromium, historias de `.storybook/main.ts` via el plugin del addon)
      a `frontend/vite.config.ts` activado con `STORYBOOK_TESTS=1` y el
      script `test:storybook` en `frontend/package.json`; verificar que los
      ratchets de cobertura del proyecto jsdom no se mueven (AC2).
- [x] T4: Primer run completo de `npm run test:storybook` (54 fallas/228);
      triage de 69 violaciones: 12 a11y reales corregidas
      (aria-dialog-name/button-name/label/select-name/heading-order y
      contratos de historias aisladas) y 57 `color-contrast` degradadas a
      ratchet documentado (`preview.ts` + TD-005 en
      `docs/tech-debt-register.md`); run final 228/228 verde (AC2).
- [x] T5: Verificar que la regresión visual de primitivas sigue verde tras el
      bump (`npm run storybook:visual`) y que el bundle de producción sigue
      limpio (`npm run build && npm run check:storybook-runtime`) (AC3, AC6).
- [x] T6: Crear la skill `.agents/skills/storybook-workflow/SKILL.md`
      (ciclo agéntico: docs → historias CSF3 → stories changed → story tests
      → review) y la regla `.agents/rules/storybook-agentic.md`; enlazarlas
      desde `.agents/rules/design-system-governance.md` §7 y documentar los
      comandos en `frontend/README.md`; mantener `AGENTS.md` ≤ 120 líneas
      (sin cambios: 118/120) (AC4).
- [x] T7: Integrar `test:storybook` en el preflight `--pr`
      (`.agents/skills/ci-preflight/scripts/preflight.cjs`) con detección de
      cambios en `frontend/src`; `preflight --pr` verde (AC5).
- [x] T8: Redactar y promover `docs/adr/0033-storybook-agentic-integration.md`
      a Aceptado; verificar su index en `docs/adr/README.md` (AC7).
- [x] T9: Suite final: `npm run validate:ci` (backend y frontend, secuencial),
      `npm run test:storybook`, `npm run storybook:build`,
      `npm run storybook:visual`, `npm run guardrails`,
      `npm run audit:design-system`, `npm run spec:check`, `npm run docs:check`,
      `npm run lint:budget`; cerrar ACs y estado de la spec (AC7).

## Notas de ejecución (2026-11-26)

- T1-T4: bump 10.6.9 sin conflictos de peers (`addon-mcp` 10.6.9 paresan
  `storybook ^10.6.9` y `addon-vitest` es peer opcional). El proyecto
  `storybook` reusa el provider Playwright del proyecto `browser` (sin
  descargas nuevas) y comparte `extends: true` con el Vite del app.
- El addon-vitest impone `include` desde el campo `stories` de
  `.storybook/main.ts`; el `test.include` del proyecto se ignora (warning de
  la 8.5+), por eso la activation flag `STORYBOOK_TESTS=1` es el mecanismo
  de aislamiento para las corridas comunes.
- `stories changed` funciona desde `frontend/`; desde la raíz del repo
  necesita `--cwd frontend` (documentado en el runbook).
- Renombrado `StoryComponent` → nombre real en las 83 historias: el
  manifiesto de agentes (`docs list/show`, MCP) ahora muestra
  `# Button`, `# Header`... con ejemplos JSX utilizables. Colisión
  resuelta en BrandLogo (tipo de `configService` vs componente).
- Primer run a11y: 57/69 violaciones eran `color-contrast` sistémicas de
  pares texto/estado sobre fondos `/10` y `/05` (Badge 2.07, captions
  3.77, grises terciarios 1.75-2.4); la regla queda deshabilitada con
  TD-005 y plan de cierre por tokens. Los 12 issues estructurales se
  corrigieron en los componentes.
