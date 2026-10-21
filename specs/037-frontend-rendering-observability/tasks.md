# Tareas 037: Frontend Rendering & Observability

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — React Compiler + linter de hooks

- [ ] T1: Integrar React Compiler por una vía **compatible con
      `@vitejs/plugin-react@6.1.2`**: instalar `oxc-transform-react` (devDep) y
      activar `react({ compiler: true, reportDiagnostics: true })` en
      `frontend/vite.config.ts` (o, en su defecto, `@rolldown/plugin-babel` +
      `babel-plugin-react-compiler` + `reactCompilerPreset()` del propio
      plugin). **No** usar la opción `babel`, que el tipo `Options` de
      `@vitejs/plugin-react@6.1.2` ya no declara. El compilador queda activo
      en **dev, test y build** (mismo plugin en los tres modos), no solo en
      producción, y los diagnósticos de bail-out son visibles en el log del
      build (AC1).
- [ ] T2: Instalar `eslint-plugin-react-hooks@7` (devDep, admite `eslint ^10`)
      y registrarlo en `frontend/eslint.config.js` con sus reglas de
      compilador activas (`react-hooks/exhaustive-deps`,
      `react-hooks/unsupported-syntax`, `react-hooks/incompatible-library`,
      `react-hooks/preserve-manual-memoization`); el budget de lint sigue en
      0/0. Es **prerrequisito** de la Fase B (AC2).
- [ ] T3: Crear `frontend/scripts/measure-renders.mjs`: medición reproducible
      de renders por interacción en las 5 vistas críticas (dashboard,
      planificador, worker-portal, logbook, kiosk); capturar el **baseline**
      antes de la Fase B (AC3).
- [ ] T4: Medir el bundle por chunk y el tiempo de build con el compilador
      activo; contrastar contra el baseline (`react-core` 218 kB,
      `charts` 145 kB, `vendor` 70 kB, precache 1.52 MiB) (AC1, AC8).

## Fase B — Auditoría y limpieza de la memoización

- [ ] T5: Auditar las **266** llamadas a `useMemo`/`useCallback` (**160**
      `useMemo(` + **106** `useCallback(`) y los **36** `memo()` (**32**
      `React.memo(` + **4** `memo(` importado sin prefijo) en lotes por
      feature, empezando por los hooks más grandes (`useShiftPatternForm`
      450, `useKioskData` 373, `useWorkerPortalData` 371,
      `useEmployeeManagementData` 344, `useShiftCalendarData` 319,
      `useAccountingClosureTabController` 297); identificar por lint y por los
      diagnósticos del build los componentes con **bail-out** del compilador
      (AC2).
- [ ] T6: Aplicar el **criterio de eliminación explícito**: eliminar solo lo
      que el compilador cubre; **conservar con comentario justificativo** lo
      que expresa una intención que el compilador no infiere (referencia que
      evita re-suscribir una suscripción de socket, dependencia de un
      `useEffect` externo, hot path medido); y **conservar también** la
      memoización manual de los componentes con bail-out, listándolos como
      excepciones documentadas (AC2).
- [ ] T7: Registrar el recuento final (antes/después) de `useMemo`,
      `useCallback` y `memo()` en la evidencia de cierre del spec (AC2).
- [ ] T8: Re-ejecutar `scripts/measure-renders.mjs` y verificar que el
      número de renders por interacción en las 5 vistas críticas **no
      aumenta** respecto al baseline de T3 (AC3).

## Fase C — Container queries

> **Depende de la Fase D de la
> [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md)** para
> `ReportTable`, `SortableHeader` y `PaginationControls` (T13). La container
> query se aplica sobre la primitiva `DataTable` que crea 036, no sobre el
> `ReportTable` actual: esta spec no reescribe esos ficheros.

