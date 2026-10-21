# Spec 035: Frontend Testing Stack

- Estado: Borrador
- Autor: zer0x
- Fecha: 2026-10-21
- ADR relacionado: [0028-frontend-testing-stack.md](file:///docs/adr/0028-frontend-testing-stack.md)
- Specs hermanos: [033-frontend-layering-hardening](file:///specs/033-frontend-layering-hardening/spec.md) (frontera de capas), [034-frontend-http-client-consolidation](file:///specs/034-frontend-http-client-consolidation/spec.md) (cliente HTTP), [036-frontend-form-table-primitives](file:///specs/036-frontend-form-table-primitives/spec.md) (formularios y tablas), [037-frontend-rendering-observability](file:///specs/037-frontend-rendering-observability/spec.md) (observabilidad; dueña de la migración del logger a Sentry)
- Dependencia de secuencia (bloqueante): requiere la [spec 034](file:///specs/034-frontend-http-client-consolidation/spec.md) **mergeada** — como mínimo sus Fases A (`apiClient`), B (services migrados), D (raíz canónica `["shiftReports"]`) y E (`queryKeys` + allowlists). Los handlers MSW deben apuntar a services que ya hablan `apiClient` (hoy 13 aún usan `fetch` crudo), y el test de invalidación merged de AC2 solo puede estar en verde tras la Fase D de la 034.

## Problema

El repo tiene una suite de tests madura en cobertura de **estructura** (14
guardrails, 110 ficheros de test, 56 tests e2e, axe-core en claro/oscuro) pero
con cuatro **ciegos estructurales** que hacen que esa suite no pueda capturar
ciertos tipos de defecto — y esos ciegos ya han dejado pasar bugs reales.

1. **El mocking de red es artesanal.** 73 ficheros usan `vi.mock` (71 de
   ellos en `src/tests/`), y el patrón es mockear módulos internos
   (`vi.mock("../../services/configService")`) en lugar de **mockear la red**.
   Consecuencia: un test que "pasa" no verifica nada del contrato de red, y
   **no puede detectar un bug de caché o de invalidación**. Caso concreto y
   verificable: el bug `["shiftReports"]` sin invalidar
   (`src/hooks/useReportMutations.ts` invalida `["reports"]` pero
   `src/hooks/queries/useShiftReportsInfinite.ts:11` usa `["shiftReports"]`)
   **es invisible para la suite actual**: ningún test exercisea el ciclo
   completo mutación → invalidación → re-fetch de la query que la consume.

2. **JSDOM no calcula layout ni focus real.** `frontend/vite.config.ts:232`
   fija `environment: "jsdom"`. JSDOM no implementa layout, ni
   `getBoundingClientRect`, ni el ciclo de focus real, ni `IntersectionObserver`
   (hay shims), ni visibility. El componente `CinematicModal` — que es **la
   primitiva de accesibilidad central del producto** — se testea contra un DOM
   simulado: su focus trap, su `aria-modal` y su retorno de foco se verifican
   sobre un modelo que no reproduce el comportamiento del navegador. El
   `axe-core` de `e2e/a11y.spec.ts` corre en **Chromium real** (Playwright) y
   es la red real de seguridad, pero el gate unitario es más débil de lo que
   aparenta.

3. **No hay regresión visual.** El design system está gobernado por tokens y
   por budgets (`design-system-budget.json`: 879 usos de palette crudo, 173 en
   archivos certificados), pero **no hay ninguna evidencia visual** de que un
   cambio de token no rompa una pantalla. Consecuencia: el decremento del
   budget de palette crudo es un acto de fe (el código compila, el lint pasa,
   la vista _debería_ verse igual).

4. **El ratchet de cobertura es de 16% y está congelado desde 2026-10-04.**
   `frontend/vite.config.ts:253-266` fija `thresholds: {lines: 16, functions:
13, branches: 13, statements: 16}` con un baseline medido de 18.54% L /
   15.29% F / 15.13% B / 18.1% S. Los umbrales "solo pueden subir", pero el
   valor absoluto es bajo y el comentario del propio config dice explícitamente
   _"Subir cobertura real va por spec aparte (fuera de alcance de 003)"_.
   Ese spec aparte **nunca se escribió**.

> El quinto ciego original — el `logger` como passthrough no observable y las
> 103 llamadas crudas a `console.*` — **no es de esta spec**: lo trata la
> [spec 037](file:///specs/037-frontend-rendering-observability/spec.md)
> (ADR-0026, Decisión #4). Aquí solo se toca su **superficie de test**
> (spies del `logger`/Sentry en `setup.ts`, AC7).

## Alcance

Dentro:

- **A. Mocking de red real (MSW)**: introducir `msw` y migrar los mocks
  artesanales de `src/tests/` a handlers sobre la API real; **los tests de
  servicios pasan a ejercitar el contrato HTTP de verdad** (status, body,
  headers), lo que habilita detectar los bugs de caché/invalidación.
- **B. Tests de caché e invalidación**: el patrón **mutación → invalidación →
  re-fetch** implementado con MSW sobre el `QueryClient` real, aplicado a
  todas las mutaciones que declaran `invalidateQueries` (depende de la
  corrección de raíces de la spec 034).
- **C. Vitest Browser Mode**: ejecutar la suite que requiere layout y focus
  real (modales, focus trap, `position: sticky`, scroll, contenedores
  virtualizados) en un navegador real en lugar de JSDOM.
- **D. Regresión visual**: snapshots de Playwright sobre las rutas
  certificadas (claro y oscuro), con baseline versionado en el repo, para que
  un cambio de token o de layout tenga evidencia objetiva.
- **E. Ratchet de cobertura**: subir el umbral de cobertura con un spec
  dedicado, priorizando las capas que concentran el riesgo (hooks de query y
  de mutación, services, store) y usando MSW como palanca.

Fuera (explícito):

- **E2E de negocio**: los 56 tests de `frontend/e2e/` no se reescriben; esta
  spec solo **agrega** capas, no reemplaza la suite existente.
- **Contratos backend**: `swagger.json` y el SDK no cambian. MSW **consume**
  el contrato, no lo redefine.
- **Estrategia de datos de prueba**: no se introduce el patron "Given/When/Then"
  como estilo obligatorio; la spec se centra en la infraestructura.
- **Testing de backend**: el backend tiene su propia suite (`backend/tests/`);
  no se toca.
- **Logger y observabilidad de errores**: la conversión de
  `src/utils/logger.ts` en sink de Sentry, la migración de las **103**
  llamadas crudas a `console.warn`/`console.error` y el endurecimiento de
  `no-console` a `allow: []` pertenecen a la
  [spec 037](file:///specs/037-frontend-rendering-observability/spec.md)
  (ADR-0026, Decisión #4); esta spec solo instala su **spy/stub** en el
  entorno de test (AC7).
- Specs hermanos: la deduplicación de las primitivas de formulario y tabla
  está en la [spec 036](file:///specs/036-frontend-form-table-primitives/spec.md);
  el rendimiento de render está en la
  [spec 037](file:///specs/037-frontend-rendering-observability/spec.md).

## Criterios de aceptación

- [x] AC1: **Mocking de red real**. `msw` está en `devDependencies` y el
      handler set por defecto (`src/tests/mocks/server.ts`) sirve la API real
      del backend; al menos los services migrados en la
      [spec 034](file:///specs/034-frontend-http-client-consolidation/spec.md)
      se testean **contra el handler**, no contra `vi.mock` del módulo.
- [x] AC2: **Los bugs de caché son detectables**. Existe un test de
      regresión que ejercita el ciclo **mutación → invalidación → re-fetch**
      para el recurso de reportes de turno. La fase roja se verifica
      **localmente contra el código previo a la corrección de la spec 034**
      (raíz `["shiftReports"]` no invalidada por `["reports"]`) y se
      documenta como evidencia en el PR; el test que se mergea **queda en
      verde** gracias a la corrección de la 034 (Fase D) — ningún PR mergea
      con un test en rojo en CI. El mismo patrón de test se aplica a
      `config` (raíz genérica vs sub-keys) y a la raíz `audit-logs` fuera de
      las allowlists de `src/lib/queryCache.ts`.
- [x] AC3: **El contrato HTTP es verificable**. Los tests de services
      verifican status, body y headers contra la API real (no contra un mock
      de módulo): un 401 produce `ApiHttpError` con `status === 401`, un 204
      produce un body vacío y no un `undefined`, un body malformado produce
      un error tipado. Existe además un test que valida las **claves de query
      usadas por los handlers contra `backend/docs/swagger.json`**, de modo
      que un cambio de contrato rompe el CI.
- [x] AC4: **Regresión visual operativa**. Existen snapshots de Playwright
      para un conjunto mínimo y curado de rutas (dashboard, planificador,
      worker-portal, kiosk, logbook, governance — las rutas de las
      certificaciones e2e existentes), en **claro y oscuro**, con los
      baselines versionados en el repo; el CI falla ante una diferencia
      no aprobada (`--update-snapshots` es una operación explícita y
      revisable). El conjunto de rutas cubiertas está declarado en un fichero
      único, no disperso en los specs.
- [x] AC5: **Los tests de focus y layout corren en navegador real**.
      `vitest` Browser Mode está configurado y la suite de accesibilidad de
      componentes (`CinematicModal` con focus trap + retorno de foco,
      `DatePickerDialog` con navegación por teclado, `TabNav` con flechas,
      `NumericKeypad`) se ejecuta en Chromium real en lugar de JSDOM, y
      verifica comportamiento **no observable en JSDOM** (elemento realmente
      enfocado, `tabIndex` efectivo, scroll real).
- [x] AC6: **Ratchet de cobertura subido con criterio**. Los umbrales de
      `frontend/vite.config.ts:253-266` suben desde `{lines: 16, functions:
13, branches: 13, statements: 16}` a un valor **medido** y sostenido
      (objetivo: `lines ≥ 30, functions ≥ 25, branches ≥ 25, statements ≥ 30`
      tras la Fase A–C), y el comentario del config se actualiza con el
      baseline nuevo. **El ratchet solo puede subir**, igual que hoy.
- [x] AC7: **El entorno de test es observable y aislado**. `src/tests/setup.ts`
      instala spies/stubs del `logger` y de Sentry: ningún test unitario
      ejecuta el SDK real de Sentry, y un test puede afirmar sobre los
      mensajes que el `logger` emite. **Fuera de alcance**: convertir
      `logger.ts` en sink de Sentry, migrar las 103 llamadas crudas a
      `console.*` y cambiar `no-console` — eso es de la
      [spec 037](file:///specs/037-frontend-rendering-observability/spec.md)
      (ADR-0026, Decisión #4).
- [x] AC8: **Sin regresión**. `npm run validate:ci` (frontend),
      `npm run guardrails`, `npm run spec:check`, `npm run docs:check`,
      `npm run preflight` en verde; `npm run e2e:staging` en verde (56 tests);
      el número de tests unitarios **no disminuye** respecto al baseline de la
      auditoría (110 ficheros de test).

## Restricciones

- Constitución (I–V): en particular IV ("calidad con ratchet, no con
  tolerancia") — el ratchet de cobertura solo sube, y el de tests nunca baja.
- **La suite e2e existente es el contrato de regresión funcional**: no se
  reescribe ni se elimina ningún test de `frontend/e2e/`.
- **Los tests no se ejecutan contra un backend real en unitarios**: MSW
  intercepta la red en el proceso de test; el e2e sigue hablando con el
  backend real (`e2e:staging`).
- Los snapshots de regresión visual son **platform-specific**: el CI debe
  fijar la imagen base del navegador (ya fijada por `playwright.config.ts`) y
  las diferencias de renderizado por plataforma no pueden degradarse a
  "actualizar baselines" sin revisión.
- `msw` es una **dependencia de desarrollo**: no debe entrar en el bundle de
  producción.
- El budget de lint sigue en **0/0**. La migración de las llamadas a
  `console` y el endurecimiento de `no-console` **no son de esta spec**: los
  gestiona la
  [spec 037](file:///specs/037-frontend-rendering-observability/spec.md)
  (ADR-0026, Decisión #4).
- **Secuencia respecto a la spec 034**: no se abre ningún PR de esta spec
  antes de que la 034 esté mergeada (ver cabecera). Si por reordenación
  tocara adelantarlos, el test de AC2 se marca temporalmente con `test.fails`
  y se desmarca en el PR de la 034; en ningún caso se mergea un test en rojo.
- Rollback por fase: cada workstream (A–E) es un PR independiente.

## Trazabilidad

- **Tests que lo probarán**:
  - `frontend/src/tests/mocks/server.ts` + `handlers.ts` (nuevos, AC1)
  - `frontend/src/tests/services/*.test.ts` (nuevos, AC3)
  - `frontend/src/tests/cache/invalidation.test.ts` (nuevo, AC2)
  - `frontend/src/tests/contracts/swagger-alignment.test.ts` (nuevo, AC3)
  - `frontend/e2e/visual-regression.spec.ts` (nuevo, AC4)
  - `frontend/src/tests/browser/*.spec.tsx` (nuevos, AC5)
  - `frontend/src/tests/setup.ts` (extendido, AC1, AC7)
- **Docs a actualizar**:
  - `frontend/README.md` o el docblock de `src/tests/setup.ts`: cómo ejecutar
    cada modo de test
  - `.agents/rules/frontend-testing.md` (**nueva** regla dedicada de
    testing; no `frontend-performance.md`, que es exclusivamente de
    rendimiento): invariante "las mutaciones se testean contra la red real
    (MSW), no contra mocks de módulo"
  - `frontend/vite.config.ts`: comentarios del ratchet de cobertura y del
    modo browser
  - `docs/adr/0028-frontend-testing-stack.md` e `docs/adr/README.md`
    (índice)
