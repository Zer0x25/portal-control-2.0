# ADR-0026: Frontend Rendering & Observability — Compilador, container queries y métricas en campo

- Estado: Aceptado
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

El repo invirtió mucho en rendimiento (code splitting con chunks por
dominio, virtualización con `@tanstack/react-virtual`, precache PWA de 183 entradas / 1643.43 KiB (~1.61 MiB), `react-core` de 218.69 kB / 68.21 kB gzip, `charts` de 145.61 kB /
51.05 kB gzip aislado) y fijó invariantes claras en
`.agents/rules/frontend-performance.md`. Pero **dos de esas invariantes no son
verificables** y la observabilidad de UI es parcial:

1. **La memoización es manual y no auditada.** Hay **336 llamadas** a
   `useMemo`/`useCallback` (**182** `useMemo(` + **154** `useCallback(`) y
   **36** llamadas a `memo()` (**32** `React.memo(` + **4** `memo(` importado
   sin prefijo) en `frontend/src/`. React 19.3 está en el stack, pero **React
   Compiler no está**: `frontend/vite.config.ts:84` llama `react()` sin
   opciones y no hay `babel-plugin-react-compiler` ni `oxc-transform-react` en
   `frontend/package.json` (solo `@babel/plugin-transform-runtime`).
   Consecuencias:
   - cada `useMemo` es una **declaración manual de dependencias** que puede
     estar mal y que **ninguna herramienta audita**;
   - los 36 `memo()` pueden ser innecesarios (el compilador haría lo mismo) o
     insuficientes (memoizan el componente pero no las props que importan);
   - con 336 optimizaciones manuales, cada re-render es difícil de razonar.

   Y activarlo tal cual, hoy, es imposible sin decisiones adicionales:
   - **La vía de integración habitual ya no existe en el plugin instalado.**
     `@vitejs/plugin-react` está en **6.1.2** (Vite 8 / Rolldown) y su tipo
     `Options` **no declara la opción `babel`**: solo
     `compiler?: boolean | ReactCompilerPluginOptions` (que exige
     `oxc-transform-react` instalado) y el export `reactCompilerPreset()` para
     `@rolldown/plugin-babel`. `babel: { plugins: [...] }` rompe `tsc` y se
     ignora en runtime.
   - **No hay linter de hooks**: `eslint-plugin-react-hooks` no está en
     `devDependencies` y `frontend/eslint.config.js` no registra ningún plugin
     de hooks. Sin él no se ven ni las dependencias incorrectas ni los
     **bail-outs** del compilador (`react-hooks/unsupported-syntax`,
     `react-hooks/incompatible-library`,
     `react-hooks/preserve-manual-memoization`, disponibles en
     `eslint-plugin-react-hooks@7`, que admite `eslint ^10`).
   - **Activar el compilador solo en el build** deja `npm run dev` y toda la
     suite de Vitest ejecutando código sin compilar: las diferencias de
     comportamiento aparecen recién en el build final.

