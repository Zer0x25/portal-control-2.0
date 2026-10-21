# Tareas 038: Design System Catalog & Token Pipeline

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Retirada de la familia `sap-*`

- [ ] T1: Medir el delta semántico entre `sap-*` y `token-*`: construir el
      **mapa de equivalencias** (`sap-*` → `token-*` o → token de estado de
      dominio `status-*`) y publicarlo en el PR; ningún `sap-*` se traduce sin
      una entrada en el mapa. El desglose medido que el mapa debe cubrir es
      **431 ocurrencias en producción** (+ 1 en
      `src/tests/features/dashboard/useToolsLogic.test.ts`): `sap-blue` 362,
      `sap-error` 36, `sap-success` 14, `sap-warning` 10, `sap-light-blue` 8,
      `sap-blue-dark` 1. De los 11 `--color-sap-*` de `@theme`, **6 no tienen
      uso** (`sap-gray`, `sap-bone`, `sap-dark-gray`, `sap-medium-gray`,
      `sap-border`, `sap-info`), **4 son alias 1:1** (`sap-blue` →
      `token-accent-brand`, `sap-error` → `token-status-error`, `sap-success`
      → `token-status-success`, `sap-warning` → `token-status-warning`) y
      **1 tiene delta real** (`sap-light-blue` = `#007bff`, 8 usos: 4
      overrides `text-sap-blue dark:text-sap-light-blue` y 4 gradientes
      `from-sap-blue to-sap-light-blue` en `LoginPage`, `WelcomePanel` y
      `PremiumSearchInput`). El mapa también resuelve `sap-blue-dark`, que
      **se usa** (`QuickActionModal.view.tsx:164`) pero **no está declarado**
      en `@theme`: hoy `hover:bg-sap-blue-dark` no genera ninguna utilidad y
      el hover no cambia de color (AC6).
- [ ] T2: Añadir el contador de `sap-*` a
      `frontend/scripts/audit-design-system.cjs` y el budget
      `sapTokenBudget` a `frontend/design-system-budget.json` (versión 2 → 3),
      inicializado al conteo real (431) con la **política monótona** (solo
      decrece, `--update` aborta si sube). El contador se implementa
      **separado** de `fileStrictIssues`: hoy `audit-design-system.cjs:252`
      mete en `totalIssues` (budget **0**) todo issue cuyo `type` no sea
      `raw-palette`, y en `certifiedViolations` (fallo duro en `:402`) los de
      los **13 archivos certificados** que contienen `sap-*` (67
      ocurrencias). Actualizar también la `version: 2` literal que escribe
      `--update` (`:352`) (AC6).
- [ ] T3: Migrar los usos de `sap-*` en `frontend/src/components/ui/` y
      `frontend/src/components/layout/`, con comparación en claro/oscuro para
      verificar el contraste AA (invariante de ADR-0020) (AC6).
- [ ] T4: Migrar los usos de `sap-*` en `frontend/src/features/**/` y
      `frontend/src/utils/**`, por lotes; al final del lote, `sapTokenBudget`
      baja y el audit lo refleja (AC6).
- [ ] T5: Eliminar la familia `sap-*` del `@theme` de
      `frontend/src/index.css` cuando el contador llegue a **0** (incluidos
      los 6 tokens declarados sin uso) y añadir el ratchet que bloquea
      `sap-*` para siempre: el contador pasa a **bloqueo duro (0)** y su
      issue entra en `fileStrictIssues` (AC6).
- [ ] T6: Conectar `audit:design-system` al `npm run validate:ci` del
      frontend (hoy el audit **no** corre en CI ni en `validate:ci`: solo
      existe el script `npm run audit:design-system`), para que
      `sapTokenBudget` y `orphanTokenBudget` se apliquen de verdad (AC8).

## Fase B — Pipeline de tokens

- [ ] T7: Crear `frontend/tokens.json` con la fuente de verdad declarativa
      de los tokens semánticos (`token-*`), los estados de dominio
      (`status-*`) y la paleta de data-viz (`chart-1..8`), con sus variantes
      light/dark. Cada entrada guarda **las dos claves**: la pública
      (`token-accent-brand`) y la variable CSS subyacente (`cssVar`, cuyo
      valor es `--accent-professional`), porque el mapeo **no es 1:1 en el
      nombre** (`token-text-onAccent` → `var(--text-on-accent)`). El modelo
      admite **variables light-only**: `--status-success`, `--status-warning`
      y `--status-info` existen en `:root` y no se redeclaran en `.dark`
      (AC4).
