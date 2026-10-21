# ADR-0028: Frontend Testing Stack — MSW como contrato ejecutable, frontera JSDOM/Browser y ratchet de cobertura

- Estado: Propuesto
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

La suite de frontend cubre bien la **estructura** (14 guardrails, 110 ficheros
de test, 56 tests e2e, axe-core en claro/oscuro) pero tiene ciegos que ya
dejaron pasar bugs reales:

1. **Mocking de red artesanal.** 73 ficheros usan `vi.mock` (71 en
   `src/tests/`) sobre módulos internos (p. ej.
   `vi.mock("../../services/configService")`) en lugar de sobre la red. El bug
   `["shiftReports"]` sin invalidar (`src/hooks/useReportMutations.ts`
   invalida `["reports"]` pero `src/hooks/queries/useShiftReportsInfinite.ts:11`
   usa `["shiftReports"]`) es **invisible** para la suite: ningún test
   exercisea el ciclo mutación → invalidación → re-fetch.
2. **JSDOM no calcula layout ni focus real.** `frontend/vite.config.ts:232`
   fija `environment: "jsdom"`. El focus trap y el retorno de foco de
   `CinematicModal` se verifican sobre un modelo que no reproduce el
   navegador.
3. **No hay regresión visual.** `frontend/design-system-budget.json` gobierna
   los tokens (879 usos de palette crudo, 173 certificados), pero no existe
   ninguna evidencia visual de que un cambio de token no rompa una pantalla.
4. **El ratchet de cobertura está congelado en 16%** desde 2026-10-04
   (`frontend/vite.config.ts:253-266`), con el propio config diciendo
   _"Subir cobertura real va por spec aparte"_ — spec que nunca se escribió.

Restricciones: `msw` no puede entrar en el bundle de producción; la suite e2e
existente es el contrato de regresión funcional y no se reescribe; el budget
de lint es 0/0; el repo versiona sus ratchets en el repo
(`lint-budget.json`, `design-system-budget.json`), sin servicios externos.

## Decisión

1. **MSW contra el contrato real; prohibido `vi.mock` sobre services
   internos.** Toda llamada de red en los tests unitarios se intercepta con
   handlers MSW (`frontend/src/tests/mocks/{server,handlers,fixtures,browser}.ts`)
   con `onUnhandledRequest: "error"` (una llamada no mockeada falla el test).
   Los handlers se validan contra `backend/docs/swagger.json`
   (`src/tests/contracts/swagger-alignment.test.ts`), de modo que son un
   **contrato ejecutable**, no un segundo conjunto de mocks que puede
   desincronizarse. Los `vi.mock` de módulos internos de services se
   **eliminan**, no conviven.
2. **Frontera explícita JSDOM vs Vitest Browser Mode.** JSDOM sigue siendo el
   entorno por defecto (hooks, guards, lógica de dominio). Browser Mode
   (provider `playwright`, Chromium headless) se restringe a
   `src/tests/browser/**` vía `include` del proyecto browser y `exclude` del
   proyecto jsdom. La regresión visual corre en el e2e de Playwright con
   **baselines versionados en el repo** (proyecto `visual` con
   `dependencies: ["functional"]`, antes de `perf`); actualizar un baseline es
   un PR explícito y revisado, nunca un side-effect del código.
3. **Ratchet de cobertura monótono y medido.** Los thresholds de
   `frontend/vite.config.ts` solo suben, y suben al valor medido en 2 corridas
   consecutivas (objetivo `lines ≥ 30, functions ≥ 25, branches ≥ 25,
statements ≥ 30`), actualizando el comentario del config con el baseline y
   la fecha.

## Alternativas consideradas

1. **Seguir con `vi.mock` y agregar más tests** — descartada: un mock de
   módulo no verifica el contrato de red y es ciego a los bugs de
   invalidación; el bug `shiftReports` pasó con 110 ficheros de test.
2. **Mover toda la suite a Browser Mode** — descartada: multiplicaría el
   tiempo de CI sin valor para hooks puros y lógica de dominio; JSDOM basta
   donde no se mide layout ni focus.
3. **Baselines visuales en un servicio externo (Chromatic u otro)** —
   descartada: rompería la disciplina de ratchets versionados en el repo y
   añadiría una dependencia de red al CI.
4. **Fijar el ratchet de cobertura "a ojo"** — descartada: un umbral no
   medido provoca falsos positivos por tests flaky y se relaja a la primera
   fricción.

## Consecuencias

Positivas:

- Los bugs de caché/invalidación pasan a ser **detectables** en unitarios
  (spec 035 AC2).
- El contrato HTTP (status, body, headers) se verifica ejecutablemente contra
  `swagger.json`: un cambio de contrato rompe el CI.
- El focus trap y el layout se verifican en Chromium real, y cada pantalla
  tiene evidencia visual versionada.
- La cobertura deja de ser un número congelado: sube con criterio medido.

Negativas / costos aceptados:

- **Chromium en CI**: el job `verify-frontend`
  (`.github/workflows/ci.yml`) ejecuta `npm run validate:ci:coverage`
  (`vitest run --coverage`), que con el proyecto browser activo intenta
  lanzar Chromium; el job debe instalar
  `npx playwright install --with-deps chromium` (o acotar la cobertura al
  proyecto jsdom). Sin esa mitigación, la configuración rompe el CI.
- **Baselines platform-specific**: las diferencias de render por plataforma
  obligan a `maxDiffPixelRatio` explícitos y a revisar diffs en cada
  actualización.
- **Migración masiva**: reescribir 73 ficheros con `vi.mock` es noisy; se hace
  en lotes por área, un PR por lote, con la suite verde en cada uno.
- La frontera JSDOM/browser se sostiene por configuración y convención
  (`include`/`exclude` + `.agents/rules/frontend-testing.md`), no la impone
  el framework.

## Referencias

- `specs/035-frontend-testing-stack/{spec,plan,tasks}.md` — implementación, AC
  y plan.
- `frontend/vite.config.ts:232` — `environment: "jsdom"`.
- `frontend/vite.config.ts:253-266` — thresholds del ratchet de cobertura.
- `frontend/playwright.config.ts` — proyectos `functional` y `perf` actuales;
  el proyecto `visual` es nuevo.
- `.github/workflows/ci.yml` (job `verify-frontend`) — ejecuta
  `npm run validate:ci:coverage` (`vitest run --coverage`).
- `frontend/design-system-budget.json` y `frontend/lint-budget.json` —
  patrón de ratchets versionados que replican los baselines visuales.
- [ADR-0024](0024-frontend-http-client-consolidation.md) — `apiClient`,
  prerequisite de los handlers MSW (spec 034).
- [ADR-0026](0026-frontend-rendering-observability.md) — dueño de la
  conversión del `logger` en sink de Sentry (Decisión #4); la superficie de
  test de esa migración (spies de `logger`/Sentry en
  `frontend/src/tests/setup.ts`) vive en esta decisión.