2. **El layout responde al viewport, no al contenedor.** Hay **0 usos de
   container queries** (`@container`) en todo `frontend/src`. La estrategia
   es `useMediaQuery` (12 consumidores en producción) + `useScreenSize` +
   `ResponsiveView` + `window.innerWidth` inline
   (`features/employee-management/hooks/useEmployeeManagementData.ts:64,108`,
   `hooks/useScreenSize.ts:10,17`, `hooks/layout/useSidebarController.ts:31,39,55,62,69`).
   Consecuencia: un componente reusable **no sabe cuánto espacio tiene**,
   solo cuánto ancho tiene la ventana. De ahí los **6 pares desktop/mobile
   duplicados a mano** (`AssignmentListDesktop/Mobile`,
   `LeaveListDesktop/Mobile`, `PatternListDesktop/Mobile`,
   `HolidayListDesktop/Mobile`, `TimeRecordTableViewDesktop/Mobile` +
   `TimeRecordMobileCard`, `ReportTableMobileDailyCard/SummaryCard`) y la
   bifurcación interna de `AuditLogsView.tsx:35-36,245`.

   Y la solución tiene **tres trampas**:
   - **`Badge` no puede ser el contenedor**: `Badge.tsx:20,48` es un
     `<span className="inline-flex ...">` de ancho intrínseco, y
     `container-type: inline-size` aplica contención de tamaño en el eje
     inline → el contenido deja de contribuir al ancho y el badge **colapsa a
     0 px**.
   - **Una container query no cambia `estimateSize`**: la geometría de los 12
     `useVirtualizer` está en JS y difiere entre pares (65/160, 65/120,
     65/110, 65/160, 66/280, 48/90 px). Unificar un par con un
     `estimateSize` fijo **superpone las filas**.
   - **JSDOM no evalúa layout** (`vite.config.ts:232`), así que la adaptación
     al contenedor no es verificable en la suite de Vitest.

3. **La observabilidad de UI es parcial y se solapa con lo que ya existe.**
   Sentry está integrado (`@sentry/browser` 11.1, `@sentry/react` 11.4,
   `src/utils/sentry.ts` 44 líneas) y **ya activa**
   `Sentry.browserTracingIntegration()` (`sentry.ts:34`), que instrumenta y
   reporta LCP, CLS, INP, FCP y TTFB en las transacciones muestreadas. Los
   errores de TanStack Query llegan como **breadcrumbs**
   (`src/lib/queryClient.ts:26,37` → `src/utils/sentryMiddlewares.ts`), que
   filtra 401/403 (`sentryMiddlewares.ts:65`), y Zustand también se registra
   como breadcrumb (`sentryMiddlewares.ts:34-53`). No hay `web-vitals`: no se
   mide CWV **con el contexto de rol y ruta**. El `e2e/performance.spec.ts`
   mide tiempos intra-página en un entorno sintético. Consecuencia: una
   regresión de rendimiento **no es detectable** hasta que un usuario se queja.

4. **El logger es un no-op.** `src/utils/logger.ts` es un passthrough puro a
   `console`, con un docstring que promete _"one place to later forward
   messages to Sentry"_ — y ese forwarding **no existe**. Solo 5 ficheros de producción lo
   usan (más 2 de test), y hay **105 llamadas** crudas a `console.warn`/`console.error` en
   `src/` (todas en producción; el único hit en `src/tests/` es el título de
   un test), permitidas por `no-console` (`frontend/eslint.config.js:39`,
   `allow: ["warn", "error"]`). **En producción, esos 105 mensajes no llegan
   a ningún sitio.**
   Y el sink tiene **tres trampas**: ciclo de importación (`sentry.ts:1`
   importa `logger`), un `console.warn` propio (`sentry.ts:25`) y riesgo de
   cuota (muchas de esas llamadas están en `catch` de servicios y mutaciones
   con errores 4xx de negocio que la UI ya maneja).

5. **No hay presupuesto de performance en CI.** Nada impide que el bundle
   crezca 200 kB en un PR. No hay Lighthouse CI, ni budget por chunk, ni
   alerta de regresión de CWV. Y el gate que se añada tiene **dos trampas**:
   `validate:ci` encadena `test:run:ci` **antes** de `build` (y en CI,
   `validate:ci:coverage` encadena `test:coverage` antes de `build`), así que
   un test de Vitest no puede inspeccionar `dist/`; y la app usa `HashRouter`
   (`src/contexts/AppProviders.tsx:28`) con rutas protegidas por
   `ProtectedRoute` (`src/router/ProtectedRoute.tsx:21-23`), así que un
   Lighthouse sin sesión mediría la redirección al login.

## Decisión

