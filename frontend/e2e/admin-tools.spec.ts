import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

// Reescrito en spec 004 fase 3 (2026-10-03): la app usa HashRouter
// (`/#/...`) y `/admin/tools` redirige a `/#/admin/governance?tab=system`
// (ver ROUTES + App.tsx). El login usa los mismos defaults que el smoke
// (admin/999.666) en vez de skipear sin env vars.

test.describe("Admin tools access control", () => {
  test.setTimeout(120000);
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/#/admin/tools");

    await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByText(/centro de gobernanza/i)).not.toBeVisible();
  });

  test("admin can login and open admin tools", async ({ page, request }) => {
    await loginFast(page, request, "admin");

    await page.goto("/#/admin/tools");
    // /admin/tools redirects to the Governance Hub system tab
    await expect(page).toHaveURL(/\/admin\/governance.*tab=system/, { timeout: 30000 });
    await expect(page.getByText(/centro de gobernanza/i)).toBeVisible({ timeout: 30000 });
    // KpiStat label, unique to the stats cards (plain "Usuarios" also
    // matches a collapsed sidebar entry and .first() picks the hidden one)
    await expect(page.getByText(/total activos/i)).toBeVisible({ timeout: 30000 });
  });
});