- [ ] T8: Crear `frontend/scripts/build-tokens.cjs` que genera **dos
      regiones** de `frontend/src/index.css` a partir de `tokens.json`,
      delimitadas por marcadores: `/* @tokens:theme:start|end */` dentro de
      `@theme` (hoy líneas 28-112) y `/* @tokens:vars:start|end */` dentro
      de `@layer utilities` (`:root` en 378 y `.dark` en 474); el resto del
      archivo (los 260 líneas de `@layer base`, `@utility`, `@keyframes` y
      `@font-face`, los breakpoints, las utilidades custom) sigue escrito a
      mano. El primer run debe producir un **diff vacío** contra el CSS
      actual (baseline: 71 entradas `@theme` ↔ 71 variables en `:root`,
      correspondencia 1 a 1, sin HEX directos en `@theme`) (AC4).
- [ ] T9: Implementar el modo `--check` del generador: falla si el CSS
      commiteado no coincide con el generado; añadir el script
      `tokens:check` a `frontend/package.json` e integrarlo en
      `npm run validate:ci` del frontend (AC4).
- [ ] T10: Generar también `frontend/src/types/tokens.ts` (tipos de TS para
      los tokens) en el mismo paso (AC4).
- [ ] T11: Documentar el formato en `frontend/tokens/README.md`: estructura
      del JSON, el par `token`/`cssVar`, el flag light-only, la relación con
      Figma, y que **cualquier productor** (Tokens Studio u otro) puede
      escribir el fichero (AC4).

## Fase C — Ratchet de tokens activos

- [ ] T12: Extender `frontend/scripts/audit-design-system.cjs` con el cruce
      entre los tokens declarados en `@theme` y sus consumidores reales en
      `frontend/src`; reportar los **tokens huérfanos**. El escáner **excluye
      los falsos consumidores** (`src/features/design-system/**`,
      `src/**/*.stories.tsx`, `src/tests/**`) y **reconoce el consumo
      dinámico** (`bg-token-chart-${index}`,
      `DesignSystemCatalog.view.tsx:204`; `bg-token-status-${tone}/30` y
      `text-token-status-${tone}`, `:174,176`), reportando aparte las clases
      que Tailwind v4 no puede generar (AC5).
- [ ] T13: Añadir `orphanTokenBudget` a `design-system-budget.json`
      inicializado al conteo real medido (**5**: `token-chart-1`,
      `token-chart-3`, `token-chart-8`, `token-status-info-surface`,
      `token-status-info-text` — un build de producción confirma que ninguno
      genera utilidad ni variable de tema en `dist/assets/*.css`) y añadir el
      guardrail que falla si el conteo de huérfanos lo supera (AC5).
- [ ] T14: Eliminar los tokens huérfanos o documentarlos explícitamente como
      "reservados para el siguiente módulo" en `frontend/tokens/README.md`,
      **sin mutilar las escalas contractuales**: las que
      `src/tests/guardrails/statusTokensContrast.test.ts` exige íntegras (11
      estados de dominio × 3, 4 genéricos × 2 y `chart-1..8` en `@theme`) son
      **atómicas** — la escala está activa si al menos un miembro se consume y
      **eliminar un miembro suelto rompe ese guardrail**. El escáner y el
      guardrail deben saber distinguir "token suelto huérfano" de "miembro de
      una escala reservada" (AC5).

## Fase D — Catálogo externo

> **Depende de la spec 033** (orden aprobado **033 → 038**): su **T8**
> parte `DesignSystemCatalog.view.tsx` en hook + container + view, y sus
> **T14-T19** dejan los modales certificados sin imports de `services/`.
> Esta fase se escribe **después**: las stories se montan sobre la
> **superficie presentacional** (sin mocks de `authService`, `emailService`,
> `healthService` ni `importService` en el catálogo).

- [ ] T15: Añadir `storybook` (versión **10**, no 9) y los addons mínimos
      (`@storybook/addon-a11y`) como devDependencies; crear
      `frontend/.storybook/{main.ts,preview.ts}` reutilizando el
      `vite.config.ts` principal (alias y Tailwind) para que las historias
      rendericen **exactamente** lo que renderiza la app
      (`@storybook/react-vite@10.6.3` admite `vite ^5–^8` y `react ^16.8–^19`,
      compatible con Vite 8.3.2 y React 19.3) (AC1). **Storybook 10 es la
      opción por defecto** (decisión del ADR-0027: auditoría a11y con axe-core
      por historia, integración con `@storybook/addon-vitest` y la spec 035, y
      compatibilidad nativa con Vite 8 / React 19). **Ladle 5.1.1 queda como
      fallback documentado**: como las stories son CSF3 puro con imports de
      tipo, cambiar de runner es **un solo fichero de configuración**, sin
      tocar ninguna de las 65 historias.
- [ ] T16: Crear `frontend/src/**/*.stories.tsx` para las primitivas base
      (`Button`, `Input`, `Card`, `Container`, `Badge`, `Select`, `Checkbox`,
      `Switch`, `Textarea`, `EmptyState`, `Skeleton`, `LoadingSpinner`…),
      con variantes, **los estados que apliquen al contrato de props** y
      playground de props (AC1).
