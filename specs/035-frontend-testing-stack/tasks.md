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
      _Evidencia_: el contrato ya detectó 2 fallos reales (una ruta inventada
      `/api/records/anomalies` y `lastModified` en epoch ms contra texto).
      _Desvío documentado_: 4 rutas tienen el **runtime** del backend
      desalineado del `swagger.json` (`GET /api/shift-reports`,
      `GET /api/configs/{key}`, `GET /api/configs/public/brand-logo`,
      `GET /api/corrections`). El mock reproduce el runtime (lo que el
      frontend consume) y la discrepancia queda **documentada** en
      `MockRouteContract.divergence` con la cita `file:line` del backend y
      congelada en un ratchet (test `(c)` del contrato). Cuando el backend
      alinee el swagger, el ratchet obliga a borrar la divergencia.
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
      _Desvío documentado_: el fichero es `invalidation.test.tsx` (el harness
      monta el `QueryClientProvider` en JSX).
      _Cobertura_: 27 mutaciones → **40 casos** (una mutación que invalida
      varias raíces produce un caso por raíz); el catálogo cubre las 14
      raíces con lector real (`auditLogs`, `integrityStatus`, `config`,
      `configPublic`, `correctionRequests`, `holidays`, `calendarMatrix`,
      `leaves`, `meterReadings`, `meterConfigs`, `notes`, `shiftReports`,
      `shiftPatterns`, `assignedShifts`).
- [x] T6: Verificar **en local**, contra el código previo a la corrección de
      la spec 034, que el test de la mutación de reportes de turno **falla**
      (raíz `["shiftReports"]` no invalidada por `["reports"]`) y adjuntar esa
      evidencia roja al PR; el test que se mergea **queda en verde** gracias a
      la Fase D de la 034. Si este task llegara a abrirse antes de la 034, se
      marca temporalmente con `test.fails` y se quita la marca en el PR de la
      034 — nunca se mergea un test en rojo en CI (AC2).
      _Evidencia_: `specs/035-frontend-testing-stack/evidencia/T6-invalidacion-roja.md`
      (3 casos en rojo con la raiz `["reports"]`: `expected 1 to be 2` = la query
      no se volvio a pedir; en verde con `queryKeys.shiftReports()`).
- [x] T7: Extender el patrón a `config` (raíz genérica `["config", key]` vs
      sub-keys hardcodeados) y a la raíz `audit-logs` fuera de las allowlists
      de `src/lib/queryCache.ts:33-60` (AC2).
      _Cobertura_: los 14 recursos del catalogo cubren `config` (raiz generica
      `["config", key]`) y `configPublic` (raiz `["config", "public", key]`),
      ademas de `auditLogs` e `integrityStatus` (raiz `audit-logs`), que quedan
      fuera de las allowlists de `src/lib/queryCache.ts`.
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

## Notas de ejecucion (2026-10-21)

- **T14 (hecho, 2026-10-22)**: los 12 baselines (6 rutas x 2 temas) quedan
  versionados en `frontend/e2e/visual-regression.spec.ts-snapshots/`. Un
  snapshot contra un staging vivo es fragil por definicion, asi que la suite
  se hizo determinista con tres palancas:
  1. **Reloj fijo** (`page.clock.setFixedTime` en
     `frontend/e2e/visual-regression.spec.ts`): congela `Date.now()` y
     `new Date()` en el navegador (saludo por hora, fechas, "hoy").
  2. **Zona horaria fija** (`timezoneId: "America/Santiago"` en
     `frontend/playwright.config.ts`): misma hora local en runner y CI.
  3. **Enmascarado explicito de datos vivos** (`volatileSelectors` /
     `volatileCards` en `frontend/e2e/visual-targets.ts`): clima (API
     externa), reloj del servidor, conteos de la plantilla, alertas de
     integridad, nombre e id del worker de la factoria e2e y el usuario de la
     cabecera. El staging muta en cada corrida e2e; sin enmascarar el baseline
     se rompe en cada ejecucion y el test miente.
     Mas `data-testid` de contrato DOM (`weather-display`, `server-clock`,
     `app-header-user`, `worker-identity`, `worker-identity-code`,
     `governance-integrity-table`, `skeleton`) y una espera explicita a que
     desaparezcan los esqueletos de carga (`expect.poll` sobre
     `[data-testid="skeleton"]:visible`), porque capturar el fallback de carga
     produce un baseline que depende de la latencia y no del diseno.
     La tabla de alertas de integridad se acota a un alto fijo
     (`style` en `visual-targets.ts`) porque su alto depende del historial de
     auditoria del entorno (0 filas en una base recién sembrada, N en un staging
     de larga vida): asi la region enmascarada tiene siempre la misma geometria.
     Evidencia: 12/12 estables entre corridas, **66/66** contra un staging con
     base recién sembrada (equivalente al pipeline de release) y **68/68** con la
     cadena completa `functional -> visual -> perf`.
     La operacion de actualizar baselines queda documentada como **explicita y
     separada** (PR dedicado con el diff de imagenes) en
     `frontend/e2e/README.md` y `.agents/rules/frontend-testing.md`.
