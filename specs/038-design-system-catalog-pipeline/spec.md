# Spec 038: Design System Catalog & Token Pipeline

- Estado: Implementado (2026-10-23; E2E staging aislado 70/70 sobre origin/main 376f293)
- Autor: zer0x
- Fecha: 2026-10-21
- ADR relacionado: [0027-design-system-catalog-pipeline.md](file:///docs/adr/0027-design-system-catalog-pipeline.md) (extiende [0020-design-system-governance.md](file:///docs/adr/0020-design-system-governance.md) y [0022-ui-ux-consolidation.md](file:///docs/adr/0022-ui-ux-consolidation.md))
- Specs hermanos: [031-ui-ux-consolidation](file:///specs/031-ui-ux-consolidation/spec.md) (superficie UI), [033-frontend-layering-hardening](file:///specs/033-frontend-layering-hardening/spec.md) (frontera de capas), [035-frontend-testing-stack](file:///specs/035-frontend-testing-stack/spec.md) (regresión visual), [037-frontend-rendering-observability](file:///specs/037-frontend-rendering-observability/spec.md) (observabilidad)

## Dependencias de secuencia

| Fase  | Tareas  | Dependencia                                                                           |
| ----- | ------- | ------------------------------------------------------------------------------------- |
| A     | T1-T6   | **Ninguna bloqueante**: ejecutable de inmediato                                       |
| B     | T7-T11  | **Ninguna bloqueante**: ejecutable de inmediato                                       |
| C     | T12-T14 | **Ninguna bloqueante**: ejecutable de inmediato                                       |
| D     | T15-T20 | **Spec 033 integrada** en `main` (`1276f47`, `32f438f`); dependencia satisfecha       |
| E     | T21-T23 | Infraestructura de la spec 035 disponible en `frontend/e2e/visual-regression.spec.ts` |
| Final | T24-T26 | **Ninguna bloqueante**: verificación, documentación y promoción del ADR               |

El orden interno dentro de A es A → B → C: retirar `sap-*` y poner los
tokens bajo ratchet **simplifica** el catálogo; migrar 431 usos antes de
tener el pipeline sería reescribir a ciegas.

**Orden 033 → 038 (aprobado).** La Fase D es la única que consume la spec
033, y lo hace **después**, no en paralelo:

- **La spec 033 va primero** porque `DesignSystemCatalog.view.tsx` (517
  líneas, 7 hooks) es hoy la vista que más viola el estándar de capas. Si
  esta spec lo tocara antes (T20, enchufe del manifiesto), la spec 033
  (T8) tendría que volver a partir ese mismo fichero → doble trabajo sobre
  el mismo archivo. Con 033 primero, T20 solo enchufa el manifiesto en un
  hook/container ya limpios.
- **Las stories de los modales certificados** (T19) se escriben **después**
  de 033: se montan sobre superficies ya puras, sin tener que mockear
  `authService`, `emailService`, `healthService` ni `importService` en el
  catálogo.
- **Las Fases A, B y C no chocan con la spec 033** y pueden ejecutarse en
  cualquier momento (incluso antes o en paralelo): solo tocan `index.css`,
  `scripts/`, `design-system-budget.json` y los 431 usos de `sap-*`.

Consecuencia operativa: la spec 033 completó T8 y T14-T19 en `main` con los
commits `1276f47` y `32f438f` (2026-10-23). La fase D queda habilitada y monta
las historias sobre las superficies presentacionales ya extraídas.

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
   - Y el catálogo **miente** sobre el design system: construye clases por
     interpolación (`bg-token-chart-${index}`,
     `DesignSystemCatalog.view.tsx:204`; `bg-token-status-${tone}/30` y
     `text-token-status-${tone}`, `:174,176`), que Tailwind v4 **no puede
     detectar estáticamente**. Un build de producción lo confirma: las
     utilidades `.bg-token-chart-1`, `.bg-token-chart-3` y `.bg-token-chart-8`
     **no se generan** en `dist/assets/*.css`, así que esas muestras se
     renderizan **sin color**.

2. **Los tokens no tienen un pipeline de diseño → código.** Hoy hay **71
   tokens `--color-token-*`** en el `@theme` de `frontend/src/index.css`
   (líneas 28-112) y **71 custom properties** en el `:root` de
   `@layer utilities` (línea 378), apuntados 1 a 1 pero **con nombres que no
   coinciden** (`token-accent-brand` → `var(--accent-professional)`,
   `token-text-onAccent` → `var(--text-on-accent)`). El flujo real es: un
   diseñador edita Figma → alguien traduce a mano a `index.css` → el
   `audit-design-system.cjs` verifica que no haya HEX arbitrarios. **No hay
   ninguna garantía de que el nombre del token en Figma sea el nombre del
   token en el código**, ni de que un token nuevo se propague a ambos temas.
   Con 71 tokens y 142 declaraciones en **dos regiones separadas por 260
   líneas** de `@layer base`, `@utility`, `@keyframes` y `@font-face`, la
   deriva de nombres es una pregunta abierta.

3. **Hay 3 familias de tokens coexistiendo y una está oficialmente muerta.**
   ADR-0020 define `token-*` como la vía canónica y declara `sap-*`
   **deprecada**, pero `sap-*` sigue viva con **432 ocurrencias** en
   `frontend/src` (**431** en producción + **1** en
   `src/tests/features/dashboard/useToolsLogic.test.ts`). Además, `token-*`
   convive con el **palette crudo** de Tailwind (879 usos, con budget
   monótono en `frontend/design-system-budget.json`: `paletteIssuesBudget:
879`, `certifiedPaletteBudget: 173`, `totalIssuesBudget: 0`). Tres
   vocabularios para el mismo concepto ("el color de esta superficie").

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
  Storybook 10 como catálogo **real** de las **68 entradas** certificadas,
  con playground de props, los estados que apliquen al contrato de props de
  cada entrada, modo claro/oscuro y las densidades industriales; **el
  catálogo dentro del app se conserva** como vista de negocio (quién puede
  ver qué), pero deja de ser la única fuente de documentación.
- **B. Regresión visual del design system**: snapshots de las primitivas en
  Storybook y/o en Playwright, para que un cambio de token tenga evidencia
  objetiva (complementa el audit estático con el que no se combinó en 031).
- **C. Pipeline de tokens**: `tokens.json` como **fuente de verdad
  declarativa** de los tokens semánticos, con un paso de build que genera
  las **dos regiones** de `index.css` (el `@theme` y las variables de
  `@layer utilities`), de modo que Figma → JSON → CSS/TS sea un proceso
  verificable y no una traducción manual.
- **D. Retirada de la familia `sap-*`**: migración de los **431 usos** de
  producción a `token-*`, con el ratchet de `sap-*` en cero (budget monotónico
  nuevo).
- **E. Ratchet de tokens activos**: cada token del `@theme` debe tener
  **al menos un consumidor** en `frontend/src`, **respetando las escalas
  contractuales** que el guardrail de contraste declara íntegras.

Fuera (explícito):

- **El diseño visual de las primitivas**: no cambia. Storybook documenta las
  primitivas **tal como son**; no las rediseña.
- **El color del producto**: el branding por instancia (ADR-0021) y el logo
  configurable (spec 027) no se tocan.
- **`token-*` y su semántica**: no se renombran tokens existentes (rompería
  las 68 entradas certificadas y los miles de usos de `token-*`); el pipeline
  los adopta tal cual.
- **Migración de `index.css` a un formato distinto**: el archivo sigue siendo
  Tailwind v4 con `@theme`; lo que cambia es que **dos regiones** se
  **generan** en lugar de escribirse a mano.
- **Storybook como dependencia de runtime**: es tooling de desarrollo; no
  entra en el bundle de producción ni en el precache de Workbox.
- **Figma como fuente de verdad automática**: la integración con Figma
  (Tokens Studio) es **opcional** y posterior; esta spec establece el
  formato `tokens.json` y el proceso, de modo que la integración sea un
  productor más de ese fichero.
- Specs hermanas: la regresión visual de pantallas (no de primitivas) es de la
  [spec 035](file:///specs/035-frontend-testing-stack/spec.md); la
  frontera de capas del `features/design-system/` (que hoy es el peor
  infractor) es de la
  [spec 033](file:///specs/033-frontend-layering-hardening/spec.md).

## Criterios de aceptación

- [x] AC1: **Catálogo de las 68 entradas certificadas, con la taxonomía
      correcta**. El catálogo externo es **Storybook 10** (decisión del
      [ADR-0027](file:///docs/adr/0027-design-system-catalog-pipeline.md);
      **Ladle 5.1.1** queda como **fallback** documentado). Las **68 entradas**
      de `frontend/design-system-certified.json` tienen una historia (story)
      en el catálogo. La taxonomía es explícita, porque **no todas son
      primitivas ni componentes React**: - **40** están en
      `src/components/ui/` (primitivas canónicas); - **21** en
      `src/features/**` (**16** modales/tablas de dominio, **4**
      vistas completas de feature —`AssignmentManager.view.tsx`,
      `HolidayManager.view.tsx`, `LeaveManager.view.tsx`,
      `PatternManager.view.tsx`— y **1** fichero que **no es componente**:
      `src/features/theoretical-shifts/components/listTokens.ts`, un
      diccionario `.ts` de 41 líneas de clases Tailwind, que se documenta
      como **galería de tokens** (la story muestra las cadenas de clase
      exportadas, no un componente); - **5** en `src/components/layout/` (shells completos: `Header.view.tsx`,
      `Sidebar.view.tsx`, `SidebarNavItem.tsx`, `PersistentLayout.view.tsx`,
      `NotificationCenter.view.tsx`); - **2** en `src/components/` (`ErrorBoundary.tsx`,
      `LiberalitasSignature.tsx`).
      Cada story cubre **los estados y variantes que apliquen al contrato de
      props de esa entrada** (no un catálogo universal: `Container`,
      `Skeleton`, `LiberalitasSignature` y `ErrorBoundary` no tienen props
      `disabled`/`loading`/`error`), con playground de props y render en claro
      y oscuro. En los componentes que la
      [spec 033](file:///specs/033-frontend-layering-hardening/spec.md)
      parte, la story se monta sobre la **superficie presentacional** (el
      `.view.tsx` cuando hay gemelo `.container.tsx` —`SmtpConfigModal`, que
      033 parte en su T15—; el componente con el contrato del hook de
      dominio cuando 033 solo extrae los imports de `services/` —`T16`
      `SeedingProgressModal`, `T18` `ImportModal`, `T19` `ExportLogsModal` y
      `T14` `ShiftHistoryModal`—). La lista de 68 es la **misma
      fuente de verdad** que consumen `frontend/scripts/audit-design-system.cjs`
      y `frontend/src/tests/guardrails/designSystemGuardrails.test.ts` (no hay
      una lista nueva que mantener en paralelo).
- [x] AC2: **El catálogo del app deja de ser el único catálogo, deja de
      violar el estándar de capas y no arrastra runtime de Storybook**.
      `features/design-system/` pasa a tener `containers/`, `views/` y
      `hooks/` (con la migración de `DesignSystemCatalog.view.tsx` que la
      [spec 033](file:///specs/033-frontend-layering-hardening/spec.md)
      ejecuta); el catálogo del app **consume** la documentación de las
      stories en lugar de reimplementarla, **mediante un manifiesto tipado**
      (`tokens`/`variantes`/`props`) que **no** importa runtime de Storybook.
      Las stories usan CSF3 con `import type { Meta, StoryObj }` —imports
      **de tipo**, borrados al compilar— y **cero imports de runtime** de
      `@storybook/*` en `*.stories.tsx` ni en código de producción: el bundle
      de producción no contiene el runtime de Storybook.
- [x] AC3: **Regresión visual de las primitivas**. Existen snapshots de las
      primitivas certificadas en claro y oscuro; un cambio de token que
      altere el render de una primitiva **rompe el CI** hasta que el baseline
      se actualice de forma explícita y revisable.
- [x] AC4: **Pipeline de tokens sobre las dos regiones reales de
      `index.css`**. Existe `frontend/tokens.json` como fuente de verdad
      declarativa de los tokens semánticos (`token-*`), de los estados de
      dominio (`status-*`) y de data-viz (`chart-1..8`); un script
      (`frontend/scripts/build-tokens.cjs`) genera **dos regiones delimitadas
      por marcadores**: el bloque `@theme` (líneas 28-112) y las variables de
      `@layer utilities` (`:root` en 378 y `.dark` en 474), y el build
      **falla** si el CSS generado no coincide con el commiteado (equivalente
      a `prettier --check` pero para tokens). El modelo **conserva la clave
      pública y la variable CSS subyacente** (`token-accent-brand` →
      `--accent-professional`; `token-text-onAccent` → `--text-on-accent`) y
      admite **variables declaradas solo en claro** (`--status-success`,
      `--status-warning` y `--status-info` existen en `:root` pero no se
      redeclaran en `.dark`). El primer run produce un **diff vacío** contra
      el CSS actual (hoy: 71 entradas en `@theme` ↔ 71 variables en `:root`,
      correspondencia 1 a 1 sin HEX directos en `@theme`).
- [x] AC5: **Los tokens tienen consumidor o desaparecen, sin mutilar las
      escalas contractuales**. Cada token del `@theme` tiene al menos un
      consumidor real; el script de tokens reporta los huérfanos y el guardrail
      falla si **el número de tokens huérfanos supera el budget vigente**
      (inicializado al conteo real medido, decreciente). Dos reglas lo
      hacen seguro: - **El escáner excluye los falsos consumidores**: ignora
      `src/features/design-system/**`, `src/**/*.stories.tsx` y
      `src/tests/**`, porque el propio catálogo y las stories se
      autobastecerían y dejarían ciego al detector. - **Las escalas contractuales son atómicas**: las que
      `frontend/src/tests/guardrails/statusTokensContrast.test.ts` exige
      íntegras (11 estados de dominio × 3, 4 estados genéricos × 2 y
      `chart-1..8` en `@theme`) **no se mutilan miembro a miembro**: una
      escala está activa si **al menos un** miembro se consume, y eliminar
      un miembro suelto **rompe** ese guardrail.
      El baseline medido es **5** tokens sin consumidor estático
      (`token-chart-1`, `token-chart-3`, `token-chart-8`,
      `token-status-info-surface`, `token-status-info-text`): los tres
      `chart` están dentro de la escala protegida, y los dos `status-info` son
      miembros de la escala genérica protegida.
- [x] AC6: **La familia `sap-*` está retirada**. Los **431** usos de
      producción (más 1 en tests) de `sap-*` migran a `token-*` (o a los
      tokens de estado de dominio donde corresponda); el ratchet de `sap-*`
      queda en **0** y bloqueado para siempre. Ninguna clase `sap-*`
      sobrevive en `frontend/src`.
- [x] AC7: **El scorecard del audit se completa con evidencia visual, sin
      convertirse en un runner**. `frontend/scripts/audit-design-system.cjs`
      sigue siendo un **check estático y rápido** (hoy corre en **0,096 s**):
      **no** invoca Playwright ni ningún proceso externo. Incorpora el
      resultado de la regresión visual **leyendo un resumen JSON opcional**
      (`frontend/visual-regression-summary.json`, emitido por la suite visual);
      cuando ese resumen no existe, la sección se reporta como `skipped`
      (sin artefacto visual) en las corridas estáticas locales. El reporte es
      legible y accionable por módulo.
- [x] AC8: **Sin regresión**. `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run audit:design-system` (los budgets
      vigentes **no suben**), `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` en verde y la suite Playwright completa en staging
      en verde (70 pruebas: 55 funcionales, 12 visuales y 3 de rendimiento).
      La corrida final usó `compose.staging.yaml` con proyecto/base aislados,
      construidos desde esta rama, en `127.0.0.1:8081`; no tocó el staging
      compartido en `127.0.0.1:8080`. La submedición de scroll de auditoría
      se auto-omitió porque el seed limpio no tenía eventos de auditoría.

## Restricciones

- Constitución (I–V): en particular IV ("calidad con ratchet") — todos los
  budgets de esta spec (tokens huérfanos, `sap-*`, palette crudo) **solo
  decrecen**.
- **ADR-0020 se mantiene**: Storybook es **documentación y playground**, no
  un runtime de componentes. Las primitivas siguen siendo las del proyecto;
  Storybook las importa y las documenta.
- **No se renombra ningún token `token-*`**: eso rompería las 68 entradas
  certificadas y los miles de usos existentes.
- **El pipeline no toca la paleta de `status-*` ni de `chart-*`**: se
  **generan**, no se redefinen; sus valores y su contrato de contraste siguen
  siendo los que fija `statusTokensContrast.test.ts`.
- `frontend/src/index.css` **sigue siendo Tailwind v4 con `@theme`**: el
  pipeline genera dos regiones, no cambia el formato.
- **El catálogo del app no se elimina**: es la vista de negocio para el
  Administrador; se le **delega** la documentación.
- **Storybook es tooling de desarrollo**: no entra en el bundle de producción
  ni en el precache de Workbox. Las stories usan **imports de tipo**
  (`import type { Meta, StoryObj }`), que el compilador borra; y el catálogo
  del app consume un **manifiesto tipado**, no el runtime de Storybook.
- **El audit script no gana dependencias**: es un check estático que solo lee
  ficheros; la evidencia visual entra como **resumen JSON**, nunca como una
  invocación a Playwright.
- Rollback por fase: cada workstream (A–E) es un PR independiente.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/src/tests/guardrails/tokenPipelineGuardrails.test.ts` (nuevo:
    CSS generado == commiteado, tokens huérfanos ≤ budget con las reglas de
    escala atómica, `sap-*` == 0, AC4, AC5, AC6)
  - `frontend/scripts/build-tokens.cjs` (nuevo, AC4)
  - `frontend/src/tests/guardrails/designSystemGuardrails.test.ts`
    (extendido: las 68 entradas certificadas tienen story, con las
    excepciones de la taxonomía de AC1, AC1)
  - `frontend/e2e/visual-regression.spec.ts` (de la spec 035; las primitivas
    se suman al conjunto, AC3)
- **Docs a actualizar**:
  - `frontend/tokens.json` (nuevo, con un README que explique el formato,
    el par `token`/`cssVar` y cómo se relaciona con Figma)
  - `frontend/README.md`: cómo ejecutar el catálogo, cómo regenerar tokens
  - `.agents/rules/design-system-governance.md` (§7 y §8 actualizadas: la
    fuente de verdad de las certificadas y el pipeline de tokens)
  - `docs/adr/0027-design-system-catalog-pipeline.md`
  - `docs/adr/README.md` (índice)