- [ ] T9: Introducir el patrón de container queries en las primitivas de
      **bloque** de `frontend/src/components/ui/`: `container-type: inline-size` + variantes `@sm:`/`@lg:`/`@2xl:` de Tailwind v4 en `MetricCard`, `Card`,
      `EmptyState` y `ReportTable`, y en el wrapper de `PaginationControls`,
      sustituyendo los breakpoints de viewport en su layout interno.
      **`Badge` queda explícitamente fuera** (es un `<span className="inline-flex">`
      de ancho intrínseco: `container-type: inline-size` lo colapsaría a 0 px)
      (AC4).
- [ ] T10: Crear `frontend/e2e/container-queries.spec.ts`: verificar con
      **motor de layout real** (Playwright, no JSDOM: `vite.config.ts:232`
      fija `environment: "jsdom"`, sin layout ni evaluación de `@container`)
      que las primitivas se adaptan al **ancho del contenedor** y no al de la
      ventana, con la ventana ancha y el contenedor estrecho (AC4, AC5).
- [ ] T11: Unificar los pares desktop/mobile de
      `features/theoretical-shifts/components/{AssignmentList,LeaveList,PatternList,HolidayList}{Desktop,Mobile}.tsx`
      en componentes adaptables por container query, o documentar en cada par
      restante por qué la duplicación es necesaria (densidad de información
      radicalmente distinta). La unificación **exige** que `estimateSize`
      siga la geometría real (`measureElement`/`ResizeObserver` sobre el
      contenedor, o dos virtualizadores con geometrías distintas que
      comparten subcomponentes: 65/160, 65/160, 65/120, 65/110 px): unificar
      con un `estimateSize` fijo superpone las filas (AC5).
- [ ] T12: Unificar `features/time-control/components/TimeRecordTableView{Desktop,Mobile}.tsx`
      y `TimeRecordMobileCard.tsx` (geometrías 66 px vs 280 px), o justificar
      su permanencia con el criterio de densidad (AC5).
- [ ] T13: Unificar `components/ui/ReportTableMobile{Daily,Summary}Card.tsx`
      con la tabla por container query, o justificar su permanencia.
      **Requiere la Fase D de la spec 036** (T14-T17): se aplica sobre la
      primitiva `DataTable`, no sobre el `ReportTable` actual (AC5).
- [ ] T14: Unificar la bifurcación interna de geometría de
      `features/governance/components/AuditLogsView.tsx:35-36,245`
      (`ROW_HEIGHT_DESKTOP` 48 px / `ROW_HEIGHT_MOBILE` 90 px), o justificar
      su permanencia (AC5).
- [ ] T15: Verificar que `data-ui-perf="high"`
      (`frontend/src/index.css:689`) y `prefers-reduced-motion`
      (`frontend/src/index.css:679`) siguen funcionando tras la migración a
      container queries (AC4).

## Fase D — Observabilidad

- [ ] T16: Añadir `web-vitals` (runtime) y crear
      `frontend/src/utils/webVitals.ts`: reporte de LCP, INP, CLS, FCP y
      TTFB a Sentry **enriqueciendo el contexto** (ruta, rol, dispositivo,
      conexión); inicialización **diferida** (`requestIdleCallback`) que no
      bloquea el primer paint. **No** se emite una transacción por métrica:
      `src/utils/sentry.ts:34` ya instrumenta CWV con
      `browserTracingIntegration`, así que `web-vitals` solo añade tags/contexto
      y emite evento o breadcrumb **cuando una métrica supera un umbral
      degradado** (AC6).
- [ ] T17: Convertir `frontend/src/utils/logger.ts` en un sink real con
      **import diferido y cacheado** de Sentry (patrón de
      `sentryMiddlewares.ts:5-11`, para **no** ciclar con
      `src/utils/sentry.ts:1`): `error` → `Sentry.captureException` **con
      filtro de estado HTTP** (los 4xx de negocio que la UI maneja —400/401/
      403/409— van a breadcrumb, como en `sentryMiddlewares.ts:65`, y **no**
      generan evento de error); `warn` → breadcrumb; `info`/`debug` →
      breadcrumb; salida de consola **solo en desarrollo**; forwarding
      **desactivado** cuando `import.meta.env.MODE === "test"` (AC7).
