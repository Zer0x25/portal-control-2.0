# ADR-0033: Integración agéntica de Storybook (CLI tools, MCP y story tests)

- Estado: Aceptado
- Fecha: 2026-11-26
- Autores: zer0x

## Contexto

ADR-0027 externalizó el catálogo de primitivas a Storybook 10.6.3 como
herramienta de desarrollo y fijó la frontera dura: historias CSF3 con imports
de tipo, cero runtime de `@storybook/*` en producción (guard
`frontend/scripts/check-storybook-runtime.cjs`). Desde entonces el ecosistema
10.6 añadió la capa agéntica que el repo no consume:

1. **CLI `storybook tools`** (`docs list|show`, `stories changed`,
   `stories find-by-component`, `review create`) — verificada funcionando con
   la 10.6.3 instalada: `docs list` produce el manifiesto de componentes con
   props extraídas de los tipos; `stories changed` lista las historias que
   afecta un diff sin confirmar (graf de módulos de Vite); hoy ningún
   runbook/regla/skill del proyecto la menciona, así que los agentes no
   reutilizan primitivas certificadas ni detectan el impacto de sus cambios
   en las 83 historias (`frontend/design-system-certified.json`).
2. **`@storybook/addon-mcp`** — expone el mismo set de herramientas como
   servidor MCP en `http://<host>:<port>/mcp` dentro del dev server (transport
   streamable-http); pensado para que agentes como Copilot consulten
   componentes, historias afectadas y pruebas. No está instalado; no existe
   `.vscode/mcp.json`.
3. **`@storybook/addon-vitest`** — convierte cada historia en un test Vitest
   (smoke de render + play functions) en **browser mode** (Chromium real vía
   `@vitest/browser-playwright`, ya instalado para el proyecto `browser` de
   `frontend/vite.config.ts:308`), e integra la verificación a11y del
   `@storybook/addon-a11y` ya registrado con `a11y: { test: "error" }` global
   (`frontend/.storybook/preview.ts`). Hoy las 83 historias solo compilan
   (`storybook:build` en `validate:ci`); no se ejecutan.
4. Los peers de `@storybook/addon-mcp@10.6.9` y `@storybook/addon-vitest@10.6.9`
   exigen `storybook ^10.6.9` (la 10.6.3 exacta también existe como fallback);
   el repo tiene 10.6.3 en todos los paquetes `@storybook/*`.

El proyecto declara invariantes WCAG AA duras
(`.agents/rules/design-system-governance.md` §5) pero ninguna verificación
automática de a11y corre por historia: el addon-a11y solo decoraba el panel
interactivo.

## Decisión

1. **La capa agéntica de Storybook 10.6 se adopta como tooling de desarrollo
   obligatorio-para-agentes, en tres piezas:**
   - **CLI `storybook tools`** documentada como vía canónica para descubrir
     primitivas antes de editar UI y para detectar el impacto de un cambio
     (`stories changed`). Se ejecuta desde `frontend/` (la CLI resuelve
     `.storybook/` relativo al cwd).
   - **`@storybook/addon-mcp`** registrado en `frontend/.storybook/main.ts` y
     expuesto en `http://127.0.0.1:6006/mcp` (el script `storybook` ya fija
     host `127.0.0.1` y puerto `6006`). `.vscode/mcp.json` lo registra para
     VS Code Copilot. El MCP **nunca** sustituye a la CLI en automatización:
     requiere el dev server corriendo; la CLI sirvepara `--json` en pipelines
     locales.
   - **`@storybook/addon-vitest`** como **tercer proyecto Vitest**
     (`storybook`) junto a `jsdom` y `browser` en `frontend/vite.config.ts`:
     browser mode con el provider Playwright existente, include solo
     `src/**/*.stories.tsx`, aislado de los ratchets de cobertura del proyecto
     `jsdom`. Script `npm run test:storybook`. Con esto las 83 historias
     pasan de "compilan" a "se ejecutan y verifican a11y por historia".
2. **El primer run de story tests es una calibración con triage explícito**
   (AC2 de la spec 122): las violaciones a11y preexistentes se corrigen si
   son pocas o se degradan a **ratchet documentado** (`a11y test: "warn"`
   global + `parameters.a11y.exceptions` por historia + entrada en
   `docs/tech-debt-register.md`) si son masivas. Nunca se silencia una
   violación sin registro, y el nivel de test no se baja para "hacer pasar"
   un cambio nuevo: los cambios nuevos nacen bajo el ratchet vigente.
3. **Storybook y addons suben a 10.6.9** en el mismo cambio (patch menor dentro
   del major 10; valida `storybook doctor` + `storybook:build` +
   `storybook:visual`). Los addons siempre se versionan juntos al core.
4. **Los story tests viven en el preflight pre-PR, no en `validate:ci`** ni en
   CI remoto todavía: la regla "CI como último salvavidas"
   (`agentic-governance.md` §4) exige validación local exhaustiva, y la
   duración/estabilidad de la suite (browser mode, 83 historias) debe medirse
   antes de cobrar minutos a cada cambio de frontend. **Criterio de
   promoción**: cuando dos corridas consecutivas en main sean estables y la
   duración medida justifique el costo, se añade a `validate:ci` (y de ahí a
   `verify-frontend`) en un cambio aparte.
5. **La documentación agéntica vive en `.agents/`**, no en AGENTS.md: skill
   `storybook-workflow` (runbook ejecutable del ciclo UI) y regla modular
   `storybook-agentic.md` (`trigger: model_decision`), enlazadas desde
   `design-system-governance.md` §7/§8. AGENTS.md no crece (118/120 líneas).

