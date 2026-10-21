# ADR-0027: Design System Catalog & Token Pipeline — Catálogo externo y tokens generados

- Estado: Propuesto
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

La spec 031 construyó la **gobernanza** del design system y la cerró 20/20:
tokens de dominio (`status-*`), paleta de data-viz (`chart-1..8`), ratchet
completo de palette crudo, 65 entradas certificadas, catálogo como ruta del
app y escala z con nombres. Lo que quedó pendiente son las dos piezas que
hacen que un sistema gobernado sea **mantenible por personas distintas de
quien lo escribió**.

1. **El catálogo de primitivas es un artefacto del app, no una herramienta de
   trabajo.** `features/design-system/` tiene **2 ficheros**:
   `components/PrimitiveDoc.tsx` (67 líneas) y
   `views/DesignSystemCatalog.view.tsx` (**517 líneas, 7 hooks**) que además
   **es la entrada de ruta** (`/design-system`, gated a Administrador) y
   **no tiene `containers/` ni `hooks/`**. Es decir: **el catálogo del design
   system es el componente que más viola el estándar de capas del propio
   proyecto** (spec 033). Consecuencias:
   - no se puede documentar una primitiva **en aislamiento** (props
     arbitrarias, estados de error, modo oscuro);
   - no hay playground: cada variante exige editar el catálogo;
   - no hay regresión visual del catálogo;
   - no se puede consumir desde fuera (revisor de PR, diseñador, agente) sin
     levantar backend, autenticarse como Administrador y navegar a una ruta
     hash.

   Y el catálogo **miente sobre el design system**: construye clases por
   interpolación (`bg-token-chart-${index}`,
   `DesignSystemCatalog.view.tsx:204`; `bg-token-status-${tone}/30` y
   `text-token-status-${tone}`, `:174,176`), que Tailwind v4 no puede
   detectar estáticamente. Un build de producción lo confirma: las
   utilidades `.bg-token-chart-1`, `.bg-token-chart-3` y `.bg-token-chart-8`
   **no se generan** en `dist/assets/*.css` (ni sus variables de tema), así
   que esas muestras se renderizan **sin color**.

2. **Los tokens no tienen pipeline de diseño → código.** `frontend/src/index.css`
   tiene **71 entradas `--color-token-*`** en el `@theme` (líneas 28-112) y
   **71 custom properties** en el `:root` de `@layer utilities` (línea 378),
   escritos a mano. Las dos regiones están **separadas por 260 líneas** de
   `@layer base`, `@utility`, `@keyframes` y `@font-face`. El mapeo es 1 a 1
   pero **no por nombre**: `token-accent-brand` → `var(--accent-professional)`,
   `token-text-onAccent` → `var(--text-on-accent)`, y hay **3 variables
   light-only** (`--status-success`, `--status-warning`, `--status-info`:
   existen en `:root` y **no** se redeclaran en `.dark`, que empieza en la
   línea 474). El flujo real es: Figma → traducción manual a `index.css` →
   `audit-design-system.cjs` verifica que no haya HEX arbitrarios. **No hay
   garantía de que el nombre del token en Figma sea el del token en el
   código**, ni de que un token nuevo se propague a ambos temas. Con 71
   tokens y 142 declaraciones en dos regiones, la deriva de nombres es una
   pregunta abierta.

3. **Conviven 3 vocabularios de color.** ADR-0020 define `token-*` como la
   vía canónica y declara `sap-*` **deprecada**, pero `sap-*` sigue viva con
   **432 ocurrencias** en `frontend/src`: **431** en producción (por token:
   `sap-blue` 362, `sap-error` 36, `sap-success` 14, `sap-warning` 10,
   `sap-light-blue` 8, `sap-blue-dark` 1) y **1** en
   `src/tests/features/dashboard/useToolsLogic.test.ts`. De los **11**
   `--color-sap-*` declarados (`index.css:16-26`), **6 no tienen ningún
   uso** (`sap-gray`, `sap-bone`, `sap-dark-gray`, `sap-medium-gray`,
   `sap-border`, `sap-info`), **4 son alias 1:1** (`sap-blue` →
   `token-accent-brand`, `sap-error` → `token-status-error`, `sap-success` →
   `token-status-success`, `sap-warning` → `token-status-warning`) y **1
   tiene delta semántico real** (`sap-light-blue` = `#007bff`). Además
   `sap-blue-dark` **se usa** (`QuickActionModal.view.tsx:164`) pero **no
   está declarado**: hoy `hover:bg-sap-blue-dark` no genera ninguna utilidad.
   Y `token-*` convive con el **palette crudo** de Tailwind (**879 usos**,
   con budget monótono en `frontend/design-system-budget.json`:
   `totalIssuesBudget: 0`, `paletteIssuesBudget: 879`,
   `certifiedPaletteBudget: 173`). Tres vocabularios para el mismo concepto.