1. **React Compiler con una vía soportada por `@vitejs/plugin-react@6`, en
   dev, test y build, con linter de hooks previo.**
   - Vía de integración: `oxc-transform-react` + `react({ compiler: true })`,
     o `@rolldown/plugin-babel` + `babel-plugin-react-compiler` +
     `reactCompilerPreset()`. **La opción `babel` no se usa**: no existe en el
     tipo `Options` de `@vitejs/plugin-react@6.1.2`.
   - El compilador está activo en los **tres** modos (dev, test y build): el
     mismo plugin los cubre, y no se admite la variante "solo en build", que
     dejaría dev y test ejecutando otro código que producción.
   - `eslint-plugin-react-hooks@7` se instala y se registra **antes** de tocar
     memoización: es lo que permite distinguir "redundante" de "bail-out".
   - El compilador **sustituye la memoización manual**: se auditan las 336
     llamadas a `useMemo`/`useCallback` y los 36 `memo()` uno a uno y **se
     eliminan los redundantes**. Los que **no** son redundantes (una
     referencia que evita re-suscribir una suscripción de socket, una
     dependencia de un `useEffect` externo al árbol de React, un hot path
     medido) **se conservan con un comentario que justifique por qué**. Los
     componentes con **bail-out** conservan además su memoización manual y
     quedan listados como excepciones. El criterio es explícito: **no se
     elimina memoización sin evidencia**, y la evidencia es la medición de
     renders (script reproducible) más la suite e2e.

2. **Container queries para los componentes reutilizables, solo en
   contenedores de bloque y respetando la geometría de virtualización.**
   Las primitivas de `components/ui/` que son contenedores de bloque
   (`MetricCard`, `Card`, `EmptyState`, `ReportTable` y el wrapper de
   `PaginationControls`) declaran `container-type: inline-size` y usan las
   variantes `@sm:`/`@lg:`/`@2xl:` de Tailwind v4, adaptando su layout al
   **ancho disponible** y no al de la ventana. Las primitivas **inline**
   (`Badge`) quedan **fuera**: `container-type` en un elemento inline
   colapsa su contenido a 0 px. Al unificar un par desktop/mobile con lista
   virtualizada, `estimateSize` sigue la geometría real
   (`measureElement`/`ResizeObserver` o dos virtualizadores con geometrías
   distintas que comparten subcomponentes). `useMediaQuery` y
   `useScreenSize` **se mantienen** para las decisiones de layout **de
   página** (shell, navegación), que sí dependen del viewport: lo que cambia
   es que los **componentes** dejan de depender del viewport.

3. **Core Web Vitals en campo, enriquecendo (no duplicando) lo que Sentry ya
   mide.** `web-vitals` reporta LCP, INP, CLS, FCP y TTFB con el contexto
   que falta (ruta, rol, dispositivo, conexión), con inicialización
   **diferida** (`requestIdleCallback`) que no bloquea el primer paint. **No
   emite una transacción por métrica**: `browserTracingIntegration`
   (`sentry.ts:34`) sigue siendo la fuente canónica de CWV; `web-vitals`
   **añade** tags/contexto y emite evento o breadcrumb solo al **superar un
   umbral degradado**.

4. **El logger es un sink real, filtrado, sin ciclos y silencioso en tests.**
   `src/utils/logger.ts` forwardea a Sentry: `error` → `captureException`
   **con filtro de estado HTTP** (los 4xx de negocio que la UI maneja van a
   breadcrumb, como ya hace `sentryMiddlewares.ts:65`, y no consumen cuota de
   error), `warn` → **breadcrumb** (sin coste de cuota), `info`/`debug` →
   breadcrumb; la salida de consola queda **solo en desarrollo**. El acceso a
   Sentry es **diferido y cacheado** (patrón de `sentryMiddlewares.ts:5-11`),
   para no ciclar con `sentry.ts:1`, y se **desactiva en
   `MODE === "test"`**. Las 105 llamadas crudas migran al logger y
   `no-console` pasa a `allow: []` con excepción únicamente para el propio
   logger.

