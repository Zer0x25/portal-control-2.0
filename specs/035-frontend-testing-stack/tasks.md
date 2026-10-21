# Tareas 035: Frontend Testing Stack

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — MSW como estándar de mocking

- [x] T1: Añadir `msw` (devDep) y crear
      `frontend/src/tests/mocks/{server,handlers,fixtures,browser}.ts`:
      `setupServer` con `onUnhandledRequest: "error"` (una llamada no
      mockeada **falla** el test en lugar de colarse silenciosamente),
      handlers por recurso y fixtures deterministas (AC1).
- [x] T2: Crear `frontend/src/tests/contracts/swagger-alignment.test.ts`:
      cada ruta registrada en `handlers.ts` existe en
      `backend/docs/swagger.json` y el `body` del handler cumple el schema
      OpenAPI correspondiente; los handlers pasan a ser un **contrato
      ejecutable** (AC3).
- [x] T3: Extender `frontend/src/tests/setup.ts` para arrancar el server MSW
      y resetear los handlers entre tests (`resetHandlers` +
      `server.listen`) (AC1).
- [x] T4: Migrar los tests de `src/hooks/` de `vi.mock` de módulo a handlers
      MSW (primer lote; son los de mayor riesgo: caché e invalidación)
      (AC1).

## Fase B — Tests de caché e invalidación

- [x] T5: Crear `frontend/src/tests/cache/invalidation.test.ts` con el patrón
      **montar `QueryClient` real → sembrar la query → ejecutar la mutación →
      verificar re-fetch → verificar dato nuevo**, aplicado a **cada**
      mutación que declara `invalidateQueries` en `src/hooks/use*Mutations.ts`
      (AC2).
- [x] T6: Verificar **en local**, contra el código previo a la corrección de
      la spec 034, que el test de la mutación de reportes de turno **falla**
      (raíz `["shiftReports"]` no invalidada por `["reports"]`) y adjuntar esa
      evidencia roja al PR; el test que se mergea **queda en verde** gracias a
      la Fase D de la 034. Si este task llegara a abrirse antes de la 034, se
      marca temporalmente con `test.fails` y se quita la marca en el PR de la
      034 — nunca se mergea un test en rojo en CI (AC2).
- [x] T7: Extender el patrón a `config` (raíz genérica `["config", key]` vs
      sub-keys hardcodeados) y a la raíz `audit-logs` fuera de las allowlists
      de `src/lib/queryCache.ts:33-60` (AC2).
- [x] T8: Migrar los tests de `src/services/` de `vi.mock` a handlers MSW
      (segundo lote): verificar status, body y headers; un 401 produce
      `ApiHttpError` con `status === 401`, un 204 produce body vacío, un body
      malformado produce error tipado (AC3).
- [x] T9: Migrar los tests de `src/features/*/` de `vi.mock` a handlers MSW
      (tercer lote) (AC1).

## Fase C — Vitest Browser Mode

- [x] T10: Configurar el proyecto `browser` de Vitest en
      `frontend/vite.config.ts` (provider `playwright`, Chromium headless)
      con `include` restringido a `src/tests/browser/**`, y añadir al
      proyecto `jsdom` el `exclude: ["src/tests/browser/**"]` (en Vitest 5,
      `test.projects` no aísla el glob global: sin el exclude los specs de
      browser se ejecutarían también en JSDOM). Añadir
      `npx playwright install --with-deps chromium` al job `verify-frontend`
      de `.github/workflows/ci.yml`, que ejecuta
      `npm run validate:ci:coverage` (`vitest run --coverage`) y lanzaría
      Chromium sin instalar (AC5).
- [x] T11: Migrar a browser los tests de comportamiento **no observable en
      JSDOM**: `CinematicModal` (focus trap + retorno de foco),
      `DatePickerDialog` (navegación por teclado), `TabNav` (flechas),
      `NumericKeypad`, `SortableHeader` (drag) y los contenedores
      virtualizados (`@tanstack/react-virtual`); verificar elemento realmente
      enfocado, `tabIndex` efectivo y scroll real (AC5).
- [x] T12: Documentar en `src/tests/setup.ts` (o un README de tests) cuándo
      usar JSDOM y cuándo browser, para que la elección sea evidente (AC5).

## Fase D — Regresión visual

- [x] T13: Crear `frontend/e2e/visual-targets.ts` con el **conjunto curado y
      único** de rutas (dashboard, planificador, worker-portal, kiosk,
      logbook, governance) y `frontend/e2e/visual-regression.spec.ts` con
      `toHaveScreenshot` en claro y oscuro, con `maxDiffPixelRatio` explícito
      por proyecto (AC4).
- [x] T14: Versionar los baselines en el repo y documentar que su
      actualización es una operación **explícita y separada** (PR de baselines
      con revisión del diff, nunca dentro del PR de código) (AC4).
- [x] T15: Integrar la regresión visual en el pipeline: añadir el proyecto
      `visual` a `frontend/playwright.config.ts` (hoy solo existen
      `functional` y `perf`) con `testMatch: **/visual-regression.spec.ts` y
      `dependencies: ["functional"]`, de modo que corre después de los
      funcionales (incluido axe-core) y antes de `perf`, que necesita serie
      sin carga concurrente; ejecutarlo **solo** sobre las rutas del conjunto
      curado (AC4).

## Fase E — Ratchet de cobertura y spies del entorno de test

- [x] T16: Instalar en `frontend/src/tests/setup.ts` spies/stubs del
      `logger` y de Sentry: ningún test unitario ejecuta el SDK real de
      Sentry, y los tests pueden afirmar sobre los mensajes emitidos por el
      logger. La conversión del `logger` en sink de Sentry (las 103 llamadas
      a `console.*` y el cambio de `no-console`) es de la spec 037 /
      ADR-0026, fuera de alcance aquí (AC7).
- [x] T17: Medir el baseline de cobertura en 2 corridas consecutivas tras las
      fases anteriores y **subir** los umbrales de
      `frontend/vite.config.ts:253-266` desde `{lines: 16, functions: 13,
branches: 13, statements: 16}` al valor medido y sostenido (objetivo
      `lines ≥ 30, functions ≥ 25, branches ≥ 25, statements ≥ 30`); actualizar
      el comentario del config con el baseline nuevo y la fecha (AC6).
- [x] T18: Actualizar la documentación: docblock de `src/tests/setup.ts` o
      README de tests (cómo ejecutar cada modo) y crear
      `.agents/rules/frontend-testing.md` (**nueva regla dedicada de
      testing**; no `frontend-performance.md`, que es exclusivamente de
      rendimiento) con la invariante "las mutaciones se testean contra la red
      real (MSW), no contra mocks de módulo" (AC8).

## Verificación final

- [x] T19: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` y `npm run e2e:staging` (56 tests + regresión
      visual) en verde; el número de tests unitarios **no disminuye** respecto
      al baseline de 110 ficheros de test (AC8).
- [x] T20: Actualizar `frontend/package.json` con los scripts de cada modo de
      test (jsdom / browser / guardrails / visual) y verificar que
      `scripts/run-frontend-tests.cjs` (entrypoint local) y
      `npm run validate:ci:coverage` (job `verify-frontend` de CI) los
      ejecutan todos (AC8).
