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

1. **La memoización es manual y no auditada.** Hay **360** usos de
   `useMemo`/`useCallback` y **39** de `React.memo` en `frontend/src/`.
   React 19.3 está en el stack, pero **React Compiler no está**: no hay
   `babel-plugin-react-compiler` en `frontend/package.json` ni en
   `frontend/vite.config.ts` (solo `@babel/plugin-transform-runtime`).
   Consecuencias:
   - cada `useMemo` es una **declaración manual de dependencias** que puede
     estar mal y que **ninguna herramienta audita**;
   - los 39 `React.memo` pueden ser innecesarios (el compilador haría lo
     mismo) o insuficientes (memoizan el componente pero no las props que
     importan);
   - con 360 optimizaciones manuales, cada re-render es difícil de razonar.

2. **El layout responde al viewport, no al contenedor.** Hay **0 usos de
   container queries** (`@container`) en todo `frontend/src`. La estrategia
   es `useMediaQuery` (15 consumidores) + `useScreenSize` +
   `ResponsiveView` + `window.innerWidth` inline
   (`features/employee-management/hooks/useEmployeeManagementData.ts:64,108-110`).
   Consecuencia: un componente reusable **no sabe cuánto espacio tiene**,
   solo cuánto ancho tiene la ventana. De ahí los **5 pares desktop/mobile
   duplicados a mano**: `AssignmentListDesktop/Mobile`,
   `LeaveListDesktop/Mobile`, `PatternListDesktop/Mobile`,
   `HolidayListDesktop/Mobile` y `ReportTableMobileDailyCard/SummaryCard`.

3. **No hay Core Web Vitals en campo.** Sentry está integrado
   (`@sentry/browser` 11.1, `@sentry/react` 11.4,
   `src/utils/sentry.ts` 44 líneas) pero **solo recibe los errores de
   TanStack Query** (`src/lib/queryClient.ts:26,37`). No hay `web-vitals`: no
   se mide LCP, INP ni CLS. El `e2e/performance.spec.ts` mide tiempos
   intra-página en un entorno sintético. Consecuencia: una regresión de
   rendimiento **no es detectable** hasta que un usuario se queja.

4. **El logger es un no-op.** `src/utils/logger.ts` es un passthrough puro a
   `console`, con un docstring que promete _"one place to later forward
   messages to Sentry"_ — y ese forwarding **no existe**. Solo 5 ficheros lo
   usan, y hay **103** llamadas crudas a `console.warn`/`console.error` en
   `src/`, permitidas por `no-console` (`frontend/eslint.config.js:39`,
   `allow: ["warn", "error"]`). **En producción, esos 103 mensajes no llegan
   a ningún sitio.**

5. **No hay presupuesto de performance en CI.** Nada impide que el bundle
   crezca 200 kB en un PR. No hay Lighthouse CI, ni budget por chunk, ni
   alerta de regresión de CWV.

## Decisión

1. **React Compiler en el build de producción.** `babel-plugin-react-compiler`
   se aplica solo en build (el modo dev conserva Fast Refresh sin el
   compilador). El compilador **sustituye la memoización manual**: se
   auditan los 360 `useMemo`/`useCallback` y los 39 `React.memo` uno a uno y
   **se eliminan los redundantes**. Los que **no** son redundantes (una
   referencia que evita re-suscribir una suscripción de socket, una
   dependencia de un `useEffect` externo al árbol de React, un hot path
   medido) **se conservan con un comentario que justifique por qué**. El
   criterio es explícito: **no se elimina memoización sin evidencia**, y la
   evidencia es la medición de renders (script reproducible) más la suite e2e.

2. **Container queries para los componentes reutilizables.** Las primitivas de
   `components/ui/` declaran `container-type: inline-size` y usan las
   variantes `@sm:`/`@lg:`/`@2xl:` de Tailwind v4, adaptando su layout al
   **ancho disponible** y no al de la ventana. `useMediaQuery` y
   `useScreenSize` **se mantienen** para las decisiones de layout **de
   página** (shell, navegación), que sí dependen del viewport: lo que cambia
   es que los **componentes** dejan de depender del viewport.

3. **Core Web Vitals en campo.** `web-vitals` reporta LCP, INP, CLS, FCP y
   TTFB a Sentry con contexto (ruta, rol, dispositivo, conexión), con
   inicialización **diferida** (`requestIdleCallback`) que no bloquea el
   primer paint.

4. **El logger es un sink real.** `src/utils/logger.ts` forwardea a Sentry:
   `error` → `captureException` con contexto, `warn` → **breadcrumb** (sin
   coste de cuota), `info`/`debug` → breadcrumb; la salida de consola queda
   **solo en desarrollo**. Las 103 llamadas crudas migran al logger y
   `no-console` pasa a `allow: []` con excepción únicamente para el propio
   logger.

5. **Presupuesto de performance en CI**, con la **misma política monótona**
   que `design-system-budget.json` y `lint-budget.json`: un
   `frontend/performance-budget.json` con límites por chunk y de precache, un
   verificador que **falla si el bundle crece** y cuyo `--update` aborta
   si el conteo actual supera el vigente, y un gate de Lighthouse CI sobre
   las rutas críticas.