4. **El scorecard del audit es solo estático.** `audit-design-system.cjs`
   produce un compliance score por módulo (hoy: `supervisor-dashboard` 65%,
   `governance` 61%, `logbook` 50%, `notifications` 50%, `constants` 50%)
   a partir del **análisis de clases**. Mide "usa tokens canónicos", pero
   **no mide "se ve bien"**: un token mal aplicado (contraste bajo, jerarquía
   rota) pasa el audit. El script es, además, un **check estático rápido**
   (0,096 s medidos) que solo lee ficheros con `fs`, y **no corre ni en CI
   ni en `validate:ci`**: solo existe el script `npm run audit:design-system`.

5. **No hay ratchet de tokens huérfanos.** Nada impide que `@theme` acumule
   tokens que nadie usa: son deuda que nadie ve porque no aparece en ningún
   consumo. Hoy hay **5** tokens sin consumidor estático
   (`token-chart-1`, `token-chart-3`, `token-chart-8`,
   `token-status-info-surface`, `token-status-info-text`), y un build
   confirma que **ninguno** genera utilidad ni variable de tema. Pero
   borrarlos a mano rompería
   `src/tests/guardrails/statusTokensContrast.test.ts`, que exige íntegras
   las escalas de 11 estados de dominio × 3, 4 estados genéricos × 2 y
   `chart-1..8` en `@theme`.

## Decisión

1. **El catálogo de primitivas se externaliza a Storybook 10** (tooling de
   desarrollo, no runtime), con **Ladle 5.1.1 como fallback documentado**.
   Una historia por cada una de las **65 entradas**
   de `frontend/design-system-certified.json`, **con la taxonomía que el
   fichero real impone**: 37 primitivas en `src/components/ui/`, 21 en
   `src/features/**` (16 modales/tablas de dominio, 4 vistas de feature y
   `listTokens.ts`, un diccionario `.ts` de 41 líneas de clases Tailwind que
   **no es un componente** y se documenta como **galería de tokens**), 5
   shells en `src/components/layout/` y 2 en `src/components/`
   (`ErrorBoundary.tsx`, `LiberalitasSignature.tsx`). Cada historia cubre
   **los estados y variantes que apliquen al contrato de props** de esa
   entrada (un catálogo universal de `default/hover/focus/disabled/loading/
error` no aplica a `Container`, `Skeleton`, `LiberalitasSignature` ni
   `ErrorBoundary`, que no tienen esas props). La lista de 65 **sigue siendo
   la fuente de verdad única**: la consumen el audit script, el guardrail y
   el catálogo — no hay una lista paralela que mantener. **El catálogo dentro
   del app se conserva** (es la vista de negocio para el Administrador) pero
   **delega** la documentación.

   Storybook 10 gana por: **auditoría a11y de primera clase** (el proyecto
   tiene invariantes duras de WCAG AA, focus traps y regiones scrollables —
   `.agents/rules/design-system-governance.md` §5; Storybook 10 integra
   axe-core por historia y `@storybook/addon-vitest`, que conecta con la spec
   035), **compatibilidad nativa** con Vite 8 y React 19 sin capas de
   Webpack, y **ausencia de lock-in**: al ser las historias CSF3 puro con
   imports de tipo, cambiar de runner es **un solo fichero de
   configuración**, sin tocar ninguna de las 65 historias.

2. **Storybook no toca el bundle de producción.** Las historias usan CSF3 con
   `import type { Meta, StoryObj }` (imports **de tipo**, borrados al
   compilar) y **cero imports de runtime** de `@storybook/*`; el catálogo del
   app consume un **manifiesto tipado** (`tokens`/`variantes`/`props`), no el
   runtime de Storybook. El playground de props es `args` + el addon
   **Controls** incluido en el core de Storybook 9+: **`@storybook/blocks`
   queda congelado en 8.6.14** y no es dependencia de Storybook 10, así que
   no se usa.