## Alternativas consideradas

1. **Solo CLI, sin MCP** — descartada como exclusiva: la CLI cubre
   automatización, pero el flujo interactivo de Copilot en VS Code se
   beneficia del MCP (descubrimiento de herramientas sin memorizar flags);
   el costo marginal de addon-mcp es una devDependency y una línea de config.
2. **MCP sin CLI** — descartada: el MCP exige dev server corriendo; los
   pipelines (preflight, futuras promociones a CI) necesitan la vía `--json`
   sin server.
3. **Story tests dentro del proyecto `browser` existente** — descartada: mezcla
   objetivos (los specs de `src/tests/browser/**` prueban comportamiento de
   app; las historias prueban el design system) y acopla los ratchets de
   cobertura. Proyecto separado con `include` propio.
4. **Proyecto storybook en jsdom, no browser mode** — descartada: el
   addon-vitest recomienda browser mode (DOM real para focus traps, portales
   y scroll que el design system exige); jsdom daría falsos positivos/negativos
   en primitivas con portales (Select, Datepicker, modales).
5. **Mantener 10.6.3 e instalar addons 10.6.3** — fallback válido si el bump
   rompe algo; se prefiere 10.6.9 para que los tres paquetes compartan range
   exacto y el `doctor` no repare desalineaciones más tarde.
6. **Skills oficiales de Storybook (`/write-stories` etc.)** — descartadas por
   ahora: requieren Storybook 11 (no publicado estable para este stack
   Vite 8); el runbook propio cubre el ciclo y es reemplazable cuando se
   migre.
7. **Silenciar a11y global (`test: "off"`) para el primer run** — descartada:
   vaciaría de valor los story tests y contradice §5 del design system; el
   ratchet con exceptions mantiene la señal y la deuda visible.
8. **Añadir story tests a `validate:ci` desde el día uno** — descartada por
   costos no medidos (browser mode × 83 historias en cada validación);
   primero preflight, promoción medida después.

## Consecuencias

Positivas:

- Los agentes (y humanos) descubren primitivas certificadas con props y tipos
  antes de escribir UI nueva, y detectan qué historias afecta su cambio.
- Las 83 historias certificadas se ejecutan (smoke + a11y) en cada pre-PR:
  la deuda a11y del design system se vuelve visible y medible.
- Copilot accede al catálogo vía MCP sin comandos memorizados.
- El bundle de producción no cambia (todo es devDependencies + config de
  desarrollo; el guard existente lo verifica).

Negativas / costos aceptados:

- Tres devDependencies nuevas y un proyecto Vitest más que mantener.
- El preflight `--pr` con cambios de UI se alarga (browser mode); se mitiga
  limitándolo al gate pre-PR y no a cada commit.
- Si el triage a11y revela deuda masiva, convive un ratchet `warn` con
  exceptions hasta su cierre (deuda explícita, no silencio).

## Referencias

- `frontend/.storybook/main.ts` — registro de addons.
- `frontend/vite.config.ts` — proyecto Vitest `storybook` (activado con
  `STORYBOOK_TESTS=1`).
- `frontend/package.json` — script `test:storybook`, versiones 10.6.9.
- `.vscode/mcp.json` — registro del servidor MCP para VS Code.
- `.agents/skills/storybook-workflow/SKILL.md` — runbook del ciclo agéntico.
- `.agents/rules/storybook-agentic.md` — regla modular on-demand.
- `.agents/skills/ci-preflight/scripts/preflight.cjs` — story tests en el
  gate pre-PR cuando `frontend/src` cambió.
- `specs/122-storybook-agentic-integration/` — spec, plan y tareas.
- `docs/tech-debt-register.md` TD-005 — ratchet de contraste.
- ADR-0027 (frontera tooling/runtime que esta decisión respeta).

## Líneas de implementación verificadas (2026-11-26)

- Primer run de calibración: **54 fallas / 228 tests**. Triage: **12
  violaciones a11y reales corregidas** (aria-dialog-name en
  RecordHistory/Import/ShiftHandover vía `ariaLabelledBy`; button-name en
  botones de cierre con solo ícono; label del checkbox seguro de
  SmtpConfig; select-name del filtro de LeaveManager; heading-order en
  AboutModal y ShiftHandoverModal; contrato de historias aisladas del
  Header `aria-controls` y del `<li>` de SidebarNavItem) y **57
  `color-contrast` degradadas a ratchet TD-005** (pares texto/estado sobre
  fondos tenues, ratios 1.75–3.77 vs 4.5). Run final: **228/228 verde**.
- Servidor MCP verificado con `npm run storybook` activo:
  `POST /mcp` initialize + `tools/list` expone 8 herramientas
  (`docs-list/show/show-story`, `get-storybook-story-instructions`,
  `stories-changed/find-by-component/preview`, `test-run`).
- `docs list` mostraba `StoryComponent`: las 83 historias importaban el
  componente bajo un alias genérico. Renombradas al nombre real — el
  manifiesto de agentes y los ejemplos JSX generados ahora dicen `Button`,
  `Header`, etc.
- Suites sin regresión: jsdom 1218/1218, browser 8/8, guardrails 96/96,
  coverage thresholds intactos (L 62.18 vs 34 exigido). `storybook doctor`
  y `storybook:build` verdes en 10.6.9.
