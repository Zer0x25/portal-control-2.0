# Spec 037: Frontend Rendering & Observability

- Estado: Borrador
- Autor: zer0x
- Fecha: 2026-10-21
- ADR relacionado: [0026-frontend-rendering-observability.md](file:///docs/adr/0026-frontend-rendering-observability.md)
- Specs hermanos: [033-frontend-layering-hardening](file:///specs/033-frontend-layering-hardening/spec.md) (frontera de capas), [035-frontend-testing-stack](file:///specs/035-frontend-testing-stack/spec.md) (stack de pruebas), [036-frontend-form-table-primitives](file:///specs/036-frontend-form-table-primitives/spec.md) (formularios y tablas), [038-design-system-catalog-pipeline](file:///specs/038-design-system-catalog-pipeline/spec.md) (catálogo y tokens)

## Problema

El frontend ya optimizó **mucho** (code splitting, virtualización, tokens de
performance, PWA, precache de 179 entradas) pero su **estrategia de render es
manual y su observabilidad es parcial**. El repo tiene un `.agents/rules/frontend-performance.md`
con 5 invariantes muy buenas, y ninguna de las tres primeras es verificable
por herramienta.

1. **La memoización es manual y no verificada.** Hay **360** usos de
   `useMemo`/`useCallback` y **39** de `React.memo` en `frontend/src/`. La
   React 19.3 está en el stack, pero **React Compiler no está**: no hay
   `babel-plugin-react-compiler` en `frontend/package.json` ni en
   `frontend/vite.config.ts` (solo `@babel/plugin-transform-runtime`). Consecuencia:
   - cada `useMemo` es una **declaración manual de dependencias** que puede
     estar mal y que nadie audita (no hay lint rule para dependencias
     incorrectas de hooks);
   - el `React.memo` en 39 sitios puede ser **innecesario** (el compilador
     haría lo mismo) o **insuficiente** (memoizar el componente pero no las
     props que importan);
   - con 360 optimizaciones manuales, cada re-render de la app es una
     **decisión difícil de razonar**.

2. **El layout responsive responde al viewport, no al contenedor.** Hay
   **0 usos de container queries** (`@container`) en todo `frontend/src`. La
   estrategia actual es `useMediaQuery` (15 consumidores) + `useScreenSize` +
   `ResponsiveView` + `window.innerWidth` inline
   (`features/employee-management/hooks/useEmployeeManagementData.ts:64,108-110`).
   Consecuencia: un componente reusable (p. ej. `ReportTable`, `MetricCard`)
   **no sabe cuánto espacio tiene**, solo cuánto ancho tiene la ventana. En un
   panel estrecho dentro de una página ancha, el componente se comporta como
   en desktop. Es la causa raíz de los patrones "desktop vs mobile" duplicados
   (`ReportTableMobileDailyCard` vs tabla, `AssignmentListDesktop` vs
   `AssignmentListMobile`, `LeaveListDesktop` vs `LeaveListMobile`,
   `PatternListDesktop` vs `PatternListMobile`, `HolidayListDesktop` vs
   `HolidayListMobile` — **5 pares desktop/mobile duplicados** a mano).

3. **La observabilidad de UI no existe.** Sentry está integrado
   (`@sentry/browser` 11.1, `@sentry/react` 11.4, `src/utils/sentry.ts` 44
   líneas) pero **solo recibe los errores de TanStack Query**
   (`src/lib/queryClient.ts:26,37`). **No hay `web-vitals`**: no se mide LCP,
   INP ni CLS en campo. El `e2e/performance.spec.ts` mide tiempos
   intra-página en un entorno sintético, no el mundo real.
   Consecuencia: una regresión de rendimiento (una tabla que empieza a
   renderizar 500 filas, un chunk que crece 200 kB) **no es detectable** hasta
   que un usuario se queja.

4. **El logger es un no-op.** `src/utils/logger.ts` es un passthrough puro a
   `console`, con un docstring que promete _"one place to later forward
   messages to Sentry"_ — y ese forwarding **no existe**. Solo 5 ficheros lo
   usan, y hay **103** llamadas crudas a `console.warn`/`console.error` en
   `src/`, permitidas por la regla `no-console` de `frontend/eslint.config.js:39`
   (`allow: ["warn", "error"]`). En producción, esos 103 mensajes **no
   llegan a ningún sitio**: desaparecen en la consola del navegador.

5. **No hay presupuesto de performance en CI.** El bundle actual es sano
   (`react-core` 218 kB / 68 kB gzip, `charts` 145 kB / 51 kB gzip aislado,
   `vendor` 70 kB, precache de 179 entradas / 1.52 MiB), pero **nada impide
   que mañana sea 400 kB**. No hay Lighthouse CI, ni budget de bundle por
   chunk, ni alerta de regresión de Core Web Vitals.

## Alcance

Dentro:

- **A. React Compiler**: activar `babel-plugin-react-compiler` en el build de
  producción y **eliminar la memoización manual** que el compilador ya
  cubre (`useMemo`/`useCallback`/`React.memo` redundantes), empezando por los
  360 usos y los 39 `memo`, con medición de bundle y de renders antes/después.
- **B. Container queries**: migrar los patrones responsivos de
  **viewport** a **contenedor** (`@container` + `@sm:`/`@lg:` de Tailwind v4)
  en las primitivas reutilizables, lo que habilita **eliminar los 5 pares
  desktop/mobile duplicados** por componentes adaptables.
- **C. Observabilidad de performance en campo**: `web-vitals` (LCP, INP, CLS,
  FCP, TTFB) reportados a Sentry con el contexto de ruta y de rol.
- **D. Logger real**: `src/utils/logger.ts` forwardea a Sentry
  (`error` → excepción, `warn` → breadcrumb), con modo desarrollo; las 103
  llamadas crudas migran al logger; `no-console` pasa a `allow: []`.
- **E. Presupuesto de performance en CI**: límites de bundle por chunk (con
  margen sobre el estado actual) y un gate de Lighthouse CI sobre las rutas
  críticas.

Fuera (explícito):

- **Server-side rendering / SSR**: la app es una SPA con precache PWA; esta
  spec no introduce SSR ni streaming.
- **Reescritura de la estrategia de datos**: `web-vitals` mide, no decide.
- **El modo `data-ui-perf="high"`** (`src/index.css:689`) **se mantiene** tal
  cual: ya existe y es una degradación deliberada de efectos caros
  (`backdrop-filter`, `filter`, sombras) para equipos con máquinas lentas.
- **Auditoría de accesibilidad**: es de la spec 031 y 033.
- **Service Worker / estrategia de precache**: no cambia.
- Specs hermanas: la limpieza de la memoización **depende** de la frontera de
  capas de la
  [spec 033](file:///specs/033-frontend-layering-hardening/spec.md) (el
  compilador rinde mucho más sobre componentes con responsabilidades claras);
  el mocking para poder medir renders es de la
  [spec 035](file:///specs/035-frontend-testing-stack/spec.md).

## Criterios de aceptación

- [ ] AC1: **React Compiler activo en producción**.
      `babel-plugin-react-compiler` está en `devDependencies` y se aplica en el
      build de `frontend/vite.config.ts`; `npm run build` genera el código
      compilado y `npm run validate:ci` queda verde. Se documenta en el
      README del frontend que el compilador sustituye la memoización manual.
- [ ] AC2: **Memoización manual reducida con criterio**. Los 360
      `useMemo`/`useCallback` y los 39 `React.memo` se auditan uno a uno y se
      **eliminan los redundantes** (el compilador los cubre); los que
      expresión una intención real (p. ej. una referencia que evita
      re-suscribir una suscripción, o un `useMemo` en un hot path medido)
      se **conservan con un comentario que justifique por qué**. El recuento
      final está documentado con el antes/después. **No se elimina
      memoización sin evidencia de que es redundante.**
- [ ] AC3: **Sin regresión de renders**. El número de renders por interacción
      en las 5 vistas críticas (dashboard, planificador, worker-portal,
      logbook, kiosk) **no aumenta** respecto al baseline medido antes de
      AC2; la medición es reproducible (script documentado) y su resultado
      está en la evidencia de cierre.
- [ ] AC4: **Container queries en las primitivas**. Las primitivas
      reutilizables de `components/ui/` (`MetricCard`, `ReportTable`,
      `EmptyState`, `Badge`, `Card`, `PaginationControls`) declaran
      `container-type: inline-size` y **adaptan su layout al ancho
      disponible**, no al viewport; `@container` se usa en `frontend/src` (el
      recuento actual de 0 sube). El modo `data-ui-perf="high"` y
      `prefers-reduced-motion` siguen funcionando.
- [ ] AC5: **Los 5 pares desktop/mobile se eliminan o se justifican**.
      `AssignmentListDesktop/Mobile`, `LeaveListDesktop/Mobile`,
      `PatternListDesktop/Mobile`, `HolidayListDesktop/Mobile` y
      `ReportTableMobileDailyCard/SummaryCard` se unifican en componentes
      adaptables por container query, **o** cada par restante tiene un
      comentario que documente por qué la duplicación es necesaria (p. ej.
      porque la densidad de información del móvil es radicalmente distinta y
      no una simple diferencia de ancho). El recuento final está documentado.
- [ ] AC6: **Core Web Vitals en campo**. `web-vitals` reporta LCP, INP, CLS,
      FCP y TTFB a Sentry con contexto (ruta, rol, dispositivo, conexión);
      los valores se pueden consultar en el panel de Sentry; el coste en
      bundle está medido y documentado. La inicialización es **lazy** (no
      bloquea el primer paint) y **respeta `prefers-reduced-motion` /
      `data-ui-perf`** en lo que aplique.
- [ ] AC7: **El logger es un sink real**. `src/utils/logger.ts` forwardea a
      Sentry: `error` → `captureException` con contexto, `warn` → breadcrumb
      (sin coste de cuota), `info`/`debug` → breadcrumb; mantiene el output de
      consola solo en desarrollo. Las **103** llamadas crudas de
      `console.warn`/`console.error` en `frontend/src/` migran al logger, y
      `no-console` en `frontend/eslint.config.js:39` pasa a `allow: []` con
      excepción únicamente para `src/utils/logger.ts`. El budget de lint
      sigue en **0/0**.
- [ ] AC8: **Presupuesto de performance en CI**. Existe un gate que falla si
      un chunk del bundle supera su presupuesto (con margen sobre el estado
      actual: `react-core` ≤ 260 kB, `charts` ≤ 180 kB, precache ≤ 2 MiB) y
      un gate de Lighthouse CI sobre las rutas críticas con umbrales de
      Core Web Vitals; ambos se ejecutan en el pipeline.
- [ ] AC9: **Sin regresión funcional**. `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` en verde y `npm run e2e:staging` en verde (56
      tests), incluidos `e2e/performance.spec.ts` y `e2e/a11y.spec.ts`.

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
- `web-vitals` es una dependencia **runtime**; su inicialización no puede
  bloquear el primer paint (debe ser `requestIdleCallback` o equivalente).
- El modo `data-ui-perf="high"` y `prefers-reduced-motion` son
  **invariantes** (`.agents/rules/design-system-governance.md` §4 y
  `frontend-performance.md` §2): no se tocan.
- Los `data-testid` no se renombran; los e2e dependen de ellos.
- Rollback por fase: cada workstream (A–E) es un PR independiente.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/scripts/measure-renders.mjs` (nuevo: medición reproducible de
    renders por interacción, AC3)
  - `frontend/src/tests/performance/bundle-budget.test.ts` (nuevo, AC8)
  - `frontend/src/tests/performance/container-queries.test.ts` (nuevo: las
    primitivas se adaptan al contenedor, AC4)
  - `frontend/e2e/performance.spec.ts` (extendido con las rutasCritical, AC9)
  - `frontend/src/tests/setup.ts` (extendido con el mock de Sentry, AC7)
- **Docs a actualizar**:
  - `frontend/README.md` (o el docblock de `vite.config.ts`): React Compiler
    activo y qué significa para la memoización
  - `.agents/rules/frontend-performance.md` (invariantes 1 y 2 actualizadas:
    la memoización manual es opcional bajo el compilador; las container
    queries sustituyen a los breakpoints de viewport en componentes
    reutilizables)
  - `docs/adr/0026-frontend-rendering-observability.md`
  - `docs/adr/README.md` (índice)
