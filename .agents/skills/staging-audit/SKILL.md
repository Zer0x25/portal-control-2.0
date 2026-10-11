---
name: staging-audit
description: Headless Playwright audit and verification runbook against local staging. Use when navigating the full app in staging, reporting bugs with evidence, or verifying a frontend fix after rebuild (fix-verify-commit loop).
---

# Staging Audit & Verification Runbook

## Cuándo usar

- Navegación completa de la app en staging con reporte de bugs.
- Verificación post-fix: el cambio solo cuenta si el bundle reconstruido en
  staging lo demuestra (ver `.agents/rules/staging-verification.md`).

## Paso 0: Precondiciones

```bash
# Desde la raíz del repo
docker compose --env-file .env.staging -f compose.staging.yaml ps
curl -s http://127.0.0.1:8080/api/health | head -c 200
```

Todo `healthy` y gateway `200`. Si no, levantar con
`docker compose --env-file .env.staging -f compose.staging.yaml up --build -d`.

## Paso 1: Script de auditoría (plantilla)

Scripts efímeros dentro de `frontend/` (resuelven `playwright` de
`node_modules`; borrar al terminar con `rm -f`):

```js
import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const API = "http://127.0.0.1:8080/api";
// 1. Login por API (una vez por rol)
const res = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "999.666" }),
});
const b = await res.json();
const user = { id: b.userId, username: b.username, role: b.role, employeeId: b.employeeId ?? null, isDeleted: false, lastModified: Date.now(), syncStatus: "synced" };
// 2. Contexto con sesión sembrada (NO login UI salvo que se pruebe el login)
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(
  ({ token, storedUser }) => {
    sessionStorage.setItem("authToken", token);
    sessionStorage.setItem("currentUser", JSON.stringify(storedUser));
  },
  { token: b.token, storedUser: user },
);
const page = await ctx.newPage();
// 3. SIEMPRE con hash (HashRouter): BASE + "/#" + route
page.on("response", (r) => {
  if (r.status() >= 400) console.log("FAIL", r.status(), r.url().replace(BASE, ""));
});
await page.goto(BASE + "/#/dashboard", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
```

Capturar por ruta: `location.hash`, `data-current-path`, `h1` (1 solo por
página), conteo `[data-testid]`, botones/campos sin nombre accesible,
`console` errors, `pageerror`, requests `>= 400`, overflow horizontal.

## Paso 2: Reporte con evidencia

Cada bug: ruta, rol, síntoma observable, causa en código con `archivo:línea`,
severidad. Verificar la causa en el fuente antes de reportar (el conteo DOM
solo es el síntoma). Distinguir artefactos del script (ej. timeouts por esperar
selectores que una vista no tiene, como `main-content` en kiosco) de bugs
reales: medir el timing con el selector correcto.

## Paso 3: Fix + regresión + rebuild + re-verificación

1. Fix mínimo (preferir fallback sistémico en `components/ui/*`).
2. Test `vitest` que falle sin el fix.
3. `npx tsc --noEmit`, `eslint` (+ `--fix`), `prettier --check`,
   `node ../scripts/lint-budget.cjs --only frontend`.
4. `docker compose --env-file .env.staging -f compose.staging.yaml up --build -d frontend`
   (rebuild; el `dev` local NO valida staging), esperar `healthy`, script de
   verificación dedicado (assert + `process.exit(1)` si falla).
5. Commit `tipo(scope): mensaje` sin emojis, un bug por commit. Si el cambio
   toca contratos HTTP/OpenAPI/SDK, seguir además la skill `api-contracts-sync`;
   antes de PR, la skill `ci-preflight`.

## Referencias (no duplicar)

- Contrato DOM vivo: `frontend/e2e/README.md`.
- Helpers existentes: `frontend/e2e/helpers/auth-helper.ts`,
  `frontend/e2e/headless-navigation.spec.ts`.
- Suites de regresión en staging:
  `E2E_BASE_URL=http://127.0.0.1:8080 E2E_API_URL=http://127.0.0.1:8080/api npx playwright test e2e/<spec> --project=functional`.
