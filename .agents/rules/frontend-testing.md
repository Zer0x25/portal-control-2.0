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
