# Plan 038: Design System Catalog & Token Pipeline

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../031-ui-ux-consolidation/plan.md`,
`../033-frontend-layering-hardening/plan.md`,
`../035-frontend-testing-stack/plan.md`,
`../037-frontend-rendering-observability/plan.md`.

## Estrategia

5 workstreams (A–E). **A, B y C primero**: retirar la familia `sap-*` y poner
los tokens bajo ratchet es lo que **simplifica** el catálogo; migrar 431 usos
antes de tener el pipeline sería reescribir a ciegas. **D** depende de la spec
033 y **E** de la spec 035 (ver la tabla de dependencias de secuencia del
spec).

1. **Fase A — Retirada de `sap-*` (3 PR)**:
   - `sap-*` está deprecada desde ADR-0020 pero viva con **432 ocurrencias**
     en `frontend/src` (**431** en producción + **1** en
     `src/tests/features/dashboard/useToolsLogic.test.ts`). El desglose
     medido en producción es: `sap-blue` 362, `sap-error` 36, `sap-success`
     14, `sap-warning` 10, `sap-light-blue` 8, `sap-blue-dark` 1.
   - De los **11** `--color-sap-*` declarados en `@theme`
     (`index.css:16-26`), **6 no tienen ningún uso** (`sap-gray`, `sap-bone`,
     `sap-dark-gray`, `sap-medium-gray`, `sap-border`, `sap-info`), **4 son
     alias 1:1** (`sap-blue` → `var(--accent-professional)` =
     `token-accent-brand`; `sap-error` → `var(--status-error)`;
     `sap-success` → `var(--status-success)`; `sap-warning` →
     `var(--status-warning)`) y **1 tiene delta semántico real**
     (`sap-light-blue` = `#007bff`, con 8 usos: 4 overrides redundantes
     `text-sap-blue dark:text-sap-light-blue` y 4 gradientes
     `from-sap-blue to-sap-light-blue` en `LoginPage`, `WelcomePanel` y
     `PremiumSearchInput`).
   - **Defecto preexistente que la migración resuelve**: `sap-blue-dark` se
     usa una vez (`features/time-control/components/QuickActionModal.view.tsx:164`,
     `hover:bg-sap-blue-dark`) pero **no está declarado** en `@theme`, así que
     Tailwind nunca genera esa utilidad y el hover no cambia de color.
   - El primer paso es **medir el delta semántico**: no todos los `sap-*`
     tienen un `token-*` equivalente con el mismo significado (los tokens de
     estado de dominio `status-*` son la destino natural de varios).
   - Migración por área (`components/ui` → `features/*` → `utils`), con el
     **ratchet de `sap-*` en el audit script** (contador nuevo en
     `design-system-budget.json`, inicializado al conteo real y decreciente,
     con objetivo 0).
   - **Trampa del audit script**: hoy `audit-design-system.cjs:252` mete en
     `fileStrictIssues` **todo issue cuyo `type` no sea `raw-palette`**, y eso
     alimenta `totalIssues` (budget **0**) y `certifiedViolations` (fallo
     duro en `:402`). Hay **67** ocurrencias de `sap-*` en **13** archivos
     certificados. El contador de `sap-*` se implementa **separado** de
     `fileStrictIssues` mientras `sapTokenBudget > 0`, y pasa a **bloqueo
     duro (0)** en T5. Además, el `--update` escribe `version: 2` literal
     (`:352`): la subida a v3 tiene que tocar esa línea.
   - Se acompaña de una **mapa de equivalencias** (`sap-*` → `token-*`) en el
     PR, para que la migración sea una traducción y no un juicio.
