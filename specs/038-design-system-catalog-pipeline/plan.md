# Plan 038: Design System Catalog & Token Pipeline

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../031-ui-ux-consolidation/plan.md`,
`../033-frontend-layering-hardening/plan.md`,
`../035-frontend-testing-stack/plan.md`,
`../037-frontend-rendering-observability/plan.md`.

## Estrategia

5 workstreams (A–E). **D y E primero**: retirar la familia `sap-*` y poner
los tokens bajo ratchet es lo que **simplifica** el catálogo; migrar 432 usos
antes de tener el pipeline sería reescribir a ciegas.

1. **Fase A — Retirada de `sap-*` (3 PR)**:
   - `sap-*` está deprecada desde ADR-0020 pero viva con **432 usos**. El
     primer paso es **medir el delta semántico**: no todos los `sap-*` tienen
     un `token-*` equivalente con el mismo significado (los tokens de estado
     de dominio `status-*` son la destino natural de varios).
   - Migración por área (`components/ui` → `features/*` → `utils`), con el
     **ratchet de `sap-*` en el audit script** (contador nuevo en
     `design-system-budget.json`, inicializado al conteo real y decreciente,
     con objetivo 0).
   - Se acompaña de una **mapa de equivalencias** (`sap-*` → `token-*`) en el
     PR, para que la migración sea una traducción y no un juicio.
2. **Fase B — Pipeline de tokens (3 PR)**:
   - `frontend/tokens.json`: fuente de verdad declarativa de los tokens
     semánticos (`token-*`), los estados de dominio (`status-*`) y la paleta
     de data-viz (`chart-1..8`), con sus variantes light/dark.
   - `frontend/scripts/build-tokens.cjs`: genera el bloque de
     `frontend/src/index.css` a partir del JSON. El bloque generado queda
     **delimitado por marcadores** en el CSS, de modo que el resto del
     archivo (los breakpoints, las utilidades custom, los media queries) sigue
     escrito a mano.
   - **Modo `--check`**: falla si el CSS commiteado no coincide con el
     generado (equivalente a `prettier --check` pero para tokens). Se
     integra en `npm run validate:ci` del frontend.
   - El JSON se estructura para que **Tokens Studio** (plugin de Figma) o
     cualquier otro productor puedan escribirlo: es un contrato de formato,
     no una herramienta.
   - Los tipos de TS (`--token-*` como `CSSProperties` opcional) se generan
     en el mismo paso.
3. **Fase C — Ratchet de tokens activos (1 PR)**:
   - Script que cruza los tokens declarados en `@theme` con sus consumidores
     reales en `frontend/src` (mismo análisis de clases que ya hace
     `audit-design-system.cjs`) y reporta los **huérfanos**.
   - Budget nuevo `orphanTokenBudget` en `design-system-budget.json`,
     inicializado al conteo real, decreciente. Los huérfanos se eliminan
     (un token sin consumidor es deuda) o se documentan como "reservados para
     el siguiente módulo".
4. **Fase D — Catálogo externo (3 PR)**:
   - Storybook 9 (devDep) con `.storybook/` en `frontend/`: `main.ts` con
     Vite + React 19, y los addons mínimos (`@storybook/addon-a11y` para
     auditar las historias, y el visor de tokens).
   - **Una historia por primitiva certificada** (65). La lista de 65 sale de
     `frontend/design-system-certified.json` — la **misma** fuente de verdad
     que ya consumen el audit script y el guardrail — para que no exista una
     lista paralela que mantener.
   - Cada historia cubre: variantes, estados (default/hover/focus/disabled/
     loading/error), playground de props (`@storybook/blocks`), y el render en
     claro/oscuro (o un toggle de tema).
   - El `features/design-system/` del app **se mantiene** y se le **delega**
     la documentación: el `DesignSystemCatalog` del app pasa a consumir las
     stories (o a enlazarlas), y la migración de capas de
     `DesignSystemCatalog.view.tsx` la ejecuta la spec 033.
5. **Fase E — Regresión visual y scorecard (2 PR)**:
   - Snapshots de las primitivas certificadas en claro y oscuro (se apoya en
     la infraestructura de la spec 035 si ya está; si no, se implementa aquí
     con `toHaveScreenshot` de Playwright sobre las stories servidas por
     Storybook, o sobre las rutas del catálogo del app).
   - El reporte de `audit-design-system.cjs` **incorpora** el resultado de la
     regresión visual: qué primitivas cambiaron respecto al baseline, para
     que el scorecard statico y el visual se vean juntos.

## Archivos a tocar

| Archivo                                                         | Cambio                                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `frontend/tokens.json`                                          | **nuevo** — fuente de verdad declarativa de tokens                          |
| `frontend/tokens/README.md`                                     | **nuevo** — formato, relación con Figma, productores                        |
| `frontend/scripts/build-tokens.cjs`                             | **nuevo** — generador + modo `--check`                                      |
| `frontend/scripts/audit-design-system.cjs`                      | contador `sap-*`, contador de tokens huérfanos, sección de regresión visual |
| `frontend/design-system-budget.json`                            | budgets nuevos (`sapTokenBudget`, `orphanTokenBudget`), decrecientes        |
| `frontend/src/index.css`                                        | bloque de tokens generado (delimitado por marcadores)                       |
| `frontend/src/types/tokens.ts`                                  | **nuevo** — tipos de tokens generados                                       |
| `frontend/.storybook/{main.ts,preview.ts}`                      | **nuevos** — configuración de Storybook                                     |
| `frontend/src/**/*.stories.tsx`                                 | **nuevos** — 65 historias (una por primitiva certificada)                   |
| `frontend/src/features/design-system/**`                        | delegar la documentación; migración de capas (spec 033)                     |
| `frontend/src/**` (432 usos de `sap-*`)                         | migrar a `token-*` / `status-*` (lotes)                                     |
| `frontend/src/tests/guardrails/tokenPipelineGuardrails.test.ts` | **nuevo**                                                                   |
| `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`  | extender: las 65 certificadas tienen historia                               |
| `frontend/package.json`                                         | `storybook`, addons (devDep), script `build:tokens` y `tokens:check`        |
| `frontend/README.md`                                            | cómo ejecutar el catálogo y regenerar tokens                                |
| `.agents/rules/design-system-governance.md`                     | §7 y §8: fuente de verdad de certificadas y pipeline                        |
| `docs/adr/0027-design-system-catalog-pipeline.md`               | decisión permanente                                                         |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** El spec es de frontend puro.
- **Contrato de `index.css`**: **no cambia el formato**. Tailwind v4 con
  `@theme` se mantiene; lo que cambia es que el bloque de tokens semánticos
  pasa a estar **generado** y delimitado por marcadores. Las clases
  `token-*`, `status-*` y `chart-*` **no se renombran** → las 65 primitivas
  certificadas y los miles de usos existentes siguen funcionando.
- **`design-system-certified.json`**: se **extiende** con un campo opcional
  de story, pero la lista de 65 sigue siendo la fuente de verdad única. El
  audit script y el guardrail leen **la misma** lista.
- **`design-system-budget.json`**: **suben de versión** (v2 → v3) al añadir
  `sapTokenBudget` y `orphanTokenBudget`. La política monótona se mantiene:
  los budgets nuevos se inicializan al conteo real y solo decrecen.
- **Storybook**: dependencia de desarrollo; no entra en el bundle ni en el
  precache de Workbox. El `vite.config.ts` de Storybook reutiliza el
  `vite.config.ts` principal (alias, plugins de Tailwind) para que las
  historias rendericen **exactamente** lo que renderiza la app.
- **CI**: se añade un paso `tokens:check` (el CSS generado debe coincidir) y
  el pipeline de Storybook (`storybook build`) como verificación de que las
  65 historias compilan.

## Riesgos y rollback

| Riesgo                                                                                    | Mitigación                                                                                                                                     | Rollback                                           |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| La migración de `sap-*` cambia el color de superficies (diferencia semántica no evidente) | el mapa de equivalencias se revisa **por área**, con comparación visual en claro/oscuro (ADR-0020 exige contraste AA)                          | revertir el área migrada                           |
| El pipeline de tokens genera un CSS distinto del actual y rompe el audit                  | el generador se escribe **extrayendo** el bloque actual, no reescribiéndolo; se compara el diff del primer run                                 | revertir el pipeline (el CSS sigue a mano)         |
| Tokens Studio / Figma produce un JSON con otra forma y rompe el generador                 | el formato del JSON es un **contrato**, versionado y validado por el generador; la integración de Figma es opcional y posterior                | adaptar el generador                               |
| Storybook se desincroniza de la app (las historias no reflejan el render real)            | las historias importan los **componentes reales** del proyecto (no hay copias); el `vite.config.ts` es el mismo                                | corregir la historia                               |
| 65 historias son mucho trabajo de creación                                                | se migran por bloques (primitivas base → formularios → overlays → layout) y se acepta que el guardrail exija cobertura progressive             | el budget de cobertura de historias es decreciente |
| La regresión visual de primitivas genera falsos positivos por antialiasing                | `maxDiffPixelRatio` explícito e imagen base fijada en CI                                                                                       | relajar el umbral con justificación                |
| El scorecard combinado (estático + visual) es más difícil de leer                         | el reporte mantiene el formato tabular actual y añade **una sección**, no un formato nuevo                                                     | revertir a la sección estática                     |
| La spec 033 y esta spec tocan `features/design-system/` a la vez                          | **orden explícito**: la spec 033 migra las capas del catálogo (AC2 de 033) antes de que esta spec lo modifique; esta spec consume el resultado | rebase: 033 primero                                |

## Verificación

```bash
cd frontend
npm run build:tokens          # regenerar tokens
npm run tokens:check          # el CSS commiteado == CSS generado (CI)
npm run check
npm run lint
npm run test:run -- src/tests/guardrails
npm run audit:design-system   # budgets: ninguno sube
npm run validate:ci
npm run storybook:build       # las 65 historias compilan
npm run e2e:staging           # 56 tests

# Raíz
npm run spec:check
npm run docs:check
npm run preflight
```
