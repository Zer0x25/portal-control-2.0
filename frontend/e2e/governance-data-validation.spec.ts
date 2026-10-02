import { test, expect } from "@playwright/test";

/**
 * Simplified Data Validation Tests for Governance Hub
 *
 * Strategy: Verify that key numbers from the API appear in the UI
 * This avoids brittle CSS selectors and focuses on data presence.
 */

test.describe("Governance Hub - Simplified Data Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/");
    await page.fill("#username", "admin");
    await page.fill("#password", "999.666");
    await page.getByRole("button", { name: /acceder al portal/i }).click();

    // Wait for Dashboard to load first
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/Hola, admin/i)).toBeVisible({ timeout: 10000 });
  });

  test("Integrity Tab - key metrics are visible", async ({ page }) => {
    let apiData: any = null;
    page.on("response", async (response) => {
      if (response.url().includes("/api/audit-logs/integrity-status")) {
        apiData = await response.json();
        console.log("DEBUG: Intercepted Integrity API:", apiData);
      }
    });

    // Explicit navigation to the hash route
    await page.goto("/#/admin/governance?tab=integrity");
    await page.waitForURL(/tab=integrity/);
    await page.waitForLoadState("networkidle");

    // Wait for content to appear (even if it takes a bit)
    await expect(page.getByText(/INTEGRA|DEGRADADA/)).toBeVisible({ timeout: 10000 });

    if (apiData) {
      const expectedStatus = apiData.status === "ok" ? "INTEGRA" : "DEGRADADA";
      await expect(page.getByText(expectedStatus).first()).toBeVisible();

      if (apiData.lastCheckedCount > 0) {
        await expect(
          page.getByText(apiData.lastCheckedCount.toLocaleString()).first(),
        ).toBeVisible();
      }
    }
  });

  test("Security Tab - MFA and alerts are visible", async ({ page }) => {
    let apiData: any = null;
    page.on("response", async (response) => {
      if (response.url().includes("/api/admin/security-insights")) {
        const json = await response.json();
        apiData = json.data?.stats;
        console.log("DEBUG: Intercepted Security API:", apiData);
      }
    });

    await page.goto("/#/admin/governance?tab=security");
    await page.waitForURL(/tab=security/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/Vigilancia & Riesgos/i)).toBeVisible({ timeout: 10000 });

    if (apiData) {
      const mfaPercent = `${apiData.mfaAdoption.toFixed(1)}%`;
      await expect(page.getByText(mfaPercent)).toBeVisible();
      await expect(page.getByText(apiData.criticalAlertsCount.toString()).first()).toBeVisible();
    }
  });

  test("System Tab - main statistics are visible", async ({ page }) => {
    let apiData: any = null;
    page.on("response", async (response) => {
      if (response.url().includes("/api/admin/stats")) {
        const json = await response.json();
        apiData = json.data;
        console.log("DEBUG: Intercepted System Stats API:", apiData);
      }
    });

    await page.goto("/#/admin/governance?tab=system");
    await page.waitForURL(/tab=system/);
    await page.waitForLoadState("networkidle");

    // Wait for the stats section to actually have content
    await expect(page.getByText(/Usuarios/i)).toBeVisible({ timeout: 10000 });

    if (apiData) {
      // The component uses the new field names (usersCount, etc) OR legacy if we want to check both
      const uCount = (apiData.usersCount ?? apiData.totalUsers).toString();
      const eCount = (apiData.employeesCount ?? apiData.totalEmployees).toString();

      console.log(`Checking for UI count: Users=${uCount}, Employees=${eCount}`);

      await expect(page.getByText(uCount).first()).toBeVisible();
      await expect(page.getByText(eCount).first()).toBeVisible();
    }
  });

  test("Audit Tab - some logs are displayed", async ({ page }) => {
    await page.goto("/#/admin/governance?tab=audit");
    await page.waitForURL(/tab=audit/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/Bitácora de Eventos/i)).toBeVisible({ timeout: 10000 });

    // Verify that the table has rows (not including header)
    const rowCount = await page.locator("table tbody tr").count();
    console.log(`DEBUG: Found ${rowCount} audit log rows in UI`);
    expect(rowCount).toBeGreaterThan(0);
  });
});