3. **Los tokens tienen fuente de verdad declarativa.** `frontend/tokens.json`
   es la fuente de verdad de los tokens semánticos (`token-*`), de los
   estados de dominio (`status-*`) y de la paleta de data-viz (`chart-1..8`),
   con sus variantes light/dark. Cada entrada guarda **las dos claves**: la
   pública (`token-accent-brand`) y la variable CSS subyacente (`cssVar:
--accent-professional`), porque el mapeo no es 1:1 por nombre; y admite
   **variables light-only** (`--status-success`, `--status-warning`,
   `--status-info`). `frontend/scripts/build-tokens.cjs` genera **dos
   regiones** delimitadas por marcadores (`/* @tokens:theme:start|end */`
   dentro de `@theme` y `/* @tokens:vars:start|end */` dentro de
   `@layer utilities`) y los tipos de TS. El formato del JSON es un
   **contrato**: cualquier productor (Tokens Studio para Figma u otro) puede
   escribirlo.

4. **El CSS generado se verifica en CI.** El generador tiene un modo
   `--check` que **falla si el CSS commiteado no coincide con el generado**,
   y se integra en `npm run validate:ci` del frontend. Es el mismo patrón que
   `prettier --check` pero para tokens. El primer run debe producir un
   **diff vacío** contra el CSS actual.

5. **La familia `sap-*` se retira.** Las **431** ocurrencias de producción
   migran a `token-*` o a los tokens de estado de dominio, con un **mapa de
   equivalencias** revisado en el PR. El ratchet de `sap-*` queda en **0** y
   bloqueado para siempre. El contador se implementa **separado** de
   `fileStrictIssues`: hoy `audit-design-system.cjs:252` mete en
   `totalIssues` (budget **0**) todo issue cuyo `type` no sea `raw-palette`,
   y los **67** usos de `sap-*` en **13** archivos certificados caerían en
   `certifiedViolations` (fallo duro en `:402`). El audit también pasa a
   correr en `validate:ci`/CI, que hoy no lo ejecuta.

6. **Cada token tiene consumidor o desaparece, sin mutilar las escalas
   contractuales.** El audit cruza los tokens declarados con sus consumidores
   reales y reporta los **huérfanos**, con un **budget decreciente** (patrón
   de `design-system-budget.json`). El escáner **excluye los falsos
   consumidores** (`src/features/design-system/**`, `src/**/*.stories.tsx`,
   `src/tests/**`) y **reconoce el consumo dinámico** por interpolación; y
   las escalas que `statusTokensContrast.test.ts` exige íntegras son
   **atómicas**: la escala está activa si al menos un miembro se consume y
   **eliminar un miembro suelto rompe el guardrail**.

7. **El scorecard estático se completa con evidencia visual sin dejar de ser
   estático.** El reporte del audit incorpora el resultado de la regresión
   visual **leyendo un resumen JSON opcional**
   (`frontend/visual-regression-summary.json`, emitido por la suite visual);
   si no existe, la sección se reporta como `skipped`. El script **no**
   invoca Playwright ni ningún proceso externo: sigue siendo un check
   rápido (0,096 s) que solo lee ficheros.

8. **El orden respecto a la spec 033 es 033 → 038, y solo la Fase D depende
   de ella.** La spec 033 parte `DesignSystemCatalog.view.tsx` (su **T8**) en
   hook + container + view, y sus **T14-T19** dejan los modales certificados
   sin imports de `services/`. Si esta spec tocara el catálogo antes, la 033
   tendría que volver a partir el mismo fichero (trabajo doble) y las
   histories de los 16 modales de dominio se escribirían sobre componentes
   con imports de `services/`, obligando a mockear `authService`,
   `emailService`, `healthService` e `importService` en el catálogo. Por
   tanto: **la spec 033 cierra su T8 antes de que esta spec toque
   `features/design-system/`**, y las Fases A, B y C (retirada de `sap-*`,
   pipeline de tokens, ratchet de huérfanos) **no dependen de la 033** y
   pueden ejecutarse en cualquier momento, incluso en paralelo.

## Alternativas consideradas

1. **Storybook como sustituto del catálogo del app** — descartada: el
   catálogo del app cumple una función de negocio (quién puede ver qué
   primitivas existen) y el usuario final lo necesita. Se **conserva** y se
   le delega la documentación. Eliminarlo quitaría una ruta del producto.
2. **Ladle 5.1.1 en vez de Storybook 10** — **fallback documentado**, no la
   opción por defecto. Ladle es más ligero (Vite native, sin webpack) y
   cumple la misma frontera ("un catálogo headless con historias"), pero
   Storybook 10 aporta la auditoría a11y con axe-core por historia y el
   addon de Vitest (que conecta con la spec 035), y es compatible de forma
   nativa con Vite 8 y React 19. Como las historias son CSF3 puro con
   imports de tipo, la decisión **es reversible**: si el primer PR de la
   Fase D (T15) introduce fricción de tiempos en CI, cambiar a Ladle cuesta
   un solo fichero de configuración, sin tocar ninguna de las 65 historias.