5. **Presupuesto de performance en CI, con la misma política monótona** que
   `design-system-budget.json` y `lint-budget.json`: un
   `frontend/performance-budget.json` con límites por chunk y de precache, un
   verificador que **falla si el bundle crece** y cuyo `--update` aborta si
   el conteo actual supera el vigente, y un gate de Lighthouse CI sobre las
   rutas críticas. El verificador se ejecuta **después** del build (la fase de
   tests de `validate:ci` corre antes y no puede depender de `dist/`; el
   test de Vitest valida la **lógica monótona** con fixtures). El gate de
   Lighthouse usa **URLs con hash** (la app usa `HashRouter`) y **siembra la
   sesión** (`sessionStorage.authToken` + `currentUser`, el mismo mecanismo
   que `e2e/helpers/auth-helper.ts:89-95`) antes de medir.

## Alternativas consideradas

1. **Mantener la memoización manual** — descartada: es la opción actual y
   su coste es invisible. 336 declaraciones de dependencias sin auditor,
   con un fallo de dependencia que produce un render obsoleto en un hot path
   que nadie va a depurar. El compilador convierte una invariativa en
   código generado por el framework.
2. **Activar React Compiler y eliminar toda la memoización manual** —
   descartada: se perderían las optimizaciones que expresan una intención
   que el compilador **no puede inferir** (referencias para evitar
   re-suscripciones, dependencias de efectos externos). La decisión
   intermedia — eliminar solo lo redundante, con justificación explícita
   para lo que sobrevive — es más honesta y más auditable.
3. **Activar el compilador con `babel: { plugins: [...] }`** — descartada:
   la opción ya **no existe** en `@vitejs/plugin-react@6.1.2`; rompe `tsc`
   y se ignora en runtime. Se adopta la vía soportada por el plugin.
4. **Activar el compilador solo en el build de producción** — descartada:
   crea dos códigos distintos (dev/test vs build) y esconde las diferencias
   de comportamiento hasta el build final. El plugin es el mismo en los tres
   modos, así que no hay coste real en activarlo en todos.
5. **Eliminar la memoización manual sin linter de hooks** — descartada: sin
   `eslint-plugin-react-hooks` no hay forma de saber si el compilador saltó
   un componente; borrar su memoización manual sería una regresión silenciosa
   en los 12 `useVirtualizer`, cuyo `estimateSize` se reevalúa en cada render.
6. **Declarar `container-type: inline-size` en todas las primitivas,
   incluida `Badge`** — descartada: `Badge` es inline de ancho intrínseco y
   la contención de tamaño en el eje inline lo colapsaría a 0 px. El patrón
   se aplica a contenedores de bloque.
7. **Unificar cada par desktop/mobile con un `estimateSize` fijo** —
   descartada: una container query no cambia el JS que mide las filas; con
   geometrías de 65 px frente a 160 px (o 66/280, 48/90) las filas se
   superponen. O se mide con `measureElement`/`ResizeObserver`, o se
   conservan dos geometrías explícitas.
8. **Verificar la adaptación al contenedor en Vitest/JSDOM** — descartada:
   `vite.config.ts:232` fija `environment: "jsdom"`, sin motor de layout ni
   evaluación de `@container`. La verificación va a Playwright.
9. **Reescribir los esquemas de ReportTable para forzar una única vista** —
   descartada: la Fase D de la spec 036 ya entregó `DataTable`; esta spec
   conserva las cards diarias y de resumen por sus diferentes columnas y
   acciones, pero selecciona ambas presentaciones desde container queries.
10. **Reportar los Core Web Vitals como transacciones propias** —
    descartada: `browserTracingIntegration` ya los instrumenta; duplicar
    Transacciones quema cuota y confunde el panel. `web-vitals` añade
    contexto y umbrales.
