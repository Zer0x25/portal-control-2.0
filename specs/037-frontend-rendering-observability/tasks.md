# Tareas 037: Frontend Rendering & Observability

Spec: `./spec.md`. Plan: `./plan.md`.

Reglas: una tarea = un PR revisable o un commit. Cada tarea cita su AC.

## Fase A — React Compiler

- [ ] T1: Añadir `babel-plugin-react-compiler` (devDep) y aplicarlo en
      `frontend/vite.config.ts` **solo en build de producción** (el modo dev
      conserva Fast Refresh sin el compilador) (AC1).
- [ ] T2: Crear `frontend/scripts/measure-renders.mjs`: medición reproducible
      de renders por interacción en las 5 vistas críticas (dashboard,
      planificador, worker-portal, logbook, kiosk); capturar el **baseline**
      antes de la Fase B (AC3).
- [ ] T3: Medir el bundle por chunk y el tiempo de build con el compilador
      activo; contrastar contra el baseline (`react-core` 218 kB,
      `charts` 145 kB, `vendor` 70 kB, precache 1.52 MiB) (AC1, AC8).

## Fase B — Auditoría y limpieza de la memoización

- [ ] T4: Auditar los 360 `useMemo`/`useCallback` y los 39 `React.memo` en
      lotes por feature, empezando por los hooks más grandes
      (`useShiftPatternForm` 450, `useKioskData` 373,
      `useWorkerPortalData` 371, `useEmployeeManagementData` 344,
      `useShiftCalendarData` 319, `useAccountingClosureTabController` 297) (AC2).
- [ ] T5: Aplicar el **criterio de eliminación explícito**: eliminar solo lo
      que el compilador cubre; **conservar con comentario justificativo** lo
      que expresa una intención que el compilador no infiere (referencia que
      evita re-suscribir una suscripción de socket, dependencia de un
      `useEffect` externo, hot path medido) (AC2).
- [ ] T6: Registrar el recuento final (antes/después) de `useMemo`,
      `useCallback` y `React.memo` en la evidencia de cierre del spec (AC2).
- [ ] T7: Re-ejecutar `scripts/measure-renders.mjs` y verificar que el
      número de renders por interacción en las 5 vistas críticas **no
      aumenta** respecto al baseline de T2 (AC3).

## Fase C — Container queries

- [ ] T8: Introducir el patrón de container queries en las primitivas de
      `frontend/src/components/ui/`: `container-type: inline-size` + variantes
      `@sm:`/`@lg:`/`@2xl:` de Tailwind v4 en `MetricCard`, `ReportTable`,
      `EmptyState`, `Badge`, `Card` y `PaginationControls`, sustituyendo los
      breakpoints de viewport en su layout interno (AC4).
- [ ] T9: Crear `frontend/src/tests/performance/container-queries.test.ts`:
      verificar que las primitivas se adaptan al **ancho del contenedor**
      (y no al de la ventana) en un contenedor estrecho embebido en una
      ventana ancha (AC4).
- [ ] T10: Unificar los pares desktop/mobile de
      `features/theoretical-shifts/components/{AssignmentList,LeaveList,PatternList,HolidayList}{Desktop,Mobile}.tsx`
      en componentes adaptables por container query, o documentar en cada par
      restante por qué la duplicación es necesaria (densidad de información
      radicalmente distinta) (AC5).
- [ ] T11: Unificar `components/ui/ReportTableMobile{Daily,Summary}Card.tsx`
      con la tabla por container query, o justificar su permanencia (AC5).
- [ ] T12: Verificar que `data-ui-perf="high"`
      (`frontend/src/index.css:689`) y `prefers-reduced-motion`
      (`frontend/src/index.css:679`) siguen funcionando tras la migración a
      container queries (AC4).

## Fase D — Observabilidad

- [ ] T13: Añadir `web-vitals` (runtime) y crear
      `frontend/src/utils/webVitals.ts`: reporte de LCP, INP, CLS, FCP y
      TTFB a Sentry con contexto (ruta, rol, dispositivo, conexión);
      inicialización **diferida** (`requestIdleCallback`) que no bloquea el
      primer paint (AC6).
- [ ] T14: Convertir `frontend/src/utils/logger.ts` en un sink real:
      `error` → `Sentry.captureException` con contexto; `warn` → breadcrumb
      (sin coste de cuota); `info`/`debug` → breadcrumb; salida de consola
      **solo en desarrollo** (AC7).
- [ ] T15: Migrar las **103** llamadas crudas de `console.warn`/`console.error`
      en `frontend/src/` al `logger`, en lotes por área (`store`, `utils`,
      `services`, `features`), con el budget de lint en 0/0 en todo momento
      (AC7).
- [ ] T16: Cambiar `no-console` en `frontend/eslint.config.js:39` a
      `allow: []` con excepción únicamente para `src/utils/logger.ts`; el
      lint sigue en 0/0 (AC7).

## Fase E — Presupuesto de performance en CI

- [ ] T17: Crear `frontend/performance-budget.json` (presupuestos de bundle
      por chunk y de precache) y `frontend/scripts/check-bundle-budget.cjs`,
      con la **política monótona** de `design-system-budget.json`: el
      presupuesto solo puede bajar y `--update` aborta si el conteo actual
      supera el vigente (AC8).
- [ ] T18: Crear `frontend/src/tests/performance/bundle-budget.test.ts` que
      verifica los presupuestos (líneas ≤ 260 kB, `charts` ≤ 180 kB,
      precache ≤ 2 MiB) contra el manifiesto generado (AC8).
- [ ] T19: Añadir `@lhci/cli` (devDep) y `frontend/.lighthouserc.json` con
      umbrales de Core Web Vitals sobre las rutas críticas; integrar el gate
      en el pipeline (nightly o en el job de performance) (AC8).
- [ ] T20: Extender `frontend/e2e/performance.spec.ts` con las rutas
      críticas y registrar los tiempos como baseline documentado (AC9).

## Verificación final

- [ ] T21: Actualizar la documentación: README del frontend (React Compiler
      activo y qué significa para la memoización manual),
      `.agents/rules/frontend-performance.md` (invariantes 1 y 2 actualizadas:
      memoización manual opcional bajo el compilador; container queries en
      componentes reutilizables) y el docblock de `vite.config.ts` (AC9).
- [ ] T22: Suite completa verde: `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` y `npm run e2e:staging` (56 tests, incluidos
      `performance.spec.ts` y `a11y.spec.ts`) (AC9).
- [ ] T23: Promover `docs/adr/0026-frontend-rendering-observability.md` de
      "Propuesto" a "Aceptado" con las líneas de implementación verificadas;
      actualizar la tabla de `docs/adr/README.md` en el mismo commit; marcar
      el spec como "Implementado" (AC9).