3. **Storybook 9** — descartada por obsolescencia: la versión vigente es
   **10.6.3**, y `@storybook/react-vite@10.6.3` admite `vite ^5–^8` y
   `react ^16.8–^19`, compatible con el stack del repo (Vite 8.3.2, React
   19.3, TypeScript 5.3).
4. **`@storybook/blocks` para el playground de props** — descartada: el
   paquete está **congelado en 8.6.14** y no es dependencia de Storybook 10;
   desde Storybook 9 el playground es `args` + el addon **Controls** del core.
5. **El catálogo del app importa las stories directamente** — descartada:
   arrastraría el runtime de Storybook al bundle de producción y al grafo de
   Vite. El consumo es por **manifiesto tipado**, y las stories solo usan
   imports de tipo.
6. **Dejar los tokens escritos a mano en `index.css`** — descartada: es el
   estado actual. Con 71 tokens y 142 declaraciones en dos regiones, la
   traducción manual entre Figma y el código es una fuente de deriva
   silenciosa, y nada la detecta.
7. **Migrar todo el CSS a un formato de tokens de terceros (Style Dictionary
   con JSON + filtros)** — alternativa considerada: Style Dictionary es más
   potente (referencias, transforms, formatos múltiples). Se descarta por
   ahora porque añade una cadena de herramientas con ficheros de
   configuración intermedios para un caso de uso que un script de ~150
   líneas resuelve; si el catálogo de tokens crece (multi-tema, multi-marca,
   export a iOS/Android), la decisión se revisa.
8. **Integrar Figma automáticamente (Tokens Studio o Figma API) como
   fuente de verdad** — descartada por ahora: requiere credenciales de Figma
   en CI y una dependencia externa en el loop de build. La decisión
   deliberada es que `tokens.json` sea un **contrato de formato**, y que la
   integración de Figma sea **un productor más** de ese fichero, no una
   dependencia del pipeline.
9. **Retirar la regresión visual del design system** — descartada: es
   precisamente lo que cierra el bucle que el audit estático no puede
   cerrar ("usa el token correcto" ≠ "se ve bien").
10. **Eliminar los tokens huérfanos sin ratchet** — descartada: sin un
    contador explícito, la limpieza se hace una vez y vuelve a acumularse. El
    ratchet es lo que la mantiene.
11. **Eliminar los miembros sueltos de las escalas protegidas** — descartada:
    `statusTokensContrast.test.ts` exige que las escalas de 11 estados de
    dominio × 3, 4 genéricos × 2 y `chart-1..8` existan **íntegras** en
    `@theme`: borrar `token-chart-3` o `token-status-info-text` rompe el
    guardrail en el acto. Las escalas son **atómicas**.
12. **Que el audit script invoque Playwright para el diff visual** —
    descartada: convertiría un check estático de 0,096 s en un runner de
    navegador, con dependencias y lentitud, dentro de un script que hoy solo
    lee ficheros. La evidencia visual entra como **resumen JSON**.
13. **Contar los tokens huérfanos sin excluir el catálogo ni las stories** —
    descartada: el catálogo lista tokens a propósito y las stories los
    consumen; ambas serían falsos consumidores y el detector quedaría ciego.

## Consecuencias

Positivas:

- **Una primitiva se documenta en aislamiento**, con estados y variantes,
  sin levantar el backend ni autenticarse: baja la barrera para que un
  revisor o un diseñador verifique el design system.
- **El nombre del token en el código y en el diseño dejan de divergir**: el
  JSON es el contrato (con la clave pública y la variable subyacente
  separadas), y el CI verifica que el CSS commiteado es el generado.
- **Un token sin consumidor se detecta**: el design system deja de acumular
  deuda invisible, sin romper las escalas que el guardrail de contraste
  declara íntegras.
- **El `sap-*` desaparece**: queda un solo vocabulario de color, y de paso
  se resuelve `sap-blue-dark`, que hoy es un uso sin token declarado.
- **El bundle de producción no crece**: Storybook sigue siendo tooling, y
  las stories solo usan imports de tipo.
- El scorecard deja de ser **solo** estático: el diff visual de las
  primitivas acompaña al diff de clases, sin que el audit deje de ser un
  check rápido.
- **ADR-0020 no se deroga**: Storybook es documentación y playground, no un
  runtime de componentes.
- **El trabajo sobre `DesignSystemCatalog.view.tsx` se hace una sola vez**:
  el orden 033 → 038 garantiza que la vista se parte una única vez (en la 033) y que aquí solo se le enchufa el manifiesto tipado.