2. **Fase B — Pipeline de tokens (3 PR)**:
   - `frontend/tokens.json`: fuente de verdad declarativa de los tokens
     semánticos (`token-*`), los estados de dominio (`status-*`) y la paleta
     de data-viz (`chart-1..8`), con sus variantes light/dark. Cada entrada
     guarda **las dos claves**: la pública (`token-accent-brand`) y la
     variable CSS subyacente (`cssVar: --accent-professional`), porque el
     mapeo **no es 1:1 en el nombre** (`token-text-onAccent` →
     `var(--text-on-accent)`). Admite además el caso **light-only**:
     `--status-success`, `--status-warning` y `--status-info` se declaran en
     `:root` y **no** se redeclaran en `.dark`.
   - `frontend/scripts/build-tokens.cjs`: genera **dos regiones** delimitadas
     por marcadores de `frontend/src/index.css`:
     `/* @tokens:theme:start|end */` dentro de `@theme` (las entradas
     `--color-token-*`, hoy líneas 28-112) y `/* @tokens:vars:start|end */`
     dentro de `@layer utilities` (`:root` en 378 y `.dark` en 474). Entre
     ambas regiones hay **260 líneas** de `@layer base`, `@utility`,
     `@keyframes` y `@font-face` que siguen escritas a mano.
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
     reales en `frontend/src` y reporta los **huérfanos**. Dos reglas hacen
     que el detector no mienta:
     - **Excluye los falsos consumidores**: `src/features/design-system/**`,
       `src/**/*.stories.tsx` y `src/tests/**` quedan fuera del análisis de
       consumo. El catálogo y las stories se autobastecerían (el catálogo
       lista tokens a propósito) y dejarían el detector ciego.
     - **Detecta el consumo dinámico**: el catálogo construye clases por
       interpolación (`bg-token-chart-${index}`,
       `DesignSystemCatalog.view.tsx:204`; `bg-token-status-${tone}/30`,
       `text-token-status-${tone}`, `:174,176`), que un análisis de clases
       literales no ve. El escáner tiene que reconocer esas formas como
       consumo **y** reportar por separado las clases dinámicas que
       Tailwind v4 no puede generar.
   - Budget nuevo `orphanTokenBudget` en `design-system-budget.json`,
     inicializado al conteo real, decreciente. Los huérfanos se eliminan (un
     token sin consumidor es deuda) o se documentan como "reservados para el
     siguiente módulo".
   - **Las escalas contractuales son atómicas**: las que
     `src/tests/guardrails/statusTokensContrast.test.ts` exige íntegras (11
     estados de dominio × 3, 4 genéricos × 2, `chart-1..8` en `@theme`) **no
     se mutilan miembro a miembro**: la escala está activa si al menos un
     miembro se consume. El baseline medido son **5** tokens sin consumidor
     estático (`token-chart-1`, `token-chart-3`, `token-chart-8`,
     `token-status-info-surface`, `token-status-info-text`): un build de
     producción confirma que **ninguno** de los cinco genera utilidad ni
     variable de tema en `dist/assets/*.css`.
4. **Fase D — Catálogo externo (3 PR)**:
   - Storybook **10** (devDep) con `.storybook/` en `frontend/`: `main.ts` con
     Vite + React 19, y los addons mínimos (`@storybook/addon-a11y` para
     auditar las historias). `@storybook/react-vite@10.6.3` admite
     `vite ^5–^8` y `react ^16.8–^19`: encaja con el stack del repo (Vite
     8.3.2, React 19.3, TypeScript 5.3).
   - **Una historia por entrada certificada** (65). La lista sale de
     `frontend/design-system-certified.json` — la **misma** fuente de verdad
     que ya consumen el audit script y el guardrail — para que no exista una
     lista paralela que mantener.
   - **La taxonomía manda sobre el tipo de story**: `listTokens.ts` (41
     líneas, un diccionario `.ts` de clases Tailwind) se documenta como
     **galería de tokens**; las 4 vistas de feature y los 5 shells de layout
     se montan con sus providers/props; los 16 modales y tablas de dominio
     se montan sobre su **superficie presentacional**.
   - Cada historia cubre: variantes, **los estados que apliquen al contrato
     de props** (un catálogo universal de `default/hover/focus/disabled/
loading/error` no aplica a `Container`, `Skeleton`,
     `LiberalitasSignature` ni `ErrorBoundary`, que no tienen esas props),
     playground de props (en Storybook 9+ es `args` + el addon **Controls**
     incluido en el core; **`@storybook/blocks` está congelado en 8.6.14 y no
     es dependencia de Storybook 10**, así que no se usa) y el render en
     claro/oscuro.
   - **Cero runtime de Storybook en producción**: las stories usan CSF3 con
     `import type { Meta, StoryObj }` (imports **de tipo**, borrados al
     compilar) y el catálogo del app consume un **manifiesto tipado**
     (`tokens`/`variantes`/`props`), no el runtime de Storybook.
   - El `features/design-system/` del app **se mantiene** y se le **delega**
     la documentación; la migración de capas de
     `DesignSystemCatalog.view.tsx` la ejecuta la spec 033.
