# ADR-0026: Frontend Rendering & Observability — Compilador, container queries y métricas en campo

- Estado: Propuesto
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

El repo invirtió mucho en rendimiento (code splitting con chunks por
dominio, virtualización con `@tanstack/react-virtual`, precache PWA de 179
entradas / 1.52 MiB, `react-core` de 218 kB / 68 kB gzip, `charts` de 145 kB
aislado) y fijó invariantes claras en
`.agents/rules/frontend-performance.md`. Pero **dos de esas invariantes no son
verificables** y la observabilidad de UI es parcial:

1. **La memoización es manual y no auditada.** Hay **266 llamadas** a
   `useMemo`/`useCallback` (**160** `useMemo(` + **106** `useCallback(`) y
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
   - con 266 optimizaciones manuales, cada re-render es difícil de razonar.

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
   - El compilador **sustituye la memoización manual**: se auditan las 266
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
   su coste es invisible. 266 declaraciones de dependencias sin auditor,
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
9. **Reescribir `ReportTable` y `PaginationControls` en esta spec** —
   descartada: es el trabajo de la
   [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md)
   (Fase D). Aquí solo se aplican container queries **sobre** las primitivas
   que 036 crea, para no tocar los mismos ficheros en el mismo PR.
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

- **La memoización deja de ser una responsabilidad humana**: el compilador
  la garantiza. El código queda más corto y más legible.
- **El número de renders deja de ser una incógnita**: hay un script
  reproducible que lo mide y un baseline documentado (AC3).
- **Los componentes reutilizables funcionan en cualquier ancho**, lo que
  elimina la duplicación desktop/mobile y hace el design system realmente
  reutilizable (p. ej. el mismo `ReportTable` en una página y en un panel).
- **Una regresión de rendimiento en producción es detectable**: CWV con
  contexto de ruta y rol, sin duplicar las transacciones que Sentry ya mide.
- **Los 105 mensajes que hoy se pierden en producción** llegan a Sentry, y
  los errores de 4xx de negocio no consumes cuota de error.
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

## Referencias

- `frontend/src/utils/logger.ts` — el passthrough que se convierte en sink.
- `frontend/src/utils/sentry.ts:9` — `initSentry`, la inicialización que se
  **extiende** (no se cambia); `:34` — `browserTracingIntegration`, la fuente
  canónica de CWV; `:25` — el `console.warn` que pasa por el logger.
- `frontend/src/utils/sentryMiddlewares.ts` — middlewares existentes: `:5-11`
  el patrón de import diferido y cacheado que se replica en el logger; `:65`
  el filtro 401/403 que se extiende al estado HTTP.
- `frontend/src/lib/queryClient.ts:26,37` — los errores de TanStack Query
  que hoy llegan a Sentry.
- `frontend/eslint.config.js:39` — `no-console` con `allow: ["warn","error"]`
  que pasa a `allow: []`.
- `frontend/vite.config.ts:84` — `react()` sin opciones (donde entra el
  compilador); `:232` — `environment: "jsdom"` (por qué la verificación de
  layout va a Playwright).
- `frontend/package.json` — `validate:ci` / `validate:ci:coverage` con los
  tests **antes** del build.
- `.github/workflows/ci.yml:300-302` — el job de frontend que hay que
  enmendar para los gates de budget y Lighthouse.
- `frontend/src/index.css:679` (`prefers-reduced-motion`) y `:689`
  (`data-ui-perf="high"`) — invariantes que no se tocan.
- `frontend/src/hooks/useMediaQuery.ts` (12 consumidores en producción) y
  `frontend/src/hooks/useScreenSize.ts` (1) — la estrategia de viewport que
  se conserva **para el shell**.
- `frontend/src/features/employee-management/hooks/useEmployeeManagementData.ts:64,108`
  — el `window.innerWidth` inline que se elimina.
- `frontend/src/features/theoretical-shifts/components/{AssignmentList,LeaveList,PatternList,HolidayList}{Desktop,Mobile}.tsx`
  y `frontend/src/features/time-control/components/TimeRecordTableView{Desktop,Mobile}.tsx`
  — los pares desktop/mobile que se unifican, con sus geometrías.
- `frontend/src/components/ui/Badge.tsx:20,48` — la primitiva inline que **no**
  puede declarar `container-type`.
- `frontend/src/contexts/AppProviders.tsx:28` (`HashRouter`) y
  `frontend/src/router/ProtectedRoute.tsx:21-23` — por qué las URLs de
  Lighthouse llevan hash y necesitan sesión.
- `frontend/src/services/authService.ts:33,120-128` y
  `frontend/src/store/slices/authSlice.ts:62-89` — de dónde se restaura la
  sesión (`sessionStorage`) para el `puppeteerScript` de Lighthouse.
- `frontend/e2e/helpers/auth-helper.ts:89-95` — el mecanismo de siembra de
  sesión ya probado en los e2e.
- `frontend/design-system-budget.json` y `frontend/lint-budget.json` — el
  patrón de budget monótono que se replica para el bundle.
- [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md) — la
  reescritura de `ReportTable`/`PaginationControls` que esta spec consume.
- [spec 037](file:///specs/037-frontend-rendering-observability/spec.md) —
  implementación, AC y plan.
- [ADR-0009](0009-observabilidad-minima.md) — la observabilidad mínima que
  esta spec extiende al plano de la UI.
- [ADR-0020](0020-design-system-governance.md) — el modo de alto rendimiento
  que esta spec no modifica.
