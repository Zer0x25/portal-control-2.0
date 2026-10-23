# Spec 037: Frontend Rendering & Observability

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-21
- ADR relacionado: [0026-frontend-rendering-observability.md](file:///docs/adr/0026-frontend-rendering-observability.md)
- Specs hermanos: [033-frontend-layering-hardening](file:///specs/033-frontend-layering-hardening/spec.md) (frontera de capas), [035-frontend-testing-stack](file:///specs/035-frontend-testing-stack/spec.md) (stack de pruebas), [036-frontend-form-table-primitives](file:///specs/036-frontend-form-table-primitives/spec.md) (formularios y tablas), [038-design-system-catalog-pipeline](file:///specs/038-design-system-catalog-pipeline/spec.md) (catálogo y tokens)

## Problema

El frontend ya optimizó **mucho** (code splitting, virtualización, tokens de
performance, PWA, precache de 183 entradas) pero su **estrategia de render es
manual y su observabilidad es parcial**. El repo tiene un
`.agents/rules/frontend-performance.md` con 5 invariantes muy buenas, y ninguna
de las tres primeras es verificable por herramienta.

1. **La memoización es manual, no auditada y sin linter.** Hay **336 llamadas
   reales** a `useMemo`/`useCallback` en `frontend/src/` (**182** `useMemo(` +
   **154** `useCallback(`; el 360 que se citaba antes es el número de _líneas_
   que mencionan el identificador, incluidos imports y comentarios) y **36**
   llamadas a `memo()` (**32** `React.memo(` + **4** `memo(` importado sin
   prefijo: `ReportTable.tsx:549`, `ReportTableMobileSummaryCard.tsx:69`,
   `ReportTableMobileDailyCard.tsx:106`, `ShiftCalendarDayCell.tsx:177`).
   React 19.3 está en el stack, pero **React Compiler no está**:
   `frontend/vite.config.ts:84` llama `react()` sin opciones y no hay
   `babel-plugin-react-compiler` ni `oxc-transform-react` en
   `frontend/package.json` (solo `@babel/plugin-transform-runtime`). Y hay
   **tres** problemas que impiden activarlo tal cual:
   - **La vía de integración propuesta hasta ahora no existe en el plugin
     instalado.** `@vitejs/plugin-react` está en **6.1.2** (Vite 8 /
     Rolldown) y su tipo `Options` **no declara ninguna opción `babel`**: solo
     `compiler?: boolean | ReactCompilerPluginOptions` —que exige
     `oxc-transform-react` instalado— y el export `reactCompilerPreset()` para
     `@rolldown/plugin-babel`. Pasar `babel: { plugins: [...] }` rompe
     `npm run check` (tsc) y, en runtime, se ignora en silencio.
   - **No hay linter de hooks.** `eslint-plugin-react-hooks` no está en
     `devDependencies` y `frontend/eslint.config.js` no registra ningún plugin
     de hooks. Sin él no se detectan ni las dependencias incorrectas
     (`react-hooks/exhaustive-deps`) ni los **bail-outs** del compilador
     (`react-hooks/unsupported-syntax`, `react-hooks/incompatible-library`,
     `react-hooks/preserve-manual-memoization`), que el propio plugin trae en
     su versión 7 (`eslint-plugin-react-hooks@7.1.1` admite `eslint ^10`, la
     versión del repo: `eslint@10.12.0`).
   - **Divergencia dev/prod.** Activar el compilador solo en el build deja
     `npm run dev` y **toda** la suite de Vitest ejecutando código sin
     compilar: cualquier diferencia de comportamiento aparece recién en el
     build final.

   Consecuencia: cada `useMemo` es una **declaración manual de dependencias**
   que puede estar mal y que nadie audita; los 36 `memo()` pueden ser
   innecesarios o insuficientes; y si se borra memoización manual de un
   componente que el compilador **saltó**, se pierde la única memoización que
   quedaba. El riesgo es máximo en los **12** `useVirtualizer` de
   `@tanstack/react-virtual`, cuyo `estimateSize` es una función que se
   reevalúa en cada render.

2. **El layout responsive responde al viewport, no al contenedor.** Hay
   **0 usos de container queries** (`@container`) en todo `frontend/src`. La
   estrategia actual es `useMediaQuery` (**12** consumidores en producción) +
   `useScreenSize` (1 consumidor) + `ResponsiveView` + `window.innerWidth`
   inline (`features/employee-management/hooks/useEmployeeManagementData.ts:64,108`,
   `hooks/useScreenSize.ts:10,17`, `hooks/layout/useSidebarController.ts:31,39,55,62,69`).
   Consecuencia: un componente reusable (p. ej. `ReportTable`, `MetricCard`)
   **no sabe cuánto espacio tiene**, solo cuánto ancho tiene la ventana. Es la
   causa raíz de los patrones "desktop vs mobile" duplicados a mano: **6 pares
   de ficheros** (`AssignmentList{Desktop,Mobile}`, `LeaveList{Desktop,Mobile}`,
   `PatternList{Desktop,Mobile}`, `HolidayList{Desktop,Mobile}`,
   `TimeRecordTableView{Desktop,Mobile}` + `TimeRecordMobileCard`,
   `ReportTableMobile{Daily,Summary}Card`) y **1 bifurcación interna**
   (`AuditLogsView.tsx:35-36,245`, con `ROW_HEIGHT_DESKTOP` y
   `ROW_HEIGHT_MOBILE`).
   Y la solución tiene **tres trampas** que el plan anterior no recogía:
   - **`Badge` no puede ser el contenedor.** `Badge.tsx:20,48` es un
     `<span className="inline-flex ...">` de ancho intrínseco. En CSS
     Containment, `container-type: inline-size` aplica contención de tamaño en
     el eje inline: el contenido deja de contribuir al ancho intrínseco del
     elemento y el badge **colapsa a 0 px**. `container-type` solo puede
     declararse en contenedores de bloque/celda (`Card`, `MetricCard`, el
     wrapper de tabla, los wrappers de panel).
   - **Una container query no cambia `estimateSize`.** Las dos geometrías de
     cada par están **en JS**: `AssignmentListDesktop.tsx:40` usa
     `LIST_ROW_HEIGHT = 65` (`listTokens.ts:11`) mientras
     `AssignmentListMobile.tsx:31` usa `ROW_HEIGHT = 160`; también
     `LeaveListMobile.tsx:34` (160), `HolidayListMobile.tsx:33` (110),
     `PatternListMobile.tsx:33` (120) y
     `TimeRecordTableViewDesktop.tsx:50` (66) frente a
     `TimeRecordTableViewMobile.tsx:38` (280). Unificar el par en un solo
     componente **sin** `measureElement`/`ResizeObserver` sobre el contenedor
     deja `estimateSize` con la geometría equivocada y **superpone las filas
     virtualizadas**.
   - **JSDOM no evalúa layout.** `vite.config.ts:232` fija
     `environment: "jsdom"`: no hay motor de layout ni evaluación de
     `@container`, así que la adaptación real al ancho del contenedor **no se
     puede verificar en Vitest/JSDOM**.

3. **La observabilidad de UI es parcial — y se solapa con lo que ya existe.**
   Sentry está integrado (`@sentry/browser` 11.1, `@sentry/react` 11.4,
   `src/utils/sentry.ts` 44 líneas) y **ya** activa
   `Sentry.browserTracingIntegration()` (`sentry.ts:34`), que instrumenta y
   reporta **LCP, CLS, INP, FCP y TTFB** en las transacciones muestreadas
   (`tracesSampleRate` 0.1 en producción). Los errores de TanStack Query
   llegan como **breadcrumbs** (`src/lib/queryClient.ts:26,37` →
   `src/utils/sentryMiddlewares.ts`), que filtra 401/403
   (`sentryMiddlewares.ts:65`), y el estado de Zustand también se registra
   como breadcrumb (`sentryMiddlewares.ts:34-53`). No hay `web-vitals`: no se
   mide CWV **con el contexto de rol y ruta** que el panel no tiene. Y un
   `web-vitals` que reporte las 5 métricas como transacciones **duplicaría**
   lo que `browserTracingIntegration` ya instrumenta y quemaría cuota.
   Consecuencia: una regresión de rendimiento (una tabla que empieza a
   renderizar 500 filas, un chunk que crece 200 kB) **no es detectable** hasta
   que un usuario se queja.

4. **El logger es un no-op.** `src/utils/logger.ts` es un passthrough puro a
   `console`, con un docstring que promete _"one place to later forward
   messages to Sentry"_ — y ese forwarding **no existe**. Solo 5 ficheros de producción lo
   usan (más 2 de test), y hay **105 llamadas** crudas a `console.warn`/`console.error` en
   `src/` (**todas** en código de producción: el único hit en `src/tests/` es
   el _título_ de un test, no una llamada), permitidas por la regla
   `no-console` de `frontend/eslint.config.js:39` (`allow: ["warn", "error"]`).
   Reparto: `services/` 24, `features/` 24, `utils/` 22, `store/` 19,
   `hooks/` 9, `workers/` 3, `components/` 2, `lib/` 1, `App.tsx` 1.
   En producción, esos 105 mensajes **no llegan a ningún sitio**: desaparecen
   en la consola del navegador.
   Y el sink tiene **tres trampas**:
   - **Ciclo de importación.** `sentry.ts:1` importa `logger`; si `logger`
     importa Sentry de forma estática, el ciclo es directo. La salida es
     importar Sentry **de forma diferida y cacheada**, como ya hace
     `sentryMiddlewares.ts:5-11`.
   - **`sentry.ts:25` usa `console.warn`** (cuando falta el DSN): con
     `no-console` en `allow: []` ese call queda fuera de contrato; debe pasar
     por el logger.
   - **Volumen de cuota.** Muchas de esas 105 llamadas están en `catch` de
     servicios y mutaciones cuyos errores **ya** pasan por `queryClient.ts` o
     son 4xx de negocio (400/401/403/409) que la UI maneja. Si
     `logger.error` → `captureException` sin filtro, cada 4xx manejado
     consume un evento de error.

5. **No hay presupuesto de performance en CI.** El bundle actual es sano
   (`react-core` 218.69 kB / 68.21 kB gzip, `charts` 145.61 kB / 51.05 kB gzip,
   `vendor` 164.26 kB / 47.65 kB gzip, precache de 183 entradas / 1643.43 KiB (~1.61 MiB), pero **nada impide
   que mañana sea 400 kB**. No hay Lighthouse CI, ni budget de bundle por
   chunk, ni alerta de regresión de Core Web Vitals. Y el gate que se quiere
   añadir tiene **dos trampas**:
   - **El orden de `validate:ci`.** `frontend/package.json` encadena
     `test:run:ci` **antes** de `build`: un test de Vitest que inspeccione
     `dist/` fallaría en CI (donde `dist/` no existe todavía) o validaría un
     build obsoleto en local. En CI el job usa `validate:ci:coverage`
     (`.github/workflows/ci.yml:300-302`), que tiene el mismo orden
     (`test:coverage` → `build`).
   - **HashRouter + Auth Guard.** La app usa `HashRouter`
     (`src/contexts/AppProviders.tsx:28`), así que las URLs son `/#/ruta`
     (p. ej. `e2e/performance.spec.ts:24` navega a
     `/#/admin/governance?tab=audit`), y **toda** ruta salvo login y kiosk
     exige sesión (`src/router/ProtectedRoute.tsx:21-23`): sin una sesión
     previa, Lighthouse mediría la redirección al login, no la vista.

## Alcance

Dentro:

- **A. React Compiler**: activar el compilador por una vía **compatible con
  `@vitejs/plugin-react@6`** (`oxc-transform-react` + `react({ compiler: true })`,
  o `@rolldown/plugin-babel` + `reactCompilerPreset()`), **activo también en
  dev y en test**, instalar `eslint-plugin-react-hooks` como guardrail previo,
  y **eliminar la memoización manual** que el compilador ya cubre
  (`useMemo`/`useCallback`/`memo` redundantes), empezando por las 336
  llamadas y los 36 `memo`, con medición de bundle y de renders
  antes/después.
- **B. Container queries**: migrar los patrones responsivos de **viewport** a
  **contenedor** (`@container` + `@sm:`/`@lg:` de Tailwind v4) en las
  primitivas reutilizables, lo que habilita **eliminar los pares
  desktop/mobile duplicados** por componentes adaptables, **respetando la
  geometría real de cada lista virtualizada**.
- **C. Observabilidad de performance en campo**: `web-vitals` (LCP, INP, CLS,
  FCP, TTFB) **enriquecen** lo que ya instrumenta
  `browserTracingIntegration`, sin duplicar transacciones.
- **D. Logger real**: `src/utils/logger.ts` forwardea a Sentry
  (`error` → excepción filtrada, `warn` → breadcrumb), con modo desarrollo;
  las 105 llamadas crudas migran al logger; `no-console` pasa a `allow: []`.
- **E. Presupuesto de performance en CI**: límites de bundle por chunk (con
  margen sobre el estado actual), verificados **después** del build, y un gate
  de Lighthouse CI sobre las rutas críticas **con sesión sembrada**.

Fuera (explícito):

- **Server-side rendering / SSR**: la app es una SPA con precache PWA; esta
  spec no introduce SSR ni streaming.
- **Reescritura de la estrategia de datos**: `web-vitals` mide, no decide.
- **El modo `data-ui-perf="high"`** (`src/index.css:689`) **se mantiene** tal
  cual: ya existe y es una degradación deliberada de efectos caros
  (`backdrop-filter`, `filter`, sombras) para equipos con máquinas lentas.
- **Auditoría de accesibilidad**: es de la spec 031 y 033.
- **Service Worker / estrategia de precache**: no cambia.
- **La reescritura de `ReportTable` y `PaginationControls`**: es de la
  [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md)
  (Fase D, T14-T17). Esta spec solo aplica container queries **sobre** las
  primitivas resultantes.
- Specs hermanas: la limpieza de la memoización **depende** de la frontera de
  capas de la
  [spec 033](file:///specs/033-frontend-layering-hardening/spec.md) (el
  compilador rinde mucho más sobre componentes con responsabilidades claras);
  el mocking para poder medir renders es de la
  [spec 035](file:///specs/035-frontend-testing-stack/spec.md).

## Criterios de aceptación

- [x] AC1: **React Compiler activo en dev, test y build, por una vía
      compatible con `@vitejs/plugin-react@6`**. Se instala
      `oxc-transform-react` y se activa `react({ compiler: true })` (o, en su
      defecto, `@rolldown/plugin-babel` + `reactCompilerPreset()` +
      `babel-plugin-react-compiler`); **no** se usa la opción `babel`, que el
      tipo `Options` de `@vitejs/plugin-react@6.1.2` ya no declara. El
      compilador está activo en `npm run dev`, en `npm run test:*` y en
      `npm run build` (no solo en producción), con los diagnósticos del
      compilador visibles en el log del build. `npm run check` y
      `npm run validate:ci` quedan en verde. Se documenta en el README del
      frontend que el compilador sustituye la memoización manual.
- [x] AC2: **Memoización manual reducida con criterio y con linter**. Se
      instala `eslint-plugin-react-hooks` (v7, compatible con `eslint@10`) y
      sus reglas de compilador quedan activas (`react-hooks/exhaustive-deps`,
      `react-hooks/unsupported-syntax`, `react-hooks/incompatible-library`,
      `react-hooks/preserve-manual-memoization`) **antes** de tocar ninguna
      memoización. Las **336** llamadas a `useMemo`/`useCallback` y los **36**
      `memo()` se auditan uno a uno y se **eliminan los redundantes** (el
      compilador los cubre); los que expresan una intención real (p. ej. una
      referencia que evita re-suscribir una suscripción, o un `useMemo` en un
      hot path medido) se **conservan con un comentario que justifique por
      qué**. **No se elimina memoización de un componente que el compilador
      saltó** (bail-out detectado por lint o por los diagnósticos del build):
      ese caso se documenta como excepción. El recuento final está
      documentado con el antes/después.
- [x] AC3: **Sin regresión de renders**. El número de renders por interacción
      en las 5 vistas críticas (dashboard, planificador, worker-portal,
      logbook, kiosk) **no aumenta** respecto al baseline medido antes de
      AC2; la medición es reproducible (script documentado) y su resultado
      está en la evidencia de cierre.
- [x] AC4: **Container queries en las primitivas de bloque**. Las primitivas
      reutilizables de `components/ui/` que son **contenedores de bloque**
      (`MetricCard`, `Card`, `EmptyState`, `ReportTable` y el wrapper de
      `PaginationControls`) declaran `container-type: inline-size` y **adaptan
      su layout al ancho disponible**, no al viewport; `@container` se usa en
      `frontend/src` (el recuento actual de 0 sube). **`Badge` queda fuera**:
      es una primitiva inline de ancho intrínseco (`Badge.tsx:20,48`) y
      `container-type: inline-size` la colapsaría a 0 px; ninguna primitiva
      inline puede declarar el contenedor. El modo `data-ui-perf="high"` y
      `prefers-reduced-motion` siguen funcionando.
- [x] AC5: **Los pares desktop/mobile se eliminan o se justifican, con la
      geometría de virtualización correcta**. `AssignmentList{Desktop,Mobile}`,
      `LeaveList{Desktop,Mobile}`, `PatternList{Desktop,Mobile}`,
      `HolidayList{Desktop,Mobile}`, `TimeRecordTableView{Desktop,Mobile}` +
      `TimeRecordMobileCard`, `ReportTableMobile{Daily,Summary}Card` y la
      bifurcación interna de `AuditLogsView` se unifican en componentes
      adaptables por container query, **o** cada par restante tiene un
      comentario que documente por qué la duplicación es necesaria (p. ej.
      porque la densidad de información del móvil es radicalmente distinta y
      no una simple diferencia de ancho). Cuando el par incluye una lista
      virtualizada, la unificación **exige** que `estimateSize` siga la
      geometría real (mediante `measureElement`/`ResizeObserver` sobre el
      contenedor, o conservando dos virtualizadores con geometrías distintas
      que comparten subcomponentes): **no** se puede unificar dejando un
      `estimateSize` fijo, porque las filas se superponen. El recuento final
      está documentado.
- [x] AC6: **Core Web Vitals en campo, sin duplicar transacciones**.
      `web-vitals` reporta LCP, INP, CLS, FCP y TTFB a Sentry **enriqueciendo**
      el contexto (ruta, rol, dispositivo, conexión) y **solo** emite evento
      o breadcrumb cuando una métrica **supera un umbral degradado**: la
      transacción de `browserTracingIntegration` (ya activa en
      `src/utils/sentry.ts:34`) sigue siendo la fuente canónica de CWV y no
      se duplica. Los valores se pueden consultar en el panel de Sentry; el
      coste en bundle está medido y documentado. La inicialización es **lazy**
      (no bloquea el primer paint) y **respeta `prefers-reduced-motion` /
      `data-ui-perf`** en lo que aplique.
- [x] AC7: **El logger es un sink real, filtrado y sin ciclos**. `src/utils/logger.ts`
      forwardea a Sentry: `error` → `captureException` **con filtro de estado
      HTTP** (los 4xx de negocio que la UI ya maneja —400/401/403/409— **no**
      generan evento de error; se registran como breadcrumb, como ya hace
      `sentryMiddlewares.ts:65`), `warn` → breadcrumb (sin coste de cuota),
      `info`/`debug` → breadcrumb; mantiene el output de consola solo en
      desarrollo. El acceso a Sentry es **diferido y cacheado** (patrón de
      `sentryMiddlewares.ts:5-11`), de modo que **no** hay ciclo de
      importación con `src/utils/sentry.ts:1`, y el forwarding está
      **desactivado cuando `import.meta.env.MODE === "test"`**. Las **105**
      llamadas crudas de `console.warn`/`console.error` en `frontend/src/`
      migran al logger, y `no-console` en `frontend/eslint.config.js:39` pasa
      a `allow: []` con excepción únicamente para `src/utils/logger.ts`. El
      budget de lint sigue en **0/0**.
- [x] AC8: **Presupuesto de performance en CI, en el orden correcto**. Existe
      un gate que falla si un chunk del bundle supera su presupuesto (con
      margen sobre el estado actual: `react-core` ≤ 260 kB, `charts` ≤ 180 kB,
      precache ≤ 2 MiB) **verificado sobre `dist/` después de
      `npm run build`** (nunca dentro de la fase de tests, que en
      `validate:ci` corre antes del build), y un gate de Lighthouse CI sobre
      las rutas críticas con umbrales de Core Web Vitals; ambos se ejecutan en
      el pipeline. El gate de Lighthouse **siembra sesión** antes de medir (la
      app usa `HashRouter` y `ProtectedRoute`).
- [x] AC9: **Sin regresión funcional**. `npm run validate:ci` (desde `frontend/`),
      `npm --prefix frontend run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` en verde y la suite Playwright contra staging aislado en verde, incluidos `e2e/performance.spec.ts` y `e2e/a11y.spec.ts`.

## Restricciones

- Constitución (I–V): en particular IV ("calidad con ratchet") — el budget de
  bundle y los gates de Lighthouse son umbrales que **solo pueden endurecer**
  (el bundle **no puede crecer** por encima del presupuesto).
- **React Compiler no cambia la API de los componentes**: la migración es
  interna. Ningún `useMemo` se elimina si su ausencia cambia el
  comportamiento observable (medido con AC3).
- **El bundle no puede crecer**: si activar el compilador o añadir
  `web-vitals` aumenta el bundle por encima del presupuesto de AC8, la
  feature se ajusta (carga diferida, muestreo) en lugar de subir el
  presupuesto.
- **La integración del compilador debe ser una vía soportada por
  `@vitejs/plugin-react@6`**: la opción `babel` ya no existe en su tipo
  `Options`; el compilador **no** puede activarse solo en build (dev y test
  deben ejecutar el mismo código que producción).
- **`eslint-plugin-react-hooks` es requisito previo** a eliminar memoización
  manual: sin linter no hay forma de distinguir "redundante" de "bail-out".
- **`container-type: inline-size` solo en contenedores de bloque/celda**:
  nunca en primitivas inline de ancho intrínseco (`Badge`). Un contenedor
  inline colapsa su contenido a 0 px.
- **Una container query no sustituye a la geometría de virtualización**:
  `estimateSize` sigue siendo JS. Sin `measureElement`/`ResizeObserver` o sin
  dos geometrías explícitas, las filas se superponen.
- **Las aserciones que dependen de layout no se verifican en JSDOM**:
  `vite.config.ts:232` usa `environment: "jsdom"`, sin motor de layout. Las
  verificaciones de adaptación al contenedor van a Playwright (o al Browser
  Mode de la spec 035).
- **`web-vitals` no duplica transacciones**: `browserTracingIntegration`
  (`src/utils/sentry.ts:34`) ya instrumenta CWV; `web-vitals` añade contexto
  y umbrales.
- **`logger` no introduce un ciclo con `sentry`**: el acceso a Sentry es
  diferido y cacheado, y en `MODE === "test"` no se reporta nada.
- **El logger no convierte 4xx de negocio en eventos de error**: el filtro de
  estado HTTP es requisito, no opcional (cuota de Sentry).
- **El gate de bundle se ejecuta contra `dist/` después del build**: la fase
  de tests de `validate:ci` corre antes del build y no puede depender de
  `dist/`.
- **Las URLs de Lighthouse son con hash** (`/#/ruta`) porque la app usa
  `HashRouter`, y las rutas protegidas exigen sesión sembrada.
- `web-vitals` es una dependencia **runtime**; su inicialización no puede
  bloquear el primer paint (debe ser `requestIdleCallback` o equivalente).
- El modo `data-ui-perf="high"` y `prefers-reduced-motion` son
  **invariantes** (`.agents/rules/design-system-governance.md` §4 y
  `frontend-performance.md` §2): no se tocan.
- Los `data-testid` no se renombran; los e2e dependen de ellos.
- Rollback por fase: cada workstream (A–E) es un PR independiente.

## Trazabilidad

- **Dependencias con otras specs**:
  - [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md) —
    **Fase D (T14-T17) es prerrequisito** de la Fase C de esta spec para
    `ReportTable`, `SortableHeader` y `PaginationControls`: la container query
    se aplica sobre la primitiva `DataTable` que 036 crea, no sobre el
    `ReportTable` actual.
  - [spec 033](file:///specs/033-frontend-layering-hardening/spec.md) — la
    limpieza de memoización se hace después de su Fase A.
  - [spec 035](file:///specs/035-frontend-testing-stack/spec.md) — el Browser
    Mode es la alternativa a Playwright para las aserciones de layout.
- **Tests que lo probarán**:
  - `frontend/scripts/measure-renders.mjs` (nuevo: medición reproducible de
    renders por interacción, AC3)
  - `frontend/src/tests/performance/bundle-budget.test.ts` (nuevo: valida la
    **lógica monótona** del verificador con fixtures, sin tocar `dist/`,
    AC8)
  - `frontend/e2e/container-queries.spec.ts` (nuevo: verifica la adaptación
    al **ancho del contenedor** con motor de layout real, AC4/AC5)
  - `frontend/e2e/performance.spec.ts` (extendido con las rutas críticas,
    AC9)
  - `frontend/src/tests/setup.ts` (extendido con el mock de Sentry y el
    forwarding desactivado en `MODE === "test"`, AC7)
- **Docs a actualizar**:
  - `frontend/README.md` (o el docblock de `vite.config.ts`): React Compiler
    activo (en dev, test y build) y qué significa para la memoización
  - `.agents/rules/frontend-performance.md` (invariantes 1 y 2 actualizadas:
    la memoización manual es opcional bajo el compilador; las container
    queries sustituyen a los breakpoints de viewport en componentes
    reutilizables)
  - `docs/adr/0026-frontend-rendering-observability.md`
  - `docs/adr/README.md` (índice)
