# Plan 122: Integración agéntica de Storybook

Estrategia técnica para la spec `./spec.md`.

## Enfoque

El ecosistema Storybook 10.6 ya trae la capa agéntica (CLI `storybook tools`,
`@storybook/addon-mcp`, `@storybook/addon-vitest`); el trabajo es integrarla
respetando las invariantes del repo (cero runtime en bundle, CSF3 con imports
de tipo, ratchets congelados) y documentarla donde los agentes la buscan
(`.agents/skills/`, `.agents/rules/`).

Orden: bump coherente de versiones primero (los addons 10.6.9 paresan
`storybook ^10.6.9`), luego story tests aislados en un tercer proyecto Vitest,
después MCP (necesita server corriendo para verificarse), y por último
runbook/reglas/preflight, que documentan lo ya verificado.

## Pasos

1. **Bump 10.6.3 → 10.6.9** de `storybook`, `@storybook/react-vite`,
   `@storybook/addon-a11y`, `@storybook/addon-docs` + instalar
   `@storybook/addon-mcp@10.6.9` y `@storybook/addon-vitest@10.6.9`
   (devDependencies). Validar con `npx storybook doctor` y
   `npm run storybook:build`.
2. **Registrar addons** en `frontend/.storybook/main.ts` (addon-mcp expone
   `/mcp`; addon-vitest habilita el proyecto de tests).
3. **Proyecto Vitest `storybook`** en `frontend/vite.config.ts`: tercer
   proyecto bajo `test.projects`, browser mode con el provider Playwright ya
   instalado, incluyendo solo `src/**/*.stories.tsx`, con el plugin/config que
   el addon-vitest provee. Script `test:storybook` = `vitest run --project=storybook`.
4. **Calibración a11y**: primer run completo; triage de violaciones
   (corregir pocas / ratchet documentado si son masivas, con exceptions por
   historia y registro en `docs/tech-debt-register.md`).
5. **MCP**: `.vscode/mcp.json` con el servidor `storybook`
   (`http://127.0.0.1:6006/mcp`); verificación manual con server activo.
6. **Runbook + reglas**: skill `storybook-workflow`, regla
   `.agents/rules/storybook-agentic.md`, enlaces desde
   `design-system-governance.md` §7/§8, comandos en `frontend/README.md`.
7. **Preflight**: `test:storybook` en el gate `--pr` del preflight cuando el
   diff toca `frontend/src`.
8. **Cierre**: ADR-0033 promovido, suite completa, PR.

## Archivos a modificar

| Archivo                                             | Acción                                  | Contrato afectado      |
| --------------------------------------------------- | --------------------------------------- | ---------------------- |
| `frontend/package.json`                             | Bump + addons + script `test:storybook` | Ninguno (devDeps)      |
| `frontend/package-lock.json`                        | Regenerar                               | —                      |
| `frontend/.storybook/main.ts`                       | Registrar addon-mcp + addon-vitest      | Ninguno (dev config)   |
| `frontend/.storybook/preview.ts`                    | Solo si el triage a11y lo exige         | Ninguno                |
| `frontend/vite.config.ts`                           | Proyecto Vitest `storybook`             | Tests (nuevo proyecto) |
| `.vscode/mcp.json`                                  | Crear                                   | Ninguno                |
| `.agents/skills/storybook-workflow/SKILL.md`        | Crear                                   | Ninguno                |
| `.agents/rules/storybook-agentic.md`                | Crear                                   | Ninguno                |
| `.agents/rules/design-system-governance.md`         | Enlaces §7/§8                           | Ninguno                |
| `.agents/skills/ci-preflight/scripts/preflight.cjs` | Gate `--pr`                             | tooling local          |
| `frontend/README.md`                                | Sección comandos agénticos              | Ninguno                |
| `docs/adr/0033-storybook-agentic-integration.md`    | Redactar + promover                     | Ninguno                |
| `docs/adr/README.md`                                | (Ya indexado por scaffold) Verificar    | —                      |
| `docs/tech-debt-register.md`                        | Solo si hay exceptions a11y             | Ninguno                |
| `specs/122-storybook-agentic-integration/*`         | Esta spec                               | —                      |

## Riesgos y mitigación

- **Peers de addon-vitest/addon-mcp exigen `storybook ^10.6.9`**: el bump va
  primero y se valida en el mismo commit (doctor + build).
- **Primer run a11y masivo**: plan de triage explícito (AC2); nunca silenciar
  sin registro.
- **Cobertura**: el proyecto storybook se excluye del proyecto jsdom y de los
  thresholds globales (configuración por proyecto, no global); se verifican
  los umbrales tras el cambio.
- **Duración de story tests en CI**: quedan fuera de `validate:ci`; el ADR
  fija el criterio de promoción (medición de duración + estabilidad).

## Rollback

Revert del PR: no hay migraciones ni datos; solo devDependencies, config de
Vitest/Storybook y documentación. El return a 10.6.3 restaura el estado previo
(`npm ci` + verificación de `storybook:build`).