11. **Reportar los Core Web Vitals a un proveedor de analítica en vez de
    Sentry** — descartada: el repo ya tiene Sentry integrado, con
    `src/utils/sentry.ts` y middlewares (`src/utils/sentryMiddlewares.ts`,
    101 líneas). Un segundo sistema de telemetría duplicaría la
    configuración y el coste.
12. **Hacer el logger un no-op pero banir `console` por completo** —
    descartada: sin sink, los errores se perderían en silencio. Un logger que
    solo escribe en consola es peor que no tener logger, porque aparenta
    centralizar algo que no centraliza.
13. **Reportar todo `console.error` como `captureException` sin filtro** —
    descartada: las 105 llamadas incluyen `catch` de servicios y mutaciones
    con 4xx de negocio que la UI ya maneja; sin filtro, cada 400/401/403/409
    consume un evento de error de Sentry.
14. **Validar el budget de bundle desde Vitest contra `dist/`** —
    descartada: en `validate:ci` los tests corren **antes** del build (y en
    CI `dist/` no existe). El test valida la lógica con fixtures y el gate
    real se encadena tras `npm run build`.
15. **Medir en Lighthouse las rutas protegidas sin sesión** — descartada:
    `ProtectedRoute` redirige al login y Lighthouse mediría la redirección,
    no la vista. Se siembra la sesión desde `sessionStorage`.
16. **Fijar el budget de bundle como un límite duro de KB en el config de
    Vite** — descartada: Vite no tiene budget de bundle nativo; hace falta un
    verificador, y su política (monótona) debe ser explícita, no implícita.

## Consecuencias

Positivas:

- **La memoización manual se reduce con criterio**: el compilador cubre los
  componentes compatibles y las excepciones con bail-out o intención explícita
  quedan auditables.
- **El número de renders deja de ser una incógnita**: hay un script
  reproducible que lo mide y un baseline documentado (AC3).
- **Los componentes reutilizables responden al ancho de su contenedor**. Las
  vistas con densidades y geometrías distintas conservan implementaciones
  separadas y razones documentadas.
- **Una regresión de rendimiento en producción es detectable**: CWV con
  contexto de ruta y rol, sin duplicar las transacciones que Sentry ya mide.
- **Los 105 mensajes quedan centralizados en el logger** y llegan a Sentry
  cuando el DSN está configurado; los errores 4xx de negocio no consumen cuota
  de error.
- El bundle deja de crecer sin control: hay un presupuesto ejecutable.

Negativas / costos aceptados:

- **React Compiler aumenta el tamaño del código generado** (es su
  naturaleza). El budget de AC8 lo acota; si no aguanta, la mitigación es
  aplicar el compilador por chunk en lugar de globalmente.
- **Activar el compilador puede exponer bugs** de memoización manual
  incorrecta que hoy están ocultos. Se mitiga con la medición de renders, la
  suite e2e y la migración por lotes.
- **Activar el compilador en dev/test ralentiza el ciclo local** y el
  compilador se ejecuta en cada transformación. Es el precio de no tener dos
  códigos distintos.
- **`eslint-plugin-react-hooks` puede señalar deuda existente** (dependencias
  incorrectas, componentes no compilables) en el momento de activarlo: el
  budget de lint sigue en 0/0, así que esa deuda se resuelve o se documenta
  antes de continuar.
- **Unificar un par virtualizado exige medición real** (`measureElement` +
  `ResizeObserver`) o dos geometrías explícitas: es más trabajo que una
  container query por sí sola.
- **El gate de Lighthouse necesita sembrar sesión**, lo que implica un
  `puppeteerScript` y credenciales de e2e en el entorno de CI: coste
  operativo de un job nightly.
- `web-vitals` es una dependencia **runtime** (~1-2 kB) y añade inicialización
  diferida: hay que garantizar que no retrasa el primer paint.
- Convertir `logger` en un sink real **cambia el volumen de eventos** de
  Sentry. Se mitiga con breadcrumbs para `warn` (sin coste de cuota) y
  reservando `captureException` para `error` **con filtro de estado HTTP**.