- **T19 (parcial)**: `validate:ci`, `guardrails`, `spec:check`, `docs:check`,
  `lint:budget` en verde; `e2e:staging` functional 54/54. Visual baselines
  pendientes (staging desactualizado).

- **T9 (hecho)**: 10 ficheros de `src/tests/features/*/` migrados de
  `vi.mock(".../services/...")` a handlers MSW. Suite: 142 ficheros / 645 tests.

- **T8 (hecho)**: 8 ficheros de `src/services/` migrados de `vi.stubGlobal("fetch")`
  a handlers MSW (`auditLogService`, `authService`, `correctionService`,
  `holidayAndConfigService`, `importService`, `kpiService.contract`,
  `meterService`, `shiftReportService`). `authToken`/`authService` se mantienen
  como mock solo del token de sesion. `socketService` queda con
  `vi.mock("socket.io-client")` (WebSocket, no HTTP). AC3 verificado en
  `src/tests/services/httpContract.test.ts` (401 -> `ApiHttpError` con
  `status === 401`, 204 -> body vacio, body malformado -> `SyntaxError`).
- **T10 (hecho)**: proyectos `jsdom` y `browser` (Playwright + Chromium
  headless) en `vite.config.ts`; `@vitest/browser` y
  `@vitest/browser-playwright` anadidos como devDeps. Scripts `test:jsdom` y
  `test:browser` en `package.json`. Pendiente en CI: anadir
  `npx playwright install --with-deps chromium` al job `verify-frontend`.
- **T12 (hecho)**: `.agents/rules/frontend-testing.md` (regla dedicada) documenta
  cuando usar JSDOM y cuando browser mode.
- **T16 (hecho)**: `setup.ts` hace `vi.mock("@sentry/react")` (no-op) y
  `vi.mock("../utils/logger.ts")` con spies. El SDK real de Sentry no se
  ejecuta en los tests unitarios.
- **T17 (hecho)**: medicion 33.57 L / 29.37 F / 27.16 B / 32.94 S. Ratchet
  subido a 31/27/25/30 en `vite.config.ts`.
- **T18 (hecho)**: `.agents/rules/frontend-testing.md` creado con la invariante
  "las mutaciones se testean contra la red real (MSW), no contra mocks de
  modulo".
- **T20 (hecho)**: `test:jsdom` y `test:browser` anadidos a `package.json`.

Completados en este ciclo adicional (absorbidos de la rama `run_spec_035`,
revisados y adaptados a `main`):

- **T11 (hecho)**: 6 specs en `src/tests/browser/*.browser.spec.tsx`
  (CinematicModal, DatePickerDialog, NumericKeypad, SortableHeader, TabNav,
  VirtualizedContainer) pasan en browser mode (Playwright + Chromium).
  Setup dedicado `src/tests/setup.browser.ts` (sin MSW, que es node-only).
- **T13-T15 (hecho)**: `frontend/e2e/visual-targets.ts` (conjunto curado de
  6 rutas) y `frontend/e2e/visual-regression.spec.ts` (`toHaveScreenshot` en
  claro y oscuro, `maxDiffPixelRatio` explicito, `animations: disabled`).
  Proyecto `visual` anadido a `playwright.config.ts` (`testMatch:
**/visual-regression.spec.ts`, `dependencies: ["functional"]`).
  Los baselines se generan con `--update-snapshots` en un PR dedicado.

- **T11 (hecho)**: 6 specs en `src/tests/browser/*.browser.spec.tsx` pasan en
  browser mode (Playwright + Chromium). Setup dedicado
  `src/tests/setup.browser.ts` (sin MSW, que es node-only).
- **T13-T15 (hecho)**: `frontend/e2e/visual-targets.ts` + `visual-regression.spec.ts`
  (`toHaveScreenshot` claro/oscuro) y proyecto `visual` en `playwright.config.ts`.
  Baselines generados con `--update-snapshots` (ver nota de T14 mas arriba).

Verificacion final (T19):

- **T19 (hecho)**: `validate:ci` (frontend + backend), `guardrails`,
  `spec:check`, `docs:check` y `lint:budget` en verde. `e2e:staging`
  (proyecto `functional`): **54/54 pasan** contra el staging levantado. La
  regresion visual (`--project visual`): **12/12** con los baselines
  versionados, **66/66** contra un staging con base recien sembrada y
  **68/68** con la cadena `functional -> visual -> perf` (ver nota de T14).

Completados en este ciclo (T9):

- **T9 (hecho)**: 10 ficheros de `src/tests/features/*/` migrados de
  `vi.mock(".../services/...")` a handlers MSW (useToolsLogic,
  useEmployeeManagementData, useKioskData.regression, useLogbookData,
  useShiftCalendarData, useAccountingClosureTabController,
  useAttendanceAnalytics, useReportsTabController, useTimeControl,
  useWorkerPortalData). Los mocks de hooks de UI (useAuth, useStore,
  useToasts, useEmployees) y de utilidades (geolocation, logger, indexedDB)
  se mantienen por ser concerns de UI, no de red.
