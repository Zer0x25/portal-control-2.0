# Plan 037: Frontend Rendering & Observability

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../033-frontend-layering-hardening/plan.md`,
`../035-frontend-testing-stack/plan.md`,
`../036-frontend-form-table-primitives/plan.md`,
`../038-design-system-catalog-pipeline/plan.md`.

## Estrategia

5 workstreams (A–E). **El orden importa**: la memoización manual se audita
(AC2) **después** de activar el compilador (Fase A), porque el compilador es
lo que revela qué memoización era realmente necesaria.

1. **Fase A — React Compiler (2 PR)**:
   - Añadir `babel-plugin-react-compiler` (devDep) y aplicarlo en
     `frontend/vite.config.ts` vía `babel: { plugins: ["babel-plugin-react-compiler"] }`
     (o el plugin oficial `@vitejs/plugin-react` con la opción
     `babel: { plugins: [...] }`). **Solo en build de producción**: el modo
     dev mantiene el runtime de Fast Refresh sin el compilador, para no
     ralentizar el ciclo local.
   - Medición **antes/después**: tamaño de bundle por chunk, número de
     renders por interacción en las 5 vistas críticas, y tiempo de build.
   - El compilador **no cambia la API**: los hooks siguen funcionando igual.
     Lo que cambia es que React memoriza automáticamente.
   - Riesgo conocido: el compilador puede **exponer** bugs de memoización
     manual incorrecta (p. ej. un `useMemo` con dependencias incompletas que
     antes "funcionaba" por casualidad). Se audita con el script de medición
     de renders (AC3) y con los e2e.
2. **Fase B — Auditoría y limpieza de la memoización (3 PR)**:
   - Auditar los 360 `useMemo`/`useCallback` y los 39 `React.memo` en
     **lotes** (por feature, empezando por los hooks más grandes:
     `useShiftPatternForm` (450), `useAccountingClosureTabController` (297),
     `useKioskData` (373), `useWorkerPortalData` (371),
     `useEmployeeManagementData` (344), `useShiftCalendarData` (319)).
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
3. **Fase C — Container queries (3 PR)**:
   - Introducir el patrón: la primitiva declara `container-type: inline-size`
     y usa las variantes de container query de Tailwind v4 (`@sm:`, `@lg:`,
     `@2xl:`) en lugar de breakpoints de viewport (`sm:`, `md:`, `lg:`).
     Tailwind v4 incluye el soporte de container queries en el core.
   - Migrar primero las primitivas de `components/ui/` (`MetricCard`,
     `ReportTable`, `EmptyState`, `Badge`, `Card`, `PaginationControls`), que
     son las reutilizables; después los componentes de feature.
   - **Consecuencia buscada**: los **5 pares desktop/mobile** (
     `AssignmentList*`, `LeaveList*`, `PatternList*`, `HolidayList*` y
     `ReportTableMobile*`) se unifican. Cuando la densidad de información del
     móvil es radicalmente distinta (y no una diferencia de ancho), la
     duplicación **se conserva con justificación documentada**.
   - `useMediaQuery` y `useScreenSize` se **mantienen** para decisiones de
     layout **de página** (shell, navegación), que sí dependen del viewport;
     lo que cambia es que los **componentes reutilizables** dejan de
     depender del viewport.
4. **Fase D — Observabilidad (2 PR)**:
   - `web-vitals` (runtime): `initWebVitals` en `src/utils/webVitals.ts`,
     inicialización **diferida** (`requestIdleCallback` tras el primer
     paint) y reporte a Sentry con contexto (ruta via `useLocation`, rol via
     el store, `navigator.connection` si existe, viewport).
   - **Muestreo**: los_CORE web vitals se reportan siempre (son pocos
     eventos por sesión); los eventos de Sentry normales mantienen su
     muestreo actual.
   - `src/utils/logger.ts` pasa a ser un sink real: `error` →
     `captureException` con contexto; `warn` → breadcrumb; `info`/`debug` →
     breadcrumb; consola **solo en desarrollo**. Las 103 llamadas crudas
     migran al logger en lotes por área; `no-console` pasa a `allow: []` con
     excepción para el propio logger.
5. **Fase E — Presupuesto de performance en CI (2 PR)**:
   - **Budget de bundle**: script que lee el manifiesto de Vite y falla si
     un chunk supera su presupuesto (con margen sobre el estado actual:
     `react-core` ≤ 260 kB, `charts` ≤ 180 kB, precache ≤ 2 MiB). Los
     presupuestos viven en un **fichero versionado**
     (`frontend/performance-budget.json`), con la misma política monótona
     que `design-system-budget.json` y `lint-budget.json`: el presupuesto
     solo puede **bajar**, y `--update` aborta si el conteo actual supera el
     vigente.
   - **Lighthouse CI**: gate sobre las rutas críticas con umbrales de Core
     Web Vitals. Se ejecuta en el pipeline, no en cada PR de código (coste),
     o en nightly.

## Archivos a tocar

| Archivo                                                                                                                      | Cambio                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `frontend/package.json`                                                                                                      | `babel-plugin-react-compiler` (devDep), `web-vitals` (runtime), `@lhci/cli` (devDep), script de budget |
| `frontend/vite.config.ts`                                                                                                    | plugin del compilador (solo build), config de Lighthouse, chunk budgets                                |
| `frontend/performance-budget.json`                                                                                           | **nuevo** — presupuestos de bundle y precache (monótonos)                                              |
| `frontend/scripts/check-bundle-budget.cjs`                                                                                   | **nuevo** — verificador del budget                                                                     |
| `frontend/scripts/measure-renders.mjs`                                                                                       | **nuevo** — medición reproducible de renders (AC3)                                                     |
| `frontend/src/utils/webVitals.ts`                                                                                            | **nuevo** — init diferida + reporte a Sentry con contexto                                              |
| `frontend/src/utils/logger.ts`                                                                                               | sink real a Sentry + modo desarrollo                                                                   |
| `frontend/src/**` (360 `useMemo`/`useCallback`, 39 `memo`)                                                                   | auditoría y limpieza en lotes (Fase B)                                                                 |
| `frontend/src/components/ui/{MetricCard,ReportTable,EmptyState,Badge,Card,PaginationControls}.tsx`                           | container queries + adaptación al ancho disponible                                                     |
| `frontend/src/features/theoretical-shifts/components/{AssignmentList,LeaveList,PatternList,HolidayList}{Desktop,Mobile}.tsx` | unificación por container query                                                                        |
| `frontend/src/components/ui/ReportTableMobile{Daily,Summary}Card.tsx`                                                        | unificación o justificación explícita                                                                  |
| `frontend/src/**` (103 `console.warn`/`console.error`)                                                                       | migración al `logger` (lotes)                                                                          |
| `frontend/eslint.config.js`                                                                                                  | `no-console` → `allow: []` (excepción solo para el logger)                                             |
| `frontend/src/tests/performance/bundle-budget.test.ts`                                                                       | **nuevo**                                                                                              |
| `frontend/src/tests/performance/container-queries.test.ts`                                                                   | **nuevo**                                                                                              |
| `frontend/e2e/performance.spec.ts`                                                                                           | extender con las rutas críticas                                                                        |
| `frontend/.lighthouserc.json`                                                                                                | **nuevo** — umbrales de Lighthouse CI                                                                  |
| `.agents/rules/frontend-performance.md`                                                                                      | invariantes 1 y 2 actualizadas                                                                         |
| `docs/adr/0026-frontend-rendering-observability.md`                                                                          | decisión permanente                                                                                    |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** El spec es de frontend puro.
- **Sin cambios de API pública de los componentes**: la migración es interna;
  las props de `MetricCard`, `ReportTable`, etc. no cambian. `ReportTable`
  es un archivo **certificado**
  (`frontend/design-system-certified.json`): si cambia de nombre o de
  ubicación, ese JSON se actualiza en el mismo PR.
- **Sentry**: se **añaden** breadcrumbs y eventos de Core Web Vitals. No se
  cambia la inicialización existente (`src/utils/sentry.ts:9`) ni se altera
  el `dsn` ni el `environment`. El volumen de eventos sube → se verifica el
  quota de Sentry antes de activar el reporte de `warn` como breadcrumb
  (los breadcrumbs no consumen cuota).
- **CI**: el pipeline suma 2 gates (budget de bundle, Lighthouse). El gate de
  Lighthouse se ejecuta con `lhci` sobre las rutas críticas.
- **Bundle**: `web-vitals` entra al bundle de producción (~1-2 kB). El
  compilador puede **aumentar** el tamaño del código generado (es su
  naturaleza); el budget de AC8 obliga a verificarlo, y si el margen no
  aguanta, la mitigación es activar el compilador **solo** en los chunks
  que lo necesitan, no en todo.
- **PWA/Workbox**: el precache cambia de tamaño si cambia el bundle; el
  budget de precache (≤ 2 MiB) lo acota.

## Riesgos y rollback

| Riesgo                                                                     | Mitigación                                                                                                                | Rollback                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| React Compiler expone bugs de memoización manual incorrecta                | medición de renders antes/después (AC3) + e2e completo + migración por lotes con el compilador activo                     | desactivar el compilador (1 línea)  |
| El compilador aumenta el bundle por encima del presupuesto                 | medición previa; si excede, activar el compilador por chunk en lugar de globalmente                                       | configuración por chunk             |
| Eliminar memoización "redundante" cambia el comportamiento en un caso raro | **no se elimina sin evidencia**; los que sobreviven llevan justificación; e2e completo en cada lote                       | revertir el lote                    |
| Container queries rompen layouts que dependían del viewport                | migración por primitiva, con regresión visual (spec 035 si disponible) y revisión en claro/oscuro                         | revertir la primitiva               |
| Unificar los pares desktop/mobile cambia el diseño del móvil               | comparación lado a lado antes/después en cada par; si la densidad es radicalmente distinta, se conserva con justificación | revertir el par                     |
| `web-vitals` satura el quota de Sentry                                     | solo se reportan las 5 métricas (pocos eventos por sesión); `warn` va a breadcrumb, no a evento                           | muestreo o desactivación por flag   |
| El logger a Sentry duplica ruido en desarrollo                             | consola solo en desarrollo (flag de entorno)                                                                              | flag a `false`                      |
| El budget de bundle bloquea un PR legítimo que aumenta un chunk            | el budget es monótono pero **ajustable a la baja con justificación**; el `--update` documenta el motivo                   | ajustar el budget con justificación |
| Lighthouse CI es flaky en CI                                               | umbrales con margen, reintento de 1 vez, y ejecución **nightly** en lugar de en cada PR                                   | ejecutar solo en nightly            |

## Verificación

```bash
cd frontend
npm run check
npm run lint                                    # budget 0/0
npm run test:run -- src/tests/performance
npm run build                                  # bundle: verificar budgets
node scripts/check-bundle-budget.cjs          # budget de bundle
node scripts/measure-renders.mjs              # AC3: renders antes/después
npm run validate:ci
npm run e2e:staging                            # 56 tests, incluido performance.spec.ts

# Raíz
npm run spec:check
npm run docs:check
npm run preflight
```
