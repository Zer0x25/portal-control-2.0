# Plan 037: Frontend Rendering & Observability

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../033-frontend-layering-hardening/plan.md`,
`../035-frontend-testing-stack/plan.md`,
`../036-frontend-form-table-primitives/plan.md`,
`../038-design-system-catalog-pipeline/plan.md`.

## Estrategia

5 workstreams (A–E). **El orden importa**: la memoización manual se audita
(AC2) **después** de activar el compilador y el linter (Fase A), porque el
compilador es lo que revela qué memoización era realmente necesaria.

1. **Fase A — React Compiler + linter de hooks (2 PR)**:
   - **Vía de integración (obligatoria)**: `@vitejs/plugin-react@6.1.2` ya no
     expone la opción `babel` (su tipo `Options` solo declara
     `compiler?: boolean | ReactCompilerPluginOptions` y exporta
     `reactCompilerPreset()`). Se adopta la vía oficial:
     - `oxc-transform-react` (devDep) + `react({ compiler: true })` en
       `frontend/vite.config.ts`; o
     - `@rolldown/plugin-babel` + `babel-plugin-react-compiler` +
       `reactCompilerPreset()` del propio `@vitejs/plugin-react`.
   - **Activo en dev, test y build**: el plugin es el mismo en los tres modos,
     así que no hay dos códigos distintos. Se descarta explícitamente la
     variante "solo en build", que dejaba `npm run dev` y **toda** la suite de
     Vitest ejecutando código sin compilar.
   - **Diagnósticos visibles**: `compiler: { reportDiagnostics: true }` para
     que los bail-outs aparezcan en el log del build (los diagnostics fatales
     ya rompen el transform; los recuperables se loguean).
   - **`eslint-plugin-react-hooks@7`** (devDep, admite `eslint ^10`): se
     registra el plugin en `frontend/eslint.config.js` y se activan sus reglas
     de compilador (`react-hooks/exhaustive-deps`,
     `react-hooks/unsupported-syntax`, `react-hooks/incompatible-library`,
     `react-hooks/preserve-manual-memoization`). **Es prerrequisito de la
     Fase B**: sin él no hay forma de distinguir memoización redundante de
     memoización en un componente que el compilador saltó.
   - Medición **antes/después**: tamaño de bundle por chunk, número de
     renders por interacción en las 5 vistas críticas, y tiempo de build.
   - El compilador **no cambia la API**: los hooks siguen funcionando igual.
     Lo que cambia es que React memoriza automáticamente.
   - Riesgo conocido: el compilador puede **exponer** bugs de memoización
     manual incorrecta (p. ej. un `useMemo` con dependencias incompletas que
     antes "funcionaba" por casualidad). Se audita con el script de medición
     de renders (AC3) y con los e2e.
2. **Fase B — Auditoría y limpieza de la memoización (3 PR)**:
   - Auditar las **266** llamadas a `useMemo`/`useCallback` (**160** `useMemo(` +
     **106** `useCallback(`) y los **36** `memo()` (**32** `React.memo(` + **4**
     `memo(` importado sin prefijo) en **lotes** (por feature, empezando por
     los hooks más grandes: `useShiftPatternForm` (450),
     `useAccountingClosureTabController` (297), `useKioskData` (373),
     `useWorkerPortalData` (371), `useEmployeeManagementData` (344),
     `useShiftCalendarData` (319)).
   - **Precondición de seguridad**: antes de borrar la memoización manual de
     un componente, ese componente debe estar **probado como compilado** (sin
     bail-out según el linter ni según los diagnósticos del build). Si el
     compilador lo saltó, la memoización manual **se conserva** y el
     componente queda en la lista de excepciones, documentada.
   - **Criterio de eliminación** (explícito, para no producir refactors
     cosméticos):
     - se **elimina** si el compilador ya cubre el caso (memoización de un
       valor derivable o de una función que no cambia),
     - se **conserva** si expresa una intención que el compilador no puede
       inferir: una referencia que evita re-suscribir una suscripción de
       socket, un valor usado como dependencia de un `useEffect` externo al
       árbol de React, o un hot path medido,
     - en ese caso, el `useMemo` lleva un **comentario que justifique por
       qué** sobrevive.
   - El recuento final (antes/después) queda en la evidencia de cierre.
3. **Fase C — Container queries (3 PR, tras la Fase D de la spec 036)**:
   - Introducir el patrón: un **contenedor de bloque** declara
     `container-type: inline-size` y usa las variantes de container query de
     Tailwind v4 (`@sm:`, `@lg:`, `@2xl:`) en lugar de breakpoints de
     viewport (`sm:`, `md:`, `lg:`). Tailwind v4 incluye el soporte de
     container queries en el core.
   - **No toda primitiva puede ser contenedor**: `Badge` (`Badge.tsx:20,48`) es un
     `<span className="inline-flex ...">` de ancho intrínseco; con
     `container-type: inline-size` su contenido deja de contribuir al ancho y
     el badge **colapsa a 0 px**. El patrón se aplica a `MetricCard`, `Card`,
     `EmptyState`, `ReportTable` y al wrapper de `PaginationControls`
     (contenedores de bloque), **nunca** a primitivas inline.
   - **La geometría de virtualización no la cambia una container query**:
     `estimateSize` es JS. En cada par unificado hay dos salidas válidas:
     (a) un único virtualizador con `measureElement` + `ResizeObserver` sobre
     el contenedor (la geometría se mide de verdad), o (b) **dos
     virtualizadores con geometrías distintas** (`AssignmentListDesktop` 65 px
     vs `AssignmentListMobile` 160 px; `HolidayListMobile` 110 px;
     `PatternListMobile` 120 px; `LeaveListMobile` 160 px;
     `TimeRecordTableViewDesktop` 66 px vs `TimeRecordTableViewMobile` 280 px;
     `AuditLogsView` 48/90 px) que **comparten los subcomponentes** y cuya
     selección decide la container query. Lo que **no** es válido es unificar
     con un `estimateSize` fijo: las filas se superponen.
   - Migrar primero las primitivas de `components/ui/`; después los
     componentes de feature.
   - **Consecuencia buscada**: los pares desktop/mobile se unifican. Cuando la
     densidad de información del móvil es radicalmente distinta (y no una
     diferencia de ancho), la duplicación **se conserva con justificación
     documentada**.
   - `useMediaQuery` y `useScreenSize` se **mantienen** para decisiones de
     layout **de página** (shell, navegación), que sí dependen del viewport;
     lo que cambia es que los **componentes reutilizables** dejan de
     depender del viewport.
   - **Dependencia de secuencia**: `ReportTable`, `SortableHeader` y
     `PaginationControls` los reescribe la
     [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md)
     (Fase D, T14-T17) sobre la primitiva `DataTable`. La container query se
     aplica **sobre `DataTable`**, no sobre el `ReportTable` actual: esta spec
     no reescribe `ReportTable` y no puede empezar esa fase antes que 036.
   - **Verificación con motor de layout real**: `vite.config.ts:232` fija
     `environment: "jsdom"`, sin motor de layout ni evaluación de `@container`.
     La adaptación al ancho del contenedor se verifica en **Playwright**
     (`frontend/e2e/container-queries.spec.ts`), no en Vitest/JSDOM.
4. **Fase D — Observabilidad (2 PR)**:
   - `web-vitals` (runtime): `initWebVitals` en `src/utils/webVitals.ts`,
     inicialización **diferida** (`requestIdleCallback` tras el primer paint)
     y reporte a Sentry **enriquecido** con contexto (ruta via `useLocation`,
     rol via el store, `navigator.connection` si existe, viewport).
   - **No se duplican transacciones**: `src/utils/sentry.ts:34` ya activa
     `Sentry.browserTracingIntegration()`, que instrumenta LCP/CLS/INP/FCP/TTFB
     en las transacciones muestreadas. `web-vitals` **no** emite una
     transacción por métrica: usa `setTag`/`setContext` para el contexto y
     emite evento/breadcrumb **solo cuando una métrica supera un umbral
     degradado**. La transacción de Sentry sigue siendo la fuente canónica.
   - `src/utils/logger.ts` pasa a ser un sink real: `error` →
     `captureException` **con filtro de estado HTTP** (los 4xx de negocio que
     la UI maneja no generan evento; van a breadcrumb, como ya hace
     `sentryMiddlewares.ts:65`); `warn` → breadcrumb; `info`/`debug` →
     breadcrumb; consola **solo en desarrollo**.
   - **Sin ciclo y sin ruido en tests**: Sentry se importa de forma **diferida
     y cacheada** (patrón de `sentryMiddlewares.ts:5-11`), no estáticamente,
     para no ciclar con `src/utils/sentry.ts:1` (que ya importa `logger`); el
     forwarding se desactiva cuando `import.meta.env.MODE === "test"`; y el
     `console.warn` de `sentry.ts:25` (falta el DSN) pasa por el logger.
   - Las **105** llamadas crudas migran al logger en lotes por área
     (`services/` 24, `features/` 24, `utils/` 22, `store/` 19, `hooks/` 9,
     `workers/` 3, `components/` 2, `lib/` 1, `App.tsx` 1); `no-console` pasa
     a `allow: []` con excepción para el propio logger.
5. **Fase E — Presupuesto de performance en CI (2 PR)**:
   - **Budget de bundle**: script que lee el manifiesto de Vite y falla si un
     chunk supera su presupuesto (con margen sobre el estado actual:
     `react-core` ≤ 260 kB, `charts` ≤ 180 kB, precache ≤ 2 MiB). Los
     presupuestos viven en un **fichero versionado**
     (`frontend/performance-budget.json`), con la misma política monótona que
     `design-system-budget.json` y `lint-budget.json`: el presupuesto solo
     puede **bajar**, y `--update` aborta si el conteo actual supera el
     vigente.
   - **Orden de ejecución**: `frontend/package.json` encadena
     `test:run:ci` **antes** de `build` (y en CI, `validate:ci:coverage`
     encadena `test:coverage` antes de `build`). Por eso el verificador
     **no** se invoca desde Vitest contra `dist/`: el test de Vitest valida
     **la lógica monótona** del verificador con **fixtures**, y la ejecución
     real contra `dist/` (`node scripts/check-bundle-budget.cjs`) se encadena
     **después** de `npm run build` en `validate:ci` y `validate:ci:coverage`.
   - **Lighthouse CI**: gate sobre las rutas críticas con umbrales de Core Web
     Vitals. **Dos condiciones que el gate debe cumplir**:
     - **URLs con hash**: la app usa `HashRouter`
       (`src/contexts/AppProviders.tsx:28`), así que las URLs son
       `/#/ruta` (p. ej. `/#/admin/governance?tab=audit`), no `/ruta`.
     - **Sesión sembrada**: toda ruta salvo login y kiosk exige sesión
       (`src/router/ProtectedRoute.tsx:21-23`), y el estado de auth vive en
       memoria (zustand) pero **se restaura desde `sessionStorage`**
       (`authToken` en `services/authService.ts:33,120-128` y `currentUser` en
       `constants.ts:49`, leídos por `_verifyAuth` en
       `store/slices/authSlice.ts:62-89`, que `store/useStore.ts:41` ejecuta al
       arrancar). El `puppeteerScript` de LHCI siembra esas dos claves igual
       que hace el e2e actual (`e2e/helpers/auth-helper.ts:89-95`); con
       `HashRouter` el cambio de ruta no recarga la página, así que la sesión
       sobrevive a la navegación.
     - Se ejecuta en el pipeline, no en cada PR de código (coste), o en
       nightly.

## Archivos a tocar

| Archivo                                                                                                                      | Cambio                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `frontend/package.json`                                                                                                      | `oxc-transform-react`, `eslint-plugin-react-hooks`, `web-vitals` (runtime), `@lhci/cli` (devDep), scripts de budget |
| `frontend/vite.config.ts`                                                                                                    | `react({ compiler: true })` **activo en dev, test y build** (no existe la opción `babel` en el plugin v6)           |
| `frontend/eslint.config.js`                                                                                                  | registrar `eslint-plugin-react-hooks` (reglas de compilador) + `no-console` → `allow: []`                           |
| `frontend/performance-budget.json`                                                                                           | **nuevo** — presupuestos de bundle y precache (monótonos)                                                           |
| `frontend/scripts/check-bundle-budget.cjs`                                                                                   | **nuevo** — verificador del budget (se ejecuta tras el build)                                                       |
| `frontend/scripts/measure-renders.mjs`                                                                                       | **nuevo** — medición reproducible de renders (AC3)                                                                  |
| `frontend/scripts/lhci-puppeteer.cjs`                                                                                        | **nuevo** — siembra de sesión para LHCI (`sessionStorage.authToken` + `currentUser`)                                |
| `frontend/src/utils/webVitals.ts`                                                                                            | **nuevo** — init diferida + enriquecimiento de Sentry con contexto                                                  |
| `frontend/src/utils/logger.ts`                                                                                               | sink real a Sentry (import diferido, filtro de estado HTTP) + modo desarrollo                                       |
| `frontend/src/utils/sentry.ts`                                                                                               | `console.warn` de la línea 25 → `logger.warn` (el resto no se toca)                                                 |
| `frontend/src/**` (266 `useMemo`/`useCallback`, 36 `memo()`)                                                                 | auditoría y limpieza en lotes (Fase B)                                                                              |
| `frontend/src/components/ui/{MetricCard,Card,EmptyState,ReportTable}.tsx`                                                    | container queries en contenedores de bloque (**Badge queda fuera**)                                                 |
| `frontend/src/components/ui/PaginationControls.tsx`                                                                          | wrapper contenedor + container queries (tras la reescritura de la spec 036)                                         |
| `frontend/src/features/theoretical-shifts/components/{AssignmentList,LeaveList,PatternList,HolidayList}{Desktop,Mobile}.tsx` | unificación con geometría de virtualización explícita                                                               |
| `frontend/src/features/time-control/components/TimeRecordTableView{Desktop,Mobile}.tsx`                                      | unificación o justificación (par nº 5)                                                                              |
| `frontend/src/components/ui/ReportTableMobile{Daily,Summary}Card.tsx`                                                        | unificación o justificación explícita (tras la spec 036)                                                            |
| `frontend/src/features/governance/components/AuditLogsView.tsx`                                                              | bifurcación interna de geometría (48/90 px) unificada o justificada                                                 |
| `frontend/src/**` (105 `console.warn`/`console.error`)                                                                       | migración al `logger` (lotes)                                                                                       |
| `frontend/src/tests/setup.ts`                                                                                                | mock de Sentry + forwarding desactivado en `MODE === "test"`                                                        |
| `frontend/src/tests/performance/bundle-budget.test.ts`                                                                       | **nuevo** — valida la lógica monótona con **fixtures** (no inspecciona `dist/`)                                     |
| `frontend/e2e/container-queries.spec.ts`                                                                                     | **nuevo** — verificación de layout con motor real (no JSDOM)                                                        |
| `frontend/e2e/performance.spec.ts`                                                                                           | extender con las rutas críticas                                                                                     |
| `frontend/.lighthouserc.json`                                                                                                | **nuevo** — umbrales de Lighthouse CI + `puppeteerScript`                                                           |
| `.github/workflows/ci.yml`                                                                                                   | job/steps de los gates de bundle y Lighthouse (hoy solo corre `validate:ci:coverage`)                               |
| `.agents/rules/frontend-performance.md`                                                                                      | invariantes 1 y 2 actualizadas                                                                                      |
| `docs/adr/0026-frontend-rendering-observability.md`                                                                          | decisión permanente                                                                                                 |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** El spec es de frontend puro.
- **Sin cambios de API pública de los componentes**: la migración es interna;
  las props de `MetricCard`, `ReportTable`, etc. no cambian. `ReportTable`
  es un archivo **certificado**
  (`frontend/design-system-certified.json`): si la spec 036 cambia su nombre
  o ubicación, ese JSON se actualiza en el PR de 036, no en este.
- **Colisión con la spec 036**: `ReportTable.tsx`, `SortableHeader.tsx` y
  `PaginationControls.tsx` son reescritos por la Fase D de 036 (T14-T17).
  Esta spec **no los reescribe**: aplica container queries sobre `DataTable`
  y sobre el wrapper de `PaginationControls`. Las dos specs no pueden tocar
  los mismos ficheros en el mismo PR.
- **Sentry**: se **añaden** breadcrumbs, tags/contexto y eventos de
  umbral de CWV. No se cambia la inicialización existente
  (`src/utils/sentry.ts:9`) ni el `dsn` ni el `environment`. El volumen de
  eventos sube → se verifica el quota de Sentry antes de activar el reporte
  de `warn` como breadcrumb (los breadcrumbs no consumen cuota) y se filtran
  los 4xx de negocio antes de `captureException`.
- **CI**: el pipeline suma 2 gates (budget de bundle, Lighthouse). El de
  Lighthouse se ejecuta con `lhci` sobre las rutas críticas con hash y sesión
  sembrada, en nightly o en el job de performance.
- **Bundle**: `web-vitals` entra al bundle de producción (~1-2 kB). El
  compilador puede **aumentar** el tamaño del código generado (es su
  naturaleza); el budget de AC8 obliga a verificarlo, y si el margen no
  aguanta, la mitigación es activar el compilador **solo** en los chunks
  que lo necesitan, no en todo.
- **PWA/Workbox**: el precache cambia de tamaño si cambia el bundle; el
  budget de precache (≤ 2 MiB) lo acota.

## Riesgos y rollback

| Riesgo                                                                      | Mitigación                                                                                                                                                                        | Rollback                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| React Compiler expone bugs de memoización manual incorrecta                 | medición de renders antes/después (AC3) + e2e completo + migración por lotes con el compilador activo                                                                             | desactivar el compilador (1 línea)  |
| El compilador hace **bail-out** en un componente y se pierde su memoización | `eslint-plugin-react-hooks` **antes** de la Fase B; los bail-outs se detectan por lint y por los diagnósticos del build; los componentes saltados conservan la memoización manual | revertir el lote                    |
| El compilador aumenta el bundle por encima del presupuesto                  | medición previa; si excede, activar el compilador por chunk en lugar de globalmente                                                                                               | configuración por chunk             |
| Eliminar memoización "redundante" cambia el comportamiento en un caso raro  | **no se elimina sin evidencia**; los que sobreviven llevan justificación; e2e completo en cada lote                                                                               | revertir el lote                    |
| `container-type: inline-size` colapsa una primitiva inline a 0 px           | la lista de contenedores de bloque es explícita (AC4) y **`Badge` queda fuera**; verificación visual en Playwright                                                                | revertir la primitiva               |
| Unificar un par virtualizado con un `estimateSize` fijo superpone las filas | `estimateSize` sigue la geometría real: `measureElement`/`ResizeObserver` o dos virtualizadores con geometrías distintas                                                          | revertir el par                     |
| Unificar los pares desktop/mobile cambia el diseño del móvil                | comparación lado a lado antes/después en cada par; si la densidad es radicalmente distinta, se conserva con justificación                                                         | revertir el par                     |
| `web-vitals` satura el quota de Sentry                                      | no se duplican transacciones (`browserTracingIntegration` ya mide); solo se emite evento al superar un umbral; `warn` va a breadcrumb                                             | muestreo o desactivación por flag   |
| El logger a Sentry duplica ruido o quema cuota en 4xx de negocio            | filtro de estado HTTP antes de `captureException`; `warn`/`info`/`debug` a breadcrumb                                                                                             | desactivar el forwarding por flag   |
| Ciclo de importación `logger` ↔ `sentry`                                    | import **diferido y cacheado** de Sentry (patrón de `sentryMiddlewares.ts:5-11`)                                                                                                  | revert del forwarding               |
| El forwarding a Sentry en tests contamina la suite                          | `MODE === "test"` desactiva el forwarding y `src/tests/setup.ts` mockea Sentry                                                                                                    | revertir el mock                    |
| El test de budget de bundle depende de `dist/` y falla en CI                | el test valida la **lógica** con fixtures; el gate real se encadena **después** de `npm run build`                                                                                | mover el gate al script             |
| Lighthouse mide la redirección al login en vez de la vista                  | `puppeteerScript` siembra `sessionStorage` (`authToken` + `currentUser`) y las URLs llevan hash                                                                                   | medir solo rutas públicas           |
| Lighthouse CI es flaky en CI                                                | umbrales con margen, reintento de 1 vez, y ejecución **nightly** en lugar de en cada PR                                                                                           | ejecutar solo en nightly            |
| El budget de bundle bloquea un PR legítimo que aumenta un chunk             | el budget es monótono pero **ajustable a la baja con justificación**; el `--update` documenta el motivo                                                                           | ajustar el budget con justificación |

## Verificación

```bash
cd frontend
npm run check
npm run lint                                    # budget 0/0
npm run test:run -- src/tests/performance       # lógica del budget, con fixtures
npm run build                                  # bundle: verificar budgets
node scripts/check-bundle-budget.cjs          # budget de bundle (tras el build)
node scripts/measure-renders.mjs              # AC3: renders antes/después
npm run validate:ci
npm run e2e:staging                            # 56 tests, incluido performance.spec.ts
npx playwright test e2e/container-queries.spec.ts   # AC4/AC5: layout con motor real

# Raíz
npm run spec:check
npm run docs:check
npm run preflight
```
