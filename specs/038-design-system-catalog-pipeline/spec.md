# Spec 038: Design System Catalog & Token Pipeline

- Estado: Borrador
- Autor: zer0x
- Fecha: 2026-10-21
- ADR relacionado: [0027-design-system-catalog-pipeline.md](file:///docs/adr/0027-design-system-catalog-pipeline.md) (extiende [0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md) y [0022-ui-ux-consolidation.md](file:///docs/adr/0022-ui-ux-consolidation.md))
- Specs hermanos: [031-ui-ux-consolidation](file:///specs/031-ui-ux-consolidation/spec.md) (superficie UI), [033-frontend-layering-hardening](file:///specs/033-frontend-layering-hardening/spec.md) (frontera de capas), [035-frontend-testing-stack](file:///specs/035-frontend-testing-stack/spec.md) (regresión visual), [037-frontend-rendering-observability](file:///specs/037-frontend-rendering-observability/spec.md) (observabilidad)

## Problema

La spec 031 construyó la **gobernanza** del design system (tokens de dominio,
ratchet completo, primitivas certificadas, catálogo como ruta del app) y la
cerró 20/20. Lo que dejó pendiente son las dos piezas que convierten un
sistema gobernado en un sistema **mantenible por otras personas**:

1. **El catálogo de primitivas es un artefacto del app, no una herramienta de
   trabajo.** `features/design-system/` tiene exactamente 2 ficheros:
   `components/PrimitiveDoc.tsx` (67 líneas) y
   `views/DesignSystemCatalog.view.tsx` (**517 líneas, 7 hooks**), que además
   **es la entrada de ruta** (`/design-system`, gated a Administrador) y
   **no tiene `containers/` ni `hooks/`**. Es decir: el catálogo del design
   system es el componente que **más viola** el estándar de capas del propio
   proyecto. Consecuencias:
   - No se puede documentar una primitiva **en aislamiento** (con props
     arbitrarias, estados de error, modo oscuro, densidades).
   - No hay **playground** interactivo: cada variante exige editar el
     catálogo.
   - No hay **regresión visual** del catálogo: un cambio de token puede
     alterar el catálogo sin que nadie lo note.
   - El catálogo no se puede **consumir desde fuera** (un revisor de PR, un
     diseñador, un agente) sin levantar el backend, autenticarse como
     Administrador y navegar a una ruta hash.

2. **Los tokens no tienen un pipeline de diseño → código.** Hoy hay **262
   custom properties** en `frontend/src/index.css` (65 tokens `token-*`
   únicos) escritos a mano, en un `@theme` de Tailwind v4. El flujo real es:
   un diseñador edita Figma → alguien traduce a mano a `index.css` → el
   `audit-design-system.cjs` verifica que no haya HEX arbitrarios. **No hay
   ninguna garantía de que el nombre del token en Figma sea el nombre del
   token en el código**, ni de que un token nuevo se propague a ambos temas.
   Con 65 tokens y 262 declaraciones, la deriva de nombres es una pregunta
   abierta.

3. **Hay 3 familias de tokens coexistiendo y una está oficialmente muerta.**
   ADR-0020 define `token-*` como la vía canónica y declara `sap-*`
   **deprecada**, pero `sap-*` sigue viva con **432 usos** en
   `frontend/src`. Además, `token-*` convive con el **palette crudo** de
   Tailwind (879 usos, con budget monótono en
   `frontend/design-system-budget.json`: `paletteIssuesBudget: 879`,
   `certifiedPaletteBudget: 173`, `totalIssuesBudget: 0`). Tres vocabularios
   para el mismo concepto ("el color de esta superficie").

4. **El scorecard del audit no está closing el bucle con la evidencia
   visual.** `frontend/scripts/audit-design-system.cjs` produce un compliance
   score por módulo (hoy: `supervisor-dashboard` 65%, `governance` 61%,
   `logbook` 50%, `notifications` 50%, `constants` 50%) basado **solo** en
   análisis estático de clases. El score mide "usa tokens canónicos", pero
   **no mide "se ve bien"**: un token mal aplicado (contraste bajo, jerarquía
   rota) pasa el audit.

## Alcance

Dentro:

- **A. Catálogo de primitivas como herramienta de trabajo**: introducir
  Storybook 9 (o Ladle, más ligero) como catálogo **real** de las 65
  primitivas certificadas, con playground de props, todos los estados, modo
  claro/oscuro y las densidades industriales; **el catálogo dentro del app se
  conserva** como vista de negocio (quién puede ver qué), pero deja de ser la
  única fuente de documentación.
- **B. Regresión visual del design system**: snapshots de las primitivas en
  Storybook y/o en Playwright, para que un cambio de token tenga evidencia
  objetiva (complementa el audit estático con el que no se combinó en 031).
- **C. Pipeline de tokens**: `tokens.json` como **fuente de verdad
  declarativa** de los tokens semánticos, con un paso de build que genera el
  `@theme` de `index.css` (y los tipos de TS), de modo que Figma → JSON →
  CSS/TS sea un proceso verificable y no una traducción manual.
- **D. Retirada de la familia `sap-*`**: migración de los **432 usos** a
  `token-*`, con el ratchet de `sap-*` en cero (budget monotónico nuevo).
- **E. Ratchet de tokens activos**: cada token del `@theme` debe tener
  **al menos un consumidor** en `frontend/src`; los tokens huérfanos se
  reportan y se eliminan. Esto ata el design system al uso real.

Fuera (explícito):

- **El diseño visual de las primitivas**: no cambia. Storybook documenta las
  primitivas **tal como son**; no las rediseña.
- **El color del producto**: el branding por instancia (ADR-0021) y el logo
  configurable (spec 027) no se tocan.
- **`token-*` y su semántica**: no se renombran tokens existentes (rompería
  las 65 primitivas certificadas y las 3.384+ usos de `token-*`); el pipeline
  los adopta tal cual.
- **Migración de `index.css` a un formato distinto**: el archivo sigue siendo
  Tailwind v4 con `@theme`; lo que cambia es que una parte se **genera** en
  lugar de escribirse a mano.
- **Storybook como dependencia de runtime**: es tooling de desarrollo; no
  entra en el bundle de producción.
- **Figma como fuente de verdad automática**: la integración con Figma
  (Tokens Studio) es **opcional** y posterior; esta spec establece el
  formato `tokens.json` y el proceso, de modo que la integración sea un
  productor más de ese fichero.
- Specs hermanas: la regresión visual de pantallas (no de primitivas) es de
  la [spec 035](file:///specs/035-frontend-testing-stack/spec.md); la
  frontera de capas del `features/design-system/` (que hoy es el peor
  infractor) es de la
  [spec 033](file:///specs/033-frontend-layering-hardening/spec.md).

## Criterios de aceptación

- [ ] AC1: **Catálogo de primitivas completo**. Las **65** primitivas de
      `frontend/design-system-certified.json` tienen una historia (story) en
      el catálogo, con: todos los estados (default, hover, focus, disabled,
      loading, error), variantes de color, playground de props y render en
      claro y oscuro. La lista de 65 es la **misma fuente de verdad** que
      consumen `frontend/scripts/audit-design-system.cjs` y
      `frontend/src/tests/guardrails/designSystemGuardrails.test.ts` (no hay
      una lista nueva que mantener en paralelo).
- [ ] AC2: **El catálogo del app deja de ser el único catálogo y deja de
      violar el estándar de capas**. `features/design-system/` pasa a tener
      `containers/`, `views/` y `hooks/` (con la migración de
      `DesignSystemCatalog.view.tsx` que la
      [spec 033](file:///specs/033-frontend-layering-hardening/spec.md)
      ejecuta); el catálogo del app **consume** las stories del catálogo
      externo en lugar de reimplementar la documentación de cada primitiva.
- [ ] AC3: **Regresión visual de las primitivas**. Existen snapshots de las
      primitivas certificadas en claro y oscuro; un cambio de token que
      altere el render de una primitiva **rompe el CI** hasta que el baseline
      se actualice de forma explícita y revisable.
- [ ] AC4: **Pipeline de tokens**. Existe `frontend/tokens.json` como fuente
      de verdad declarativa de los tokens semánticos (`token-*`) y de los
      estados de dominio (`status-*`) y data-viz (`chart-1..8`); un script
      (`frontend/scripts/build-tokens.cjs`) genera el bloque correspondiente
      de `frontend/src/index.css` (**light y dark**) a partir de ese JSON, y
      el build **falla** si el CSS generado no coincide con el commiteado
      (equivalente a `prettier --check` pero para tokens).
- [ ] AC5: **Los tokens tienen consumidor o desaparecen**. Cada token del
      `@theme` tiene al menos un consumidor en `frontend/src`; el script de
      tokens reporta los huérfanos y el guardrail falla si **el número de
      tokens huérfanos supera el budget vigente** (inicializado al conteo
      real medido, decreciente).
- [ ] AC6: **La familia `sap-*` está retirada**. Los **432** usos de `sap-*`
      migran a `token-*` (o a los tokens de estado de dominio donde
      corresponda); el ratchet de `sap-*` queda en **0** y queda bloqueado
      para siempre. Ninguna clase `sap-*` sobrevive en `frontend/src`.
- [ ] AC7: **El scorecard del audit se completa con evidencia visual**. El
      reporte de `frontend/scripts/audit-design-system.cjs` incorpora el
      resultado de la regresión visual (qué primitivas cambiaron respecto al
      baseline) junto al scorecard estático; el reporte es legible y accionable
      por módulo.
- [ ] AC8: **Sin regresión**. `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run audit:design-system` (los budgets
      vigentes **no suben**), `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` en verde y `npm run e2e:staging` en verde (56
      tests).

## Restricciones

- Constitución (I–V): en particular IV ("calidad con ratchet") — todos los
  budgets de esta spec (tokens huérfanos, `sap-*`, palette crudo) **solo
  decrecen**.
- **ADR-0020 se mantiene**: Storybook es **documentación y playground**, no
  un runtime de componentes. Las primitivas siguen siendo las del proyecto;
  Storybook las importa y las documenta.
- **No se renombra ningún token `token-*`**: eso rompería las 65 primitivas
  certificadas y los miles de usos existentes.
- `frontend/src/index.css` **sigue siendo Tailwind v4 con `@theme`**: el
  pipeline genera una parte del bloque, no cambia el formato.
- El catálogo del app **no se elimina**: es la vista de negocio para el
  Administrador; se le **delega** la documentación.
- Storybook es **tooling de desarrollo**: no entra en el bundle de
  producción ni en el precache de Workbox.
- Rollback por fase: cada workstream (A–E) es un PR independiente.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/src/tests/guardrails/tokenPipelineGuardrails.test.ts` (nuevo:
    CSS generado == commiteado, tokens huérfanos ≤ budget, `sap-*` == 0,
    AC4, AC5, AC6)
  - `frontend/scripts/build-tokens.cjs` (nuevo, AC4)
  - `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`
    (extendido: las 65 certificadas tienen story, AC1)
  - `frontend/e2e/visual-regression.spec.ts` (de la spec 035; las primitivas
    se suman al conjunto, AC3)
- **Docs a actualizar**:
  - `frontend/tokens.json` (nuevo, con un README que explique el formato y
    cómo se relaciona con Figma)
  - `frontend/README.md`: cómo ejecutar el catálogo, cómo regenerar tokens
  - `.agents/rules/design-system-governance.md` (§7 y §8 actualizadas: la
    fuente de verdad de las certificadas y el pipeline de tokens)
  - `docs/adr/0027-design-system-catalog-pipeline.md`
  - `docs/adr/README.md` (índice)
