import { Page, expect } from "@playwright/test";

// Presupuesto calibrado en spec 004 fase 3 (2026-10-03): el boot real es
// ~14s en dev tibio y hasta ~30s en frío (build + seed + Vite compile).
// Los 10s/15s originales fallaban siempre; 30s/60s igual que smoke.spec.ts.
export async function login(page: Page, username?: string, password?: string) {
  const finalUsername = username || process.env.E2E_ADMIN_USERNAME || "admin";
  const finalPassword = password || process.env.E2E_ADMIN_PASSWORD || "999.666";

  await page.goto("/");

  // Wait for the page to load and selectors to be available
  await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });

  await page.fill("#username", finalUsername);
  await page.fill("#password", finalPassword);

  // The submit click can land before React hydration attaches the handler
  // (dev cold-boot compiles chunks lazily): retry the click while the
  // login form is still on screen, up to ~60s total like the smoke spec.
  let loggedIn = false;
  for (let attempt = 0; attempt < 3 && !loggedIn; attempt++) {
    await page.getByRole("button", { name: /acceder al portal/i }).click();
    try {
      await expect(page).toHaveURL(
        /(dashboard|time-control|configuration|admin\/tools|worker-portal|theoretical-shifts|shift-calendar)/,
        { timeout: 20000 },
      );
      loggedIn = true;
    } catch {
      if (attempt === 2) throw new Error(`login: no redirect after 3 attempts (${finalUsername})`);
    }
  }
}