- Los budgets de bundle y de Lighthouse **bloquean PRs legítimos** que
  aumentan el bundle de forma justificada. El proceso de ajuste está documentado
  (justificación + `--update` con motivo), pero es fricción real.
- El modo `data-ui-perf="high"` y `prefers-reduced-motion` son
  **invariantes** y esta spec no los toca: es un límite deliberado.

## Implementación verificada

| Decisión                                                           | Evidencia actual                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Compiler y lint de hooks activos                             | `frontend/vite.config.ts:87-90`; `frontend/eslint.config.js:157-162`                                                                                                                                                                                                                                                                                       |
| Auditoría de memoización y excepciones                             | `specs/037-frontend-rendering-observability/evidencia/memoization-audit.md:1-44`                                                                                                                                                                                                                                                                           |
| Render counts en cinco rutas sin aumento                           | `frontend/src/App.tsx:170-172,185-187,233-235,323-325,353-355`; `specs/037-frontend-rendering-observability/evidencia/render-after.json`                                                                                                                                                                                                                   |
| Container queries y prueba con motor de layout real                | `frontend/src/components/ui/Card.tsx:29-32`; `frontend/src/components/ui/MetricCard.tsx:92`; `frontend/src/components/ui/EmptyState.tsx:25-28`; `frontend/src/components/ui/DataTable.tsx:59`; `frontend/src/components/ui/ReportTable.tsx:525-538`; `frontend/src/components/ui/PaginationControls.tsx:32`; `frontend/e2e/container-queries.spec.ts:3-40` |
| Geometrías móviles virtualizadas conservadas con justificación     | `specs/037-frontend-rendering-observability/evidencia/responsive-exceptions.md:1-25`                                                                                                                                                                                                                                                                       |
| CWV con contexto y carga diferida; logger con sink Sentry cacheado | `frontend/src/main.tsx:7,11`; `frontend/src/utils/webVitals.ts:116-129`; `frontend/src/utils/logger.ts:29-34,56-88`                                                                                                                                                                                                                                        |
| Bundle budget posterior al build y LHCI autenticado en CI          | `frontend/performance-budget.json:6-10`; `frontend/package.json:42-43`; `frontend/.lighthouserc.json:3-35`; `frontend/scripts/lhci-puppeteer.cjs`; `.github/workflows/ci.yml:330-345`                                                                                                                                                                      |
| Validación de staging aislado                                      | `specs/037-frontend-rendering-observability/evidencia/e2e-results.md:1-31`; `specs/037-frontend-rendering-observability/evidencia/lighthouse-results.md:1-21`                                                                                                                                                                                              |

## Referencias

- `frontend/src/utils/sentry.ts` y `frontend/src/utils/sentryMiddlewares.ts` —
  inicialización, tracing y filtros existentes que complementa esta ADR.
- `frontend/src/contexts/AppProviders.tsx:28` (`HashRouter`) y
  `frontend/src/router/ProtectedRoute.tsx:21-23` — rutas protegidas medidas
  por Lighthouse con sesión sembrada.
- `frontend/src/index.css:679,689` — reglas de `prefers-reduced-motion` y
  `data-ui-perf="high"` preservadas durante el cambio.
- `frontend/design-system-budget.json` y `frontend/lint-budget.json` — patrón
  de budgets monótonos que se aplica al bundle.
- [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md) — la
  reescritura de `ReportTable`/`PaginationControls` que esta spec consume.
- [spec 037](file:///specs/037-frontend-rendering-observability/spec.md) —
  implementación, AC y plan.
- [ADR-0009](0009-observabilidad-minima.md) — la observabilidad mínima que
  esta spec extiende al plano de la UI.
- [ADR-0020](0020-design-system-governance.md) — el modo de alto rendimiento
  que esta spec no modifica.