- **Las stories de los modales de dominio no necesitan mocks de servicios**:
  al escribirse después de las tareas 033 T14-T19, los componentes ya no
  importan `services/`, y la story monta la superficie presentacional tal
  cual.

Negativas / costos aceptados:

- **65 historias** son un trabajo real de creación. Se acepta el trabajo
  con un budget de cobertura **decreciente** (el guardrail exige cobertura
  progresiva, no las 65 de golpe).
- **Un paso de generación** en el loop: un token nuevo requiere tocar el
  JSON y regenerar, no solo el CSS. El modo `--check` convierte el olvido en
  un fallo de CI, no en una deriva silenciosa.
- **Storybook es una dependencia de desarrollo** considerable (instalación y
  build). El build de Storybook pasa a formar parte del pipeline, lo que
  añade tiempo de CI.
- **La regresión visual de primitivas puede generar falsos positivos** por
  antialiasing: se mitiga con `maxDiffPixelRatio` e imagen base fijada.
- **La regresión visual exige un resumen JSON como contrato entre dos
  piezas** (la suite visual y el audit): si el resumen no existe, el audit
  reporta `skipped` y el scorecard visual no está disponible.
- **La migración de `sap-*` (431 usos) es mecánica pero **huele** a un cambio
  visual si alguna equivalencia no es exacta: por eso el mapa de
  equivalencias se revisa por área y con comparación en claro/oscuro.
- **El escáner de huérfanos tiene que entender el consumo dinámico** (clases
  por interpolación): es lógica adicional que un análisis de clases
  literales no cubre, y es la que hoy deja 3 muestras del catálogo sin
  color.
- `tokens.json` **no cubre** el resto de `index.css` (breakpoints,
  utilidades custom, media queries): siguen escritos a mano. La generización
  total del CSS es un objetivo mayor que esta spec no asume.
- **Esta spec espera a la 033 en su Fase D**: el calendario de las historias
  (la parte más grande del trabajo) queda condicionado al cierre de la
  spec 033. A cambio, no se toca dos veces el mismo fichero. Las Fases A, B
  y C no tienen esa espera.

## Referencias

- `frontend/src/features/design-system/views/DesignSystemCatalog.view.tsx`
  (517 líneas, 7 hooks, entrada de ruta) — el catálogo que se externaliza;
  `:204` y `:174,176` — las clases por interpolación que Tailwind no
  detecta.
- `frontend/src/features/design-system/components/PrimitiveDoc.tsx` (67) — la
  documentación actual de una primitiva.
- `frontend/design-system-certified.json` — las **65 entradas**
  certificadas (fuente de verdad única).
- `frontend/design-system-budget.json` — los budgets monótonos que esta spec
  extiende (`sapTokenBudget`, `orphanTokenBudget`) con la versión 2 → 3.
- `frontend/scripts/audit-design-system.cjs` — el scorecard por módulo que
  se amplía con la evidencia visual; `:252` — la separación obligatoria del
  contador de `sap-*` respecto a `fileStrictIssues`; `:352` — la `version`
  literal que escribe `--update`.
- `frontend/src/index.css` — `@theme` (líneas 6-116, con las entradas
  `--color-token-*` en 28-112) y `@layer utilities` (`:root` en 378, `.dark`
  en 474): las dos regiones que pasan a ser generadas.
- `frontend/src/tests/guardrails/statusTokensContrast.test.ts` — el guardrail
  que declara **íntegras** las escalas de estados y `chart-1..8`.
- `frontend/src/features/theoretical-shifts/components/listTokens.ts` (41) —
  la entrada certificada que **no es un componente**.
- `.agents/rules/design-system-governance.md` §7 (paridad de archivos
  certificados) y §8 (envoltorio canónico) — las reglas que esta spec
  actualiza.
- [spec 038](file:///specs/038-design-system-catalog-pipeline/spec.md) —
  implementación, AC y plan.
- [spec 033](file:///specs/033-frontend-layering-hardening/spec.md) — la
  frontera de capas que presupone el catálogo y las historias: su **T8** parte
  `DesignSystemCatalog.view.tsx` y sus **T14-T19** dejan los modales
  certificados sin imports de `services/`. Es la dependencia de la Fase D.
- [spec 035](file:///specs/035-frontend-testing-stack/spec.md) — la
  regresión visual que esta spec reutiliza.
- [ADR-0020](0020-design-system-governance.md) — la gobernanza que esta spec
  **extiende**, sin derogar.
- [ADR-0022](0022-ui-ux-consolidation.md) — la consolidación de superficie
  UI y estado remoto.
