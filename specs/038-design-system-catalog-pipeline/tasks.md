# Tareas 038: Design System Catalog & Token Pipeline

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — Retirada de la familia `sap-*`

- [ ] T1: Medir el delta semántico entre `sap-*` (432 usos) y `token-*`:
      construir el **mapa de equivalencias** (`sap-*` → `token-*` o → token de
      estado de dominio `status-*`) y publicarlo en el PR; ningún `sap-*` se
      traduce sin una entrada en el mapa (AC6).
- [ ] T2: Añadir el contador de `sap-*` a
      `frontend/scripts/audit-design-system.cjs` y el budget
      `sapTokenBudget` a `frontend/design-system-budget.json` (versión 2 → 3),
      inicializado al conteo real (432) con la **política monótona**
      (solo decrece, `--update` aborta si sube) (AC6).
- [ ] T3: Migrar los usos de `sap-*` en `frontend/src/components/ui/` y
      `frontend/src/components/layout/`, con comparación en claro/oscuro para
      verificar el contraste AA (invariante de ADR-0020) (AC6).
- [ ] T4: Migrar los usos de `sap-*` en `frontend/src/features/**/` y
      `frontend/src/utils/**`, por lotes; al final del lote, `sapTokenBudget`
      baja y el audit lo refleja (AC6).
- [ ] T5: Eliminar la familia `sap-*` del `@theme` de
      `frontend/src/index.css` cuando el contador llegue a **0**; añadir el
      ratchet que bloquea `sap-*` para siempre (AC6).

## Fase B — Pipeline de tokens

- [ ] T6: Crear `frontend/tokens.json` con la fuente de verdad declarativa
      de los tokens semánticos (`token-*`), los estados de dominio
      (`status-*`) y la paleta de data-viz (`chart-1..8`), con sus variantes
      light/dark (AC4).
- [ ] T7: Crear `frontend/scripts/build-tokens.cjs` que genera el bloque de
      tokens de `frontend/src/index.css` a partir de `tokens.json`, delimitado
      por marcadores para que el resto del archivo (breakpoints, utilidades
      custom, media queries) siga escrito a mano; el primer run debe producir
      un **diff vacío** contra el CSS actual (AC4).
- [ ] T8: Implementar el modo `--check` del generador: falla si el CSS
      commiteado no coincide con el generado; añadir el script
      `tokens:check` a `frontend/package.json` e integrarlo en
      `npm run validate:ci` del frontend (AC4).
- [ ] T9: Generar también `frontend/src/types/tokens.ts` (tipos de TS para los
      tokens) en el mismo paso (AC4).
- [ ] T10: Documentar el formato en `frontend/tokens/README.md`: estructura
      del JSON, relación con Figma, y que **cualquier productor** (Tokens
      Studio u otro) puede escribir el fichero (AC4).

## Fase C — Ratchet de tokens activos

- [ ] T11: Extender `frontend/scripts/audit-design-system.cjs` con el cruce
      entre los tokens declarados en `@theme` y sus consumidores reales en
      `frontend/src`; reportar los **tokens huérfanos** (AC5).
- [ ] T12: Añadir `orphanTokenBudget` a `design-system-budget.json`
      inicializado al conteo real medido (decreciente) y añadir el
      guardrail que falla si el conteo de huérfanos lo supera (AC5).
- [ ] T13: Eliminar los tokens huérfanos o documentarlos explícitamente como
      "reservados para el siguiente módulo" en `frontend/tokens/README.md`
      (AC5).

## Fase D — Catálogo externo

- [ ] T14: Añadir `storybook` y los addons mínimos (`@storybook/addon-a11y`)
      como devDependencies; crear `frontend/.storybook/{main.ts,preview.ts}`
      reutilizando el `vite.config.ts` principal (alias y Tailwind) para que
      las historias rendericen **exactamente** lo que renderiza la app
      (AC1).
- [ ] T15: Crear `frontend/src/**/*.stories.tsx` para las primitivas base
      (`Button`, `Input`, `Card`, `Container`, `Badge`, `Select`, `Checkbox`,
      `Switch`, `Textarea`, `EmptyState`, `Skeleton`, `LoadingSpinner`…),
      con variantes, estados y playground de props (AC1).
- [ ] T16: Crear las historias de las primitivas de formulario y overlay
      (`DatePickerDialog`, `TimePickerDialog`, `NumericKeypad`,
      `PasswordChangeForm`, `CinematicModal`, `ConfirmationModal`, `Tooltip`,
      `ToastItem`…) y de layout (`PageHeader`, `PaginationControls`,
      `SortableHeader`, `ReportTable`, `MetricCard`) (AC1).
- [ ] T17: Completar las historias de los modales de dominio migrados en la
      spec 031 y las primitivas restantes, hasta cubrir las **65**
      certificadas de `frontend/design-system-certified.json`; añadir al
      guardrail `designSystemGuardrails.test.ts` la comprobación de que toda
      certificada tiene historia (AC1).
- [ ] T18: Hacer que `features/design-system/` **delegue** la documentación
      (enlazar o consumir las stories) en lugar de reimplementarla; la
      migración de capas de `DesignSystemCatalog.view.tsx` la ejecuta la spec
      033 (AC2).

## Fase E — Regresión visual y scorecard

- [ ] T19: Implementar la regresión visual de las primitivas certificadas en
      claro y oscuro (apoyándose en la infraestructura de la spec 035 si ya
      está disponible; si no, con `toHaveScreenshot` de Playwright sobre las
      historias), con `maxDiffPixelRatio` explícito e imagen base fijada en
      CI (AC3).
- [ ] T20: Extender el reporte de
      `frontend/scripts/audit-design-system.cjs` con una sección que
      incorpore el resultado de la regresión visual (qué primitivas cambiaron
      respecto al baseline) junto al scorecard estático, manteniendo el
      formato tabular actual (AC7).
- [ ] T21: Integrar `storybook build` en el pipeline como verificación de que
      las 65 historias compilan (AC8).

## Verificación final

- [ ] T22: Actualizar la documentación: `frontend/README.md` (cómo ejecutar el
      catálogo y regenerar tokens) y
      `.agents/rules/design-system-governance.md` (§7 y §8: la fuente de
      verdad de las certificadas y el pipeline de tokens) (AC8).
- [ ] T23: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run audit:design-system` (ningún budget
      sube), `npm run spec:check`, `npm run docs:check`, `npm run preflight`
      y `npm run e2e:staging` (56 tests) (AC8).
- [ ] T24: Promover `docs/adr/0027-design-system-catalog-pipeline.md` de
      "Propuesto" a "Aceptado" con las líneas de implementación verificadas;
      actualizar la tabla de `docs/adr/README.md` en el mismo commit; marcar
      el spec como "Implementado" (AC8).