## Alternativas consideradas

1. **Mantener la memoización manual** — descartada: es la opción actual y
   su coste es invisible. 360 declaraciones de dependencias sin auditor,
   con un fallo de dependencia que produce un render obsoleto en un hot path
   que nadie va a depurar. El compilador convierte una invariativa en
   código generado por el framework.
2. **Activar React Compiler y eliminar toda la memoización manual** —
   descartada: se perderían las optimizaciones que expresan una intención
   que el compilador **no puede inferir** (referencias para evitar
   re-suscripciones, dependencias de efectos externos). La decisión
   intermedia — eliminar solo lo redundante, con justificación explícita
   para lo que sobrevive — es más honesta y más auditable.
3. **Mantener los breakpoints de viewport y duplicar más componentes
   desktop/mobile** — descartada: es la estrategia actual y ya produjo 5
   pares duplicados. Con container queries, el componente se adapta solo y
   el duplicado desaparece.
4. **Eliminar `useMediaQuery`/`useScreenSize` en favor de container
   queries en todas partes** — descartada: el shell y la navegación **sí**
   dependen del viewport (una sidebar colapsada vs expandida no es una
   propiedad del contenedor). La decisión es por capa, no dogmática.
5. **Reportar los Core Web Vitals a un proveedor de analítica en vez de
   Sentry** — descartada: el repo ya tiene Sentry integrado, con
   `src/utils/sentry.ts` y middlewares (`src/utils/sentryMiddlewares.ts`,
   101 líneas). Un segundo sistema de telemetría duplicaría la
   configuración y el coste.
6. **Hacer el logger un no-op pero banir `console` por completo** —
   descartada: sin sink, los errores se perderían en silencio. Un logger que
   solo escribe en consola es peor que no tener logger, porque aparenta
   centralizar algo que no centraliza.
7. **Fijar el budget de bundle como un límite duro de KB en el config de
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
- **Una regresión de rendimiento en producción es detectable**: LCP, INP y
  CLS en campo, con contexto de ruta y rol.
- **Los 103 mensajes que hoy se pierden en producción** llegan a Sentry.
- El bundle deja de crecer sin control: hay un presupuesto ejecutable.

Negativas / costos aceptados:

- **React Compiler aumenta el tamaño del código generado** (es su
  naturaleza). El budget de AC8 lo acota; si no aguanta, la mitigación es
  aplicar el compilador por chunk en lugar de globalmente.
- **Activar el compilador puede exponer bugs** de memoización manual
  incorrecta que hoy están ocultos. Se mitiga con la medición de renders, la
  suite e2e y la migración por lotes.
- `web-vitals` es una dependencia **runtime** (~1-2 kB) y añade inicialización
  diferida: hay que garantizar que no retrasa el primer paint.
- Convertir `logger` en un sink real **cambia el volumen de eventos** de
  Sentry. Se mitiga con breadcrumbs para `warn` (sin coste de cuota) y
  reservando `captureException` para `error`.
- Los budgets de bundle y de Lighthouse **bloquean PRs legítimos** que
  aumentan el bundle de forma justificada. El proceso de ajuste está documentado
  (justificación + `--update` con motivo), pero es fricción real.
- El modo `data-ui-perf="high"` y `prefers-reduced-motion` son
  **invariantes** y esta spec no los toca: es un límite deliberado.

## Referencias

- `frontend/src/utils/logger.ts` — el passthrough que se convierte en sink.
- `frontend/src/utils/sentry.ts:9` — `initSentry`, la inicialización que se
  **extiende** (no se cambia).
- `frontend/src/utils/sentryMiddlewares.ts` — middlewares existentes.
- `frontend/src/lib/queryClient.ts:26,37` — el único consumidor actual de
  Sentry (los errores de TanStack Query).
- `frontend/eslint.config.js:39` — `no-console` con `allow: ["warn","error"]`
  que pasa a `allow: []`.
- `frontend/src/index.css:679` (`prefers-reduced-motion`) y `:689`
  (`data-ui-perf="high"`) — invariantes que no se tocan.
- `frontend/src/hooks/useMediaQuery.ts` (49 líneas, 15 consumidores) y
  `frontend/src/hooks/useScreenSize.ts` (31) — la estrategia de viewport que
  se conserva **para el shell**.
- `frontend/src/features/employee-management/hooks/useEmployeeManagementData.ts:64,108-110`
  — el `window.innerWidth` inline que se elimina.
- `frontend/src/features/theoretical-shifts/components/{AssignmentList,LeaveList,PatternList,HolidayList}{Desktop,Mobile}.tsx`
  — los 5 pares desktop/mobile que se unifican.
- `frontend/design-system-budget.json` y `frontend/lint-budget.json` — el
  patrón de budget monótono que se replica para el bundle.
- [spec 037](file:///specs/037-frontend-rendering-observability/spec.md) —
  implementación, AC y plan.
- [ADR-0009](0009-observabilidad-minima.md) — la observabilidad mínima que
  esta spec extiende al plano de la UI.
- [ADR-0020](0020-design-system-governance.md) — el modo de alto rendimiento
  que esta spec no modifica.