- [ ] T18: Sustituir el `console.warn` de `frontend/src/utils/sentry.ts:25`
      (aviso de DSN ausente) por `logger.warn`; no se toca el resto de la
      inicialización de Sentry (AC7).
- [ ] T19: Migrar las **105** llamadas crudas a `console.warn`/`console.error`
      en `frontend/src/` al `logger`, en lotes por área (`services/` 24,
      `features/` 24, `utils/` 22, `store/` 19, `hooks/` 9, `workers/` 3,
      `components/` 2, `lib/` 1, `App.tsx` 1), con el budget de lint en 0/0 en
      todo momento (AC7).
- [ ] T20: Cambiar `no-console` en `frontend/eslint.config.js:39` a
      `allow: []` con excepción únicamente para `src/utils/logger.ts`; el
      lint sigue en 0/0 (AC7).

## Fase E — Presupuesto de performance en CI

- [ ] T21: Crear `frontend/performance-budget.json` (presupuestos de bundle
      por chunk y de precache) y `frontend/scripts/check-bundle-budget.cjs`,
      con la **política monótona** de `design-system-budget.json`: el
      presupuesto solo puede bajar y `--update` aborta si el conteo actual
      supera el vigente (AC8).
- [ ] T22: Crear `frontend/src/tests/performance/bundle-budget.test.ts` que
      valida la **lógica monótona** del verificador (umbrales ≤ 260 kB,
      `charts` ≤ 180 kB, precache ≤ 2 MiB, `--update` que aborta) con
      **fixtures**, **sin inspeccionar `dist/`**: la fase de tests de
      `validate:ci` corre **antes** de `npm run build` y en CI `dist/` no
      existe todavía (AC8).
- [ ] T23: Encadenar `node scripts/check-bundle-budget.cjs` **después** de
      `npm run build` en `validate:ci` y en `validate:ci:coverage` (el job de
      CI usa `validate:ci:coverage`), de modo que el gate se ejecute
      **siempre contra el build recién generado** (AC8).
- [ ] T24: Añadir `@lhci/cli` (devDep) y `frontend/.lighthouserc.json` con
      umbrales de Core Web Vitals sobre las rutas críticas. Las URLs llevan
      **hash** (la app usa `HashRouter`, `src/contexts/AppProviders.tsx:28`:
      `/#/dashboard`, `/#/admin/governance?tab=audit`) y el
      `puppeteerScript` **siembra la sesión** (`sessionStorage.authToken` +
      `sessionStorage.currentUser`, el mismo mecanismo que
      `e2e/helpers/auth-helper.ts:89-95`), porque `ProtectedRoute` redirige
      al login sin sesión (`src/router/ProtectedRoute.tsx:21-23`) (AC8).
- [ ] T25: Integrar los gates de budget de bundle y de Lighthouse en
      `.github/workflows/ci.yml` (nightly o en un job de performance), hoy
      ausente: el job `verify-frontend` solo ejecuta `validate:ci:coverage`
      (AC8).
- [ ] T26: Extender `frontend/e2e/performance.spec.ts` con las rutas
      críticas y registrar los tiempos como baseline documentado (AC9).

## Verificación final

- [ ] T27: Actualizar la documentación: README del frontend (React Compiler
      activo en dev/test/build y qué significa para la memoización manual),
      `.agents/rules/frontend-performance.md` (invariantes 1 y 2 actualizadas:
      memoización manual opcional bajo el compilador; container queries en
      componentes reutilizables) y el docblock de `vite.config.ts` (AC9).
- [ ] T28: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` y `npm run e2e:staging` (56 tests, incluidos
      `performance.spec.ts` y `a11y.spec.ts`) (AC9).
- [ ] T29: Promover `docs/adr/0026-frontend-rendering-observability.md` de
      "Propuesto" a "Aceptado" con las líneas de implementación verificadas;
      actualizar la tabla de `docs/adr/README.md` en el mismo commit; marcar
      el spec como "Implementado" (AC9).