5. **Fase E — Regresión visual y scorecard (2 PR)**:
   - Snapshots de las primitivas certificadas en claro y oscuro, apoyándose
     en la infraestructura de la spec 035
     (`frontend/e2e/visual-regression.spec.ts`); si no está disponible, con
     `toHaveScreenshot` de Playwright sobre las historias servidas por
     Storybook.
   - La suite visual emite un **resumen JSON**
     (`frontend/visual-regression-summary.json`) con qué primitivas cambiaron
     respecto al baseline.
   - El reporte de `audit-design-system.cjs` **incorpora** ese resumen junto
     al scorecard estático, **manteniendo el formato tabular actual** y
     **sin dejar de ser un check estático**: el script no invoca Playwright
     ni ningún proceso externo (hoy corre en **0,096 s**); si el resumen no
     existe, la sección se reporta como `skipped`.

## Archivos a tocar

| Archivo                                                         | Cambio                                                                                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/tokens.json`                                          | **nuevo** — fuente de verdad declarativa (clave pública + `cssVar` + flag light-only)                                                                |
| `frontend/tokens/README.md`                                     | **nuevo** — formato, relación con Figma, productores                                                                                                 |
| `frontend/scripts/build-tokens.cjs`                             | **nuevo** — generador de las dos regiones + modo `--check`                                                                                           |
| `frontend/scripts/audit-design-system.cjs`                      | contador `sap-*` (**separado** de `fileStrictIssues`), contador de tokens huérfanos, sección de regresión visual (lee un JSON, no invoca Playwright) |
| `frontend/design-system-budget.json`                            | budgets nuevos (`sapTokenBudget`, `orphanTokenBudget`), versión 2 → 3, decrecientes                                                                  |
| `frontend/src/index.css`                                        | dos regiones generadas (`@tokens:theme:*` y `@tokens:vars:*`)                                                                                        |
| `frontend/src/types/tokens.ts`                                  | **nuevo** — tipos de tokens generados                                                                                                                |
| `frontend/.storybook/{main.ts,preview.ts}`                      | **nuevos** — configuración de Storybook 10                                                                                                           |
| `frontend/src/**/*.stories.tsx`                                 | **nuevos** — 65 historias (una por entrada certificada), CSF3 con imports de tipo                                                                    |
| `frontend/src/features/design-system/**`                        | delegar la documentación vía manifiesto tipado; migración de capas (spec 033)                                                                        |
| `frontend/src/**` (431 usos de `sap-*` en producción)           | migrar a `token-*` / `status-*` (lotes)                                                                                                              |
| `frontend/src/tests/guardrails/tokenPipelineGuardrails.test.ts` | **nuevo**                                                                                                                                            |
| `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`  | extender: las 65 entradas certificadas tienen story (con la taxonomía de AC1)                                                                        |
| `frontend/visual-regression-summary.json`                       | **nuevo** — resumen de la regresión visual que lee el audit (opcional)                                                                               |
| `frontend/package.json`                                         | `storybook`, addons (devDep), scripts `build:tokens`, `tokens:check` y `audit:design-system` en `validate:ci`                                        |
| `frontend/README.md`                                            | cómo ejecutar el catálogo y regenerar tokens                                                                                                         |
| `.agents/rules/design-system-governance.md`                     | §7 y §8: fuente de verdad de certificadas y pipeline                                                                                                 |
| `docs/adr/0027-design-system-catalog-pipeline.md`               | decisión permanente                                                                                                                                  |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** El spec es de frontend puro.
- **Contrato de `index.css`**: **no cambia el formato**. Tailwind v4 con
  `@theme` se mantiene; lo que cambia es que **dos regiones** del bloque de
  tokens pasan a estar **generadas** y delimitadas por marcadores. Las
  clases `token-*`, `status-*` y `chart-*` **no se renombran** → las 65
  entradas certificadas y los miles de usos existentes siguen funcionando.
- **`design-system-certified.json`**: se **extiende** con un campo opcional
  de story, pero la lista de 65 sigue siendo la fuente de verdad única. El
  audit script y el guardrail leen **la misma** lista.
- **`design-system-budget.json`**: **suben de versión** (v2 → v3) al añadir
  `sapTokenBudget` y `orphanTokenBudget`. La política monótona se mantiene:
  los budgets nuevos se inicializan al conteo real y solo decrecen. El
  `--update` del audit script escribe la versión a mano (`version: 2`), así
  que esa línea se actualiza con el cambio.
- **Storybook**: dependencia de desarrollo; no entra en el bundle ni en el
  precache de Workbox. El `vite.config.ts` de Storybook reutiliza el
  `vite.config.ts` principal (alias, plugins de Tailwind) para que las
  historias rendericen **exactamente** lo que renderiza la app.
- **CI**: se añade un paso `tokens:check` (el CSS generado debe coincidir), el
  pipeline de Storybook (`storybook build`) como verificación de que las 65
  historias compilan, y `audit:design-system` al `validate:ci` del frontend
  (hoy el audit **no** corre en CI ni en `validate:ci`: solo existe el script
  `npm run audit:design-system`, así que sin este paso los budgets nuevos no
  se aplican).

## Riesgos y rollback

| Riesgo                                                                                    | Mitigación                                                                                                                                          | Rollback                                           |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| La migración de `sap-*` cambia el color de superficies (diferencia semántica no evidente) | el mapa de equivalencias se revisa **por área**, con comparación visual en claro/oscuro (ADR-0020 exige contraste AA)                               | revertir el área migrada                           |
| El contador de `sap-*` rompe `totalIssuesBudget: 0` al entrar en `fileStrictIssues`       | el contador se implementa **separado** de `fileStrictIssues` (`audit-design-system.cjs:252`) mientras `sapTokenBudget > 0`; a 0 pasa a bloqueo duro | revertir el contador (sin tocar el resto)          |
| `sap-blue-dark` no tiene token de destino (uso sin declaración)                           | se resuelve en el mapa de equivalencias (declarar o mapear) antes de borrar la familia `sap-*`                                                      | mantener el alias temporal                         |
| El pipeline de tokens genera un CSS distinto del actual y rompe el audit                  | el generador se escribe **extrayendo** las dos regiones actuales, no reescribiéndolas; el primer run debe dar diff vacío                            | revertir el pipeline (el CSS sigue a mano)         |
| Las variables light-only se pierden al generar                                            | el modelo distingue `:root` de `.dark` y admite variables declaradas solo en claro (`--status-success`, `--status-warning`, `--status-info`)        | volver a la región escrita a mano                  |
| Tokens Studio / Figma produce un JSON con otra forma y rompe el generador                 | el formato del JSON es un **contrato**, versionado y validado por el generador; la integración de Figma es opcional y posterior                     | adaptar el generador                               |
| El ratchet de huérfanos mutila una escala protegida y rompe el guardrail de contraste     | las escalas de `statusTokensContrast.test.ts` son **atómicas**: solo se elimina la escala completa, nunca un miembro suelto                         | restaurar el miembro eliminado                     |
| El escáner da falsos negativos por consumo dinámico (`bg-token-chart-${index}`)           | se reconocen las formas dinámicas y se reportan aparte las clases que Tailwind v4 no puede generar                                                  | enumerar las clases literales en el catálogo       |
| Storybook se desincroniza de la app (las historias no reflejan el render real)            | las historias importan los **componentes reales** del proyecto (no hay copias); el `vite.config.ts` es el mismo                                     | corregir la historia                               |
| El runtime de Storybook entra en el bundle de producción                                  | CSF3 con `import type` (borrado al compilar) y manifiesto tipado para el catálogo del app; verificación en el build de producción                   | retirar el import que Filtró el runtime            |
| 65 historias son mucho trabajo de creación                                                | se migran por bloques (primitivas base → formularios → overlays → layout) y se acepta que el guardrail exija cobertura progressive                  | el budget de cobertura de historias es decreciente |
| La regresión visual de primitivas genera falsos positivos por antialiasing                | `maxDiffPixelRatio` explícito e imagen base fijada en CI                                                                                            | relajar el umbral con justificación                |
| El scorecard combinado (estático + visual) es más difícil de leer                         | el reporte mantiene el formato tabular actual y añade **una sección**, no un formato nuevo                                                          | revertir a la sección estática                     |
| El audit script se vuelve lento o con dependencias al leer la evidencia visual            | el audit sigue siendo **estático** (0,096 s hoy): lee un **resumen JSON** opcional y reporta `skipped` si no existe; nunca invoca Playwright        | volver al scorecard estático puro                  |
| La spec 033 y esta spec tocan `features/design-system/` a la vez                          | **orden explícito**: la spec 033 migra las capas del catálogo (AC2/AC5 de 033) antes de que esta spec lo modifique; esta spec consume el resultado  | rebase: 033 primero                                |
| La spec 035 no está lista y bloquea la regresión visual                                   | la Fase E depende de `frontend/e2e/visual-regression.spec.ts`; si no existe, la Fase E se implementa con `toHaveScreenshot` sobre las historias     | Fallback: snapshots solo de Storybook              |

## Verificación

```bash
cd frontend
npm run build:tokens          # regenerar tokens (diff vacío la primera vez)
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
