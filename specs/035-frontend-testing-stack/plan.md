# Plan 035: Frontend Testing Stack

Spec: `./spec.md`. Constitución: `../constitution.md`.
Hermanos: `../033-frontend-layering-hardening/plan.md`,
`../034-frontend-http-client-consolidation/plan.md`,
`../036-frontend-form-table-primitives/plan.md`.

## Estrategia

5 workstreams (A–E). El orden es deliberado: **A primero**, porque el
mocking de red real es lo que convierte el resto del trabajo en verificable
(el bug `["shiftReports"]` solo se puede probar con MSW).

**Dependencia de secuencia (bloqueante)**: la
[spec 034](file:///specs/034-frontend-http-client-consolidation/spec.md)
debe estar mergeada — como mínimo sus Fases A (`apiClient`), B (services
migrados), D (raíz canónica `["shiftReports"]`) y E (`queryKeys` +
allowlists) — antes de abrir los PRs de las Fases A y B. Motivos: (a) los
handlers MSW deben apuntar a services que ya hablan `apiClient`, no a los 13
services con `fetch` crudo que la 034 elimina; (b) el test de invalidación
de AC2 solo puede quedar en verde tras la Fase D de la 034. No se mergea
ningún PR con un test en rojo en CI: si la 034 no ha llegado, el test de
AC2 se escribe con `test.fails` temporal y se desmarca en el PR que cierre
la dependencia.

1. **Fase A — MSW como estándar de mocking (3 PR)**:
   - Añadir `msw` (devDep) y el handler set por defecto en
     `src/tests/mocks/`: `server.ts` (instancia `setupServer`), `handlers.ts`
     (handlers por recurso, Derivados de las rutas reales de
     `backend/docs/swagger.json`), `fixtures.ts` (datos de ejemplo
     deterministas) y `browser.ts` (handlers para el modo browser).
   - **Los handlers se generan desde el contrato**: un test verifica que cada
     ruta registrada en `handlers.ts` existe en `backend/docs/swagger.json` y
     que la forma del `body` cumple el schema OpenAPI correspondiente. Esto
     convierte MSW en un **contrato ejecutable**, no en un segundo conjunto de
     mocks que se puede desincronizar del backend.
   - Migrar por lotes: primero los tests de `src/hooks/` (los de mayor
     riesgo: caché e invalidación), luego `src/services/`, luego
     `src/features/*/`.
   - Los `vi.mock` de módulos internos **se eliminan**, no se conviven: un
     `vi.mock("../../services/configService")` es exactamente lo que MSW
     reemplaza.
2. **Fase B — Tests de caché e invalidación (1 PR, el de mayor valor)**:
   - `src/tests/cache/invalidation.test.ts`: para cada mutación que declara
     `invalidateQueries`, un test que (a) monta el `QueryClient` real, (b)
     siembra la query con MSW, (c) ejecuta la mutación, (d) verifica que la
     query se vuelve a pedir y que el handler devuelve el dato nuevo.
   - La fase roja se verifica **localmente contra el código previo** a la
     corrección de la 034 (raíz `["shiftReports"]` no invalidada) y se
     documenta en el PR como evidencia de AC2; el test que se mergea **queda
     en verde** gracias a la Fase D de la 034.
   - Extender el patrón a `config` (raíz genérica vs sub-keys) y a la raíz
     `audit-logs` fuera de las allowlists.
   - El guardrail de la spec 034 (toda raíz en una allowlist) y este test son
     **complementarios**: uno es estático, el otro es dinámico.
3. **Fase C — Vitest Browser Mode (2 PR)**:
   - Configurar el proyecto `browser` de Vitest en `frontend/vite.config.ts`
     (provider `playwright`, Chromium headless), con `include` restringido a
     `src/tests/browser/**` para no duplicar la suite JSDOM; el proyecto
     `jsdom` gana a su vez `exclude: ["src/tests/browser/**"]` — en Vitest 5,
     `test.projects` no aísla el glob `src/**/*.{test,spec}.{ts,tsx}` y sin
     el exclude los specs de browser se ejecutarían también en JSDOM.
   - **CI**: el job `verify-frontend` de `.github/workflows/ci.yml` ejecuta
     `npm run validate:ci:coverage` (`vitest run --coverage`), **no** `npm
run test:run:ci`; con el proyecto browser activo, ese `vitest run`
     intenta lanzar Chromium, así que `.github/workflows/ci.yml` añade
     `npx playwright install --with-deps chromium` antes del paso de
     validación (alternativa: acotar el comando de cobertura al proyecto
     jsdom). Sin una de las dos mitigaciones, la Fase C **rompe el CI**.
   - Migrar a browser los tests que **no pueden** meaningfully correr en JSDOM:
     `CinematicModal` (focus trap + retorno de foco), `DatePickerDialog`
     (navegación por teclado), `TabNav` (flechas), `NumericKeypad`,
     `SortableHeader` (drag), y los tests de contenedores virtualizados
     (`@tanstack/react-virtual` necesita `getBoundingClientRect` real).
   - Mantener JSDOM para lo que sí funciona (hooks puros, guards, lógica de
     dominio): **Browser Mode no reemplaza JSDOM, lo complementa**. Duplicar
     la suite completa en browser multiplicaría el tiempo de CI sin valor.
4. **Fase D — Regresión visual (2 PR)**:
   - Nuevo `frontend/e2e/visual-regression.spec.ts` con un **conjunto curado
     y declarado** de rutas (fichero único `visual-targets.ts`), en claro y
     oscuro, con `toHaveScreenshot` y tolerancias explícitas (umbral por
     proyecto, no el default).
   - **Decisión clave**: los baselines se versionan **en el repo**, no en un
     servicio externo. Motivo: el repo ya tiene una disciplina de ratchets
     versionados (`design-system-budget.json`, `lint-budget.json`,
     `design-system-certified.json`); un servicio externo rompería ese patrón
     y añadiría una dependencia de red al CI.
   - **Orden en `playwright.config.ts`**: hoy solo existen los proyectos
     `functional` y `perf` (con `perf` dependiendo de `functional`); se añade
     un proyecto `visual` (`testMatch: **/visual-regression.spec.ts`) con
     `dependencies: ["functional"]`, de modo que la regresión visual corre
     **después** de los funcionales (incluido axe-core) y **antes** de `perf`,
     que necesita serie sin carga concurrente.
   - Se ejecuta solo sobre las rutas del conjunto curado (no sobre las 56 de
     e2e: coste prohibitivo).
   - Compatibilidad de plataformas: el CI fija la imagen del navegador
     (`playwright.config.ts`); las diferencias por plataforma se gestionan con
     `maxDiffPixelRatio` y quedan documentadas.
5. **Fase E — Ratchet de cobertura y spies del entorno de test (1 PR)**:
   - `src/tests/setup.ts` instala **spies/stubs del `logger` y de Sentry**:
     ningún test unitario ejecuta el SDK real de Sentry y los tests pueden
     afirmar sobre los mensajes que el `logger` emite. **Fuera de alcance**:
     convertir `logger.ts` en sink de Sentry, migrar las 103 llamadas crudas
     a `console.warn`/`console.error` y cambiar `no-console` — eso pertenece
     a la [spec 037](file:///specs/037-frontend-rendering-observability/spec.md)
     (ADR-0026, Decisión #4).
   - Subir el ratchet de cobertura con el valor **medido** tras las fases
     anteriores, y actualizar el comentario del config con el baseline nuevo.

## Archivos a tocar

| Archivo                                                          | Cambio                                                                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `frontend/package.json`                                          | `msw` (devDep), `@vitest/browser` (devDep), scripts de test por modo                                             |
| `frontend/vite.config.ts`                                        | proyecto `browser` + `exclude` en el proyecto jsdom, `setupFiles` por modo, thresholds de cobertura actualizados |
| `frontend/playwright.config.ts`                                  | **nuevo proyecto `visual`** con `dependencies: ["functional"]` (functional → visual → perf)                      |
| `frontend/src/tests/mocks/{server,handlers,fixtures,browser}.ts` | **nuevos** — MSW                                                                                                 |
| `frontend/src/tests/setup.ts`                                    | arranque del server MSW, reset entre tests, spies de `logger` y Sentry                                           |
| `frontend/src/tests/cache/invalidation.test.ts`                  | **nuevo** — mutación → invalidación → re-fetch                                                                   |
| `frontend/src/tests/contracts/swagger-alignment.test.ts`         | **nuevo** — handlers contra `swagger.json`                                                                       |
| `frontend/src/tests/services/*.test.ts`                          | **nuevos** — contrato HTTP por service                                                                           |
| `frontend/src/tests/browser/*.spec.tsx`                          | **nuevos** — focus/layout en Chromium real                                                                       |
| `frontend/e2e/visual-regression.spec.ts`                         | **nuevo** — snapshots                                                                                            |
| `frontend/e2e/visual-targets.ts`                                 | **nuevo** — conjunto curado de rutas                                                                             |
| `frontend/src/tests/**` (71 ficheros con `vi.mock`)              | migrar de `vi.mock` a MSW (lotes)                                                                                |
| `.github/workflows/ci.yml`                                       | `npx playwright install --with-deps chromium` en `verify-frontend`; paso de regresión visual en e2e              |
| `.agents/rules/frontend-testing.md`                              | **nueva** regla dedicada (invariante MSW vs `vi.mock`); `frontend-performance.md` no se toca                     |
| `docs/adr/0028-frontend-testing-stack.md`                        | **nuevo** — decisiones permanentes de esta spec                                                                  |
| `docs/adr/README.md`                                             | índice: entrada 0028                                                                                             |
| `frontend/src/lib/queryCache.ts`                                 | nada (se valida, no se cambia)                                                                                   |
| `frontend/src/lib/queryKeys.ts`                                  | nada (creado por la spec 034; este spec lo consume)                                                              |

## Contratos afectados

- **Backend / `swagger.json` / SDK: ninguno.** MSW **consume** el contrato
  existente; el test de alineación falla si los handlers se desvían.
- **Contrato interno de los tests**: los `vi.mock` de módulos internos
  desaparecen. Los tests que dependían de un mock de módulo pasan a
  depender de un handler; si un test mockeaba _comportamiento_ (no red), se
  traduce a un handler con el status/cuerpo correspondiente.
- **CI**: el job `verify-frontend` de `.github/workflows/ci.yml` ejecuta
  `npm run validate:ci:coverage` (`vitest run --coverage`), **no** `npm run
test:run:ci`; `frontend/scripts/run-frontend-tests.cjs` sigue siendo el
  entrypoint local de la suite multi-proyecto. Con el proyecto browser
  activo, ese `vitest run` intenta lanzar Chromium: el mismo PR de la Fase C
  añade `npx playwright install --with-deps chromium` al job (o acota el
  comando de cobertura al proyecto jsdom). El e2e añade el proyecto/paso de
  regresión visual. El tiempo de CI crece; se mitiga ejecutando el modo
  browser y la regresión visual **solo sobre los ficheros affected**
  (Playwright ya soporta sharding por ruta).
- **Snapshots versionados**: `frontend/e2e/__snapshots__/` (o la ruta que
  configure Playwright) es un artefacto nuevo del repo que requiere `git
add` explícito en la actualización de baselines.
- **PWA/Workbox**: sin cambios.

## Riesgos y rollback

| Riesgo                                                                                         | Mitigación                                                                                                                                 | Rollback                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| MSW no reproduce un comportamiento real (headers, CORS, redirects)                             | los handlers usan `HttpResponse` real; el e2e sigue siendo la red de verdad contra el backend                                              | revertir los handlers de un área          |
| La migración de 73 ficheros con `vi.mock` es un cambio masivo y noisy                          | lotes por área (`hooks` → `services` → `features`), un PR por lote, con el suite verde en cada uno                                         | revertir el lote                          |
| Browser Mode multiplica el tiempo de CI                                                        | el proyecto browser cubre **solo** `src/tests/browser/**`; el resto sigue en JSDOM                                                         | desactivar el proyecto browser            |
| El proyecto browser rompe `verify-frontend` (el job no instala Chromium)                       | añadir `npx playwright install --with-deps chromium` en `ci.yml` (o acotar la cobertura al proyecto jsdom) en el **mismo** PR de la Fase C | desactivar el proyecto browser            |
| Los snapshots de regresión visual fallan por diferencias de plataforma (fuentes, antialiasing) | `maxDiffPixelRatio` explícito por proyecto + imagen base fijada en CI                                                                      | relajar el umbral con justificación       |
| Los baselines se "actualizan" sin revisión y ocultan una regresión visual                      | la actualización de baselines es una operación **explícita y separada** del PR de código (fichero de baselines + PR de revisión del diff)  | revertir el baseline y arreglar el CSS    |
| Subir el ratchet de cobertura falla por un test flaky                                          | medir el baseline en 2 corridas consecutivas antes de fijar el umbral                                                                      | fijar el umbral al valor medido - 1 punto |

## Verificación

```bash
cd frontend
npm run test:run                 # suite JSDOM (existente) + guardrails
npm run test:run -- --project browser   # suite en Chromium real
npm run test:coverage            # ratchet de cobertura (solo puede subir)
npm run guardrails               # 14 guardrails + los nuevos
npm run check
npm run validate:ci
npm run e2e:staging              # 56 tests + regresión visual

# Raíz
npm run spec:check
npm run docs:check
npm run preflight
```
