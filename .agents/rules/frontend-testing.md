---
trigger: model_decision
---

# Frontend Testing Stack (spec 035)

Regla dedicada de testing del frontend. Complementa, no sustituye, a
`frontend-performance.md` (que es exclusivamente de rendimiento).

## Invariante principal

**Las mutaciones se testean contra la red real (MSW), no contra mocks de
modulo.** Un test de mutacion que use `vi.mock("../../services/x")` no
ejercita el camino real (service -> cliente HTTP -> backend) y no detecta
regresiones de invalidacion de cache, que es exactamente el bug P0 que la
spec 034 corrigio (raiz `["reports"]` vs `["shiftReports"]`).

## Convenciones

- Los handlers de MSW viven en `frontend/src/tests/mocks/handlers.ts` y son
  el **unico** punto donde el frontend inventa una respuesta. Cada handler
  habla el contrato real: mismo path, mismo verbo, misma forma de body que
  `backend/docs/swagger.json`. El contrato se verifica con
  `src/tests/contracts/swagger-alignment.test.ts`.
- `onUnhandledRequest: "error"` en `setup.ts`: una llamada sin handler
  **falla** el test. No se silencian peticiones no mockeadas.
- Los tests de invalidacion montan un `QueryClient` real, siembran la query,
  ejecutan la mutacion y verifican el re-fetch + el dato nuevo
  (`src/tests/cache/invalidation.test.tsx`).
- Los tests de service migran de `vi.stubGlobal("fetch")` a handlers MSW
  (`src/tests/services/*`). El `vi.mock` de `authToken`/`authService` se
  mantiene solo para el token de sesion (no es un concern de red).
- JSDOM para la suite unitaria (logica, hooks, services); **browser mode**
  (Playwright + Chromium) para comportamiento no observable en JSDOM:
  focus trap, teclado, drag, scroll virtual
  (`src/tests/browser/**`).
- La regresion visual corre en Playwright (proyecto `visual`) solo sobre el
  conjunto curado de rutas, despues de los funcionales.

## Regresion visual: baselines versionados

- Los baselines viven en el repo
  (`frontend/e2e/visual-regression.spec.ts-snapshots/`) y son **la referencia
  de la UI**. No hay servicio externo de imagenes.
- **Actualizar un baseline es una operacion explicita y separada**: nunca
  dentro de un PR de codigo. El flujo es (1) rebuild del staging con el
  codigo candidato, (2) `npx playwright test --project visual
--update-snapshots`, (3) PR dedicado con los PNG regenerados (el diff de
  imagenes es la revision; si el pipeline aun no exigia los baselines, la
  activacion del proyecto `visual` viaja en ese mismo PR), (4) merge. Un PR
  de codigo que cambia la UI legitimamente llega con su baseline regenerado
  en el PR siguiente.
- Un snapshot que se regenera sin revisar el diff **oculta la regresion que
  pretendia detectar**: por eso el PR de baselines es obligatorio y separado.
- Determinismo: reloj fijo (`page.clock.setFixedTime`), zona horaria fija
  (`America/Santiago`) y enmascarado explicito de las regiones con datos
  vivos (`volatileSelectors` / `volatileCards` en `e2e/visual-targets.ts`).
  El staging muta en cada corrida e2e: sin el enmascarado, el baseline se
  rompe en cada ejecucion y el test miente.
- `maxDiffPixelRatio` explicito y bajo (`0.02`): absorbe el antialiasing
  entre plataformas sin tolerar un cambio de diseno real.

## Como ejecutar cada modo

- `npm run test` / `npm run test:run`: suite JSDOM.
- `npm run test:browser`: proyecto browser (Playwright + Chromium).
- `npm run test:guardrails`: guardrails ejecutables.
- `npm run test:coverage`: cobertura con ratchet.
- `npm run e2e`: Playwright (functional + perf + visual).

## Ratchet

- Cobertura: `lines 31 / functions 27 / branches 25 / statements 30`
  (medido 2026-10-21 tras la migracion a MSW).
- Los umbrales solo pueden subir.
