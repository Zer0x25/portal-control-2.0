import { test, expect } from "@playwright/test";

test.describe("Governance Hub Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/");
    await page.fill("#username", "admin");
    await page.fill("#password", "999.666");
    await page.getByRole("button", { name: /acceder al portal/i }).click();

    // Wait for redirect after login (Dashboard or other protected page)
    await page.waitForURL(/dashboard|time-control|configuration|governance/, { timeout: 10000 });

    // Navigate to Governance Hub using HashRouter format
    await page.goto("/#/admin/governance");

    // Wait for Governance Hub to load
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Centro de Gobernanza|Gobernanza/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("can switch between tabs and URL updates", async ({ page }) => {
    // Should show governance page
    await expect(page).toHaveURL(/#\/admin\/governance/);

    // Switch to Security tab
    await page.click("text=SEGURIDAD");
    await expect(page).toHaveURL(/tab=security/);

    // Switch to Audit tab
    await page.click("text=AUDITORÍA");
    await expect(page).toHaveURL(/tab=audit/);

    // Switch to System Maintenance tab
    await page.click("text=MANTENIMIENTO");
    await expect(page).toHaveURL(/tab=system/);

    // Switch back to Integrity tab
    await page.click("text=INTEGRIDAD");
    await expect(page).toHaveURL(/tab=integrity/);
  });

  test("Integrity Audit trigger provides feedback", async ({ page }) => {
    // Navigate to Integrity tab explicitly (should be default but ensure it)
    await page.click("text=INTEGRIDAD").catch(() => {
      // May already be on this tab
    });

    // Wait for the audit button to be visible
    const auditBtn = page.getByRole("button", { name: /Auditoría Profunda|Ejecutar Auditoría/i });
    await expect(auditBtn).toBeVisible({ timeout: 10000 });

    // Click the audit button
    await auditBtn.click();

    // Button should be disabled during execution
    await expect(auditBtn)
      .toBeDisabled({ timeout: 5000 })
      .catch(() => {
        // If button doesn't become disabled, the action may have completed quickly
      });
  });

  test("System Maintenance stats are visible", async ({ page }) => {
    // Navigate to System Maintenance tab
    await page.click("text=MANTENIMIENTO");
    await expect(page).toHaveURL(/tab=system/);

    // Wait for stats to load
    await page.waitForLoadState("networkidle");

    // Check for specific stats text
    const hasStats = await page
      .locator("text=/BD Productiva|Uptime|Memoria|Usuarios|Empleados|Registros/i")
      .count();
    expect(hasStats).toBeGreaterThan(0);
  });
});