- [ ] T17: Crear las historias de las primitivas de formulario y overlay
      (`DatePickerDialog`, `TimePickerDialog`, `NumericKeypad`,
      `PasswordChangeForm`, `CinematicModal`, `ConfirmationModal`, `Tooltip`,
      `ToastItem`…) y de layout (`PageHeader`, `PaginationControls`,
      `SortableHeader`, `ReportTable`, `MetricCard`) (AC1).
- [ ] T18: Crear las historias de las **vistas de feature** (4),
      **shells de layout** (5), **`ErrorBoundary`** y **`LiberalitasSignature`**,
      y la **galería de tokens** para
      `src/features/theoretical-shifts/components/listTokens.ts` (un
      diccionario `.ts` de 41 líneas de clases Tailwind, que **no es un
      componente**): la story muestra las cadenas de clase exportadas, no un
      render. Cada story cubre **los estados y variantes que apliquen al
      contrato de props** de esa entrada (no un catálogo universal:
      `Container`, `Skeleton`, `LiberalitasSignature` y `ErrorBoundary` no
      tienen props `disabled`/`loading`/`error`) (AC1).
- [ ] T19: Crear las historias de los **16 modales y tablas de dominio** de
      `src/features/**`, montando la **superficie presentacional**: el
      `.view.tsx` cuando hay gemelo `.container.tsx` (`SmtpConfigModal`, que
      033 parte en hook + container + view en su **T15**) y el componente con
      el contrato del hook de dominio cuando 033 solo extrae los imports de
      `services/` sin container gemelo (`SeedingProgressModal` — 033 **T16**—,
      `ImportModal` — 033 **T18**—, `ExportLogsModal` — 033 **T19**— y
      `ShiftHistoryModal` — 033 **T14**—). Cerrar la lista
      de **65** entradas de `frontend/design-system-certified.json` y añadir al
      guardrail `designSystemGuardrails.test.ts` la comprobación de que toda
      entrada certificada tiene historia, **con las excepciones de la
      taxonomía** (la galería de `listTokens.ts`) (AC1).
- [ ] T20: Hacer que `features/design-system/` **delegue** la documentación
      (enlazar o consumir las stories) en lugar de reimplementarla, mediante
      un **manifiesto tipado** (`tokens`/`variantes`/`props`) que **no**
      importa runtime de Storybook; las stories usan CSF3 con
      `import type { Meta, StoryObj }` (imports **de tipo**, borrados al
      compilar) y **cero imports de runtime** de `@storybook/*` en
      `*.stories.tsx` ni en código de producción — el bundle de producción no
      contiene el runtime de Storybook. La migración de capas de
      `DesignSystemCatalog.view.tsx` la ejecuta la spec 033 (su **T8**), que
      debe estar **cerrada** antes de esta tarea; además se
      sustituye la interpolación `bg-token-chart-${index}` por clases
      literales, que hoy no generan utilidad en el build (AC2).

## Fase E — Regresión visual y scorecard

- [ ] T21: Implementar la regresión visual de las primitivas certificadas en
      claro y oscuro, apoyándose en la infraestructura de la spec 035
      (`frontend/e2e/visual-regression.spec.ts`); si no está disponible, con
      `toHaveScreenshot` de Playwright sobre las historias, con
      `maxDiffPixelRatio` explícito e imagen base fijada en CI. La suite
      emite un **resumen JSON** (`frontend/visual-regression-summary.json`)
      con qué primitivas cambiaron respecto al baseline (AC3).
- [ ] T22: Extender el reporte de
      `frontend/scripts/audit-design-system.cjs` con una sección que
      **lea** `frontend/visual-regression-summary.json` y lo incruste junto
      al scorecard estático, manteniendo el formato tabular actual. El script
      **no** invoca Playwright ni ningún proceso externo: sigue siendo un
      check estático (hoy corre en 0,096 s) y, cuando el resumen no existe,
      reporta la sección como `skipped` (AC7).
- [ ] T23: Integrar `storybook build` en el pipeline como verificación de que
      las 65 historias compilan (AC8).

## Verificación final

- [ ] T24: Actualizar la documentación: `frontend/README.md` (cómo ejecutar el
      catálogo y regenerar tokens) y
      `.agents/rules/design-system-governance.md` (§7 y §8: la fuente de
      verdad de las certificadas y el pipeline de tokens) (AC8).
- [ ] T25: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run audit:design-system` (ningún budget
      sube), `npm run spec:check`, `npm run docs:check`, `npm run preflight`
      y `npm run e2e:staging` (56 tests) (AC8).
- [ ] T26: Promover `docs/adr/0027-design-system-catalog-pipeline.md` de
      "Propuesto" a "Aceptado" con las líneas de implementación verificadas;
      actualizar la tabla de `docs/adr/README.md` en el mismo commit; marcar
      el spec como "Implementado" (AC8).
