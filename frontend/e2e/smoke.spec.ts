import { test, expect } from "@playwright/test";

// Smoke mínimo para CI (spec 003 G-03, AC3): corre contra compose.staging.
// - API viva: GET /api/health responde 200 con success.
// - Login real: admin entra y la app redirige a zona autenticada.
// No cubre flujos de negocio; esos viven en los otros e2e/*.spec.ts.
// El login se implementa inline (no se reutiliza el helper, atado a 15s)
// porque el stack staging en frío necesita ~30s.
test.describe("smoke @smoke", () => {
  test("API health responde OK", async ({ request }) => {
    const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
    const res = await request.get(`${apiBase}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("login admin redirige a zona autenticada", async ({ page }) => {
    // compose.staging en frío (build + prod compile + seed) tarda ~30s en
    // dejar la app navegable; 90s de margen para no flakear en CI.
    test.setTimeout(90000);
    await page.goto("/");
    await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });
    await page.fill("#username", process.env.E2E_ADMIN_USERNAME || "admin");
    await page.fill("#password", process.env.E2E_ADMIN_PASSWORD || "999.666");
    // Guardia anti-regresión (2026-10-03): el login UI real se colgaba ~28s
    // tras el click porque wipeAllData() no cerraba el handle IDB abierto y
    // deleteDB quedaba "blocked". Click->redirect debe ser segundos.
    const clickedAt = Date.now();
    await page.getByRole("button", { name: /acceder al portal/i }).click();
    await expect(page).toHaveURL(
      /(dashboard|time-control|configuration|admin\/tools|worker-portal|theoretical-shifts|shift-calendar)/,
      { timeout: 60000 },
    );
    expect(Date.now() - clickedAt).toBeLessThan(20000);
  });
});
