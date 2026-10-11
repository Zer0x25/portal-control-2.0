---
trigger: model_decision
description: Staging verification loop for frontend work: headless Playwright audits, HashRouter navigation, DOM agent contract, and fix-verify-commit discipline.
---

# Staging Verification (Frontend)

Toda corrección o feature de frontend que afecte navegación, formularios o
render debe cerrarse con evidencia headless contra staging local, no solo con
tests unitarios.

## 1. Stack y acceso

- Staging local: `docker compose --env-file .env.staging -f compose.staging.yaml ps`
  (gateway `http://127.0.0.1:8080`, salud en `/api/health`).
- Credenciales seed: admin `admin` / `999.666`, worker `juan.perez` / `123456`
  (`E2E_WORKER_PASSWORD`, nunca commitear valores reales distintos del seed).
- Playwright ya instalado en `frontend/` (`@playwright/test` + browsers en cache).

## 2. Regla HashRouter (innegociable)

La app usa `HashRouter` (`frontend/src/contexts/AppProviders.tsx`). `page.goto()`
a path plano NO navega (sirve `index.html` y conserva el hash). Siempre:

```ts
await page.goto("http://127.0.0.1:8080/#/dashboard");
```

Siembra de sesión (igual que `e2e/helpers/auth-helper.ts:loginFast`): login por
API una vez, luego `addInitScript` con `sessionStorage` (`authToken` +
`currentUser`). Login UI solo cuando se prueba el login mismo.

## 3. Contrato DOM para agentes (no duplicar: fuente viva)

La fuente viva es [frontend/e2e/README.md](file:///frontend/e2e/README.md).
Al agregar o mover superficie interactiva, extender el contrato, no el relato:

- Elementos interactivos nuevos (botones icon-only, campos, tabs, paginación,
  modales, keypad): `data-testid` estable + nombre accesible (`aria-label` o
  `<label>` asociado). `title` solo no basta para AT.
- Rutas nuevas: item de sidebar con gate de rol espejando `App.tsx`, o registro
  explícito como "solo-hash" en el README e2e.
- Tabs con query (`?tab=`): `role="tablist/tab"`, `aria-selected` y
  `data-active-tab` en el contenedor (`data-current-path` no incluye el query).
- Fallbacks sistémicos antes que parches por sitio: `Button` refleja `title` a
  `aria-label`; `Input`/`Textarea` usan `label ?? placeholder` (ver sesión
  de estabilización a11y, commits `b1f8b21`/`704f6d9`).

## 4. Loop fix-verify-commit

1. Reproducir en staging headless y registrar evidencia (conteo DOM, requests
   fallidos, tiempos) antes de afirmar el bug.
2. Fix + test de regresión (`vitest`) en el mismo cambio.
3. `tsc --noEmit`, `eslint`, `prettier`, budget `node ../scripts/lint-budget.cjs --only frontend` (0/0).
4. Rebuild solo del servicio tocado (`up --build -d frontend`) y re-verificación
   headless contra staging (el bundle desplegado es lo que cuenta, no `dev`).
5. Commit Conventional Commits sin emojis, un bug por commit. Ver la skill
   `staging-audit` para el runbook paso a paso.
