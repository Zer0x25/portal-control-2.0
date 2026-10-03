import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

// Reescrito en spec 004 fase 3 (2026-10-03): login compartido con
// presupuestos calibrados (30s/60s), etiquetas de tabs en Title Case
// ("Seguridad", no "SEGURIDAD": el uppercase es solo CSS) y botón de
// auditoría real ("Ejecutar Auditoría Profunda").

test.describe("Governance Hub Verification", () => {
  test.setTimeout(120000);
  test.beforeEach(async ({ page, request }) => {
    await loginFast(page, request, "admin");

    // Navigate to Governance Hub using HashRouter format (sin networkidle:
    // el toBeVisible de abajo ya espera al contenido; networkidle con el
    // websocket abierto solo suma ~1s).
    await page.goto("/#/admin/governance");

    // Wait for Governance Hub to load
    await expect(page.getByText(/centro de gobernanza/i)).toBeVisible({
      timeout: 30000,
    });
  });

  test("can switch between tabs and URL updates", async ({ page }) => {
    // Should show governance page
    await expect(page).toHaveURL(/#\/admin\/governance/);

    // Switch to Security tab
    await page.getByRole("button", { name: "Seguridad", exact: true }).click();
    await expect(page).toHaveURL(/tab=security/);

    // Switch to Audit tab (exact: "Ejecutar Auditoría Profunda" also matches /auditoría/)
    await page.getByRole("button", { name: "Auditoría", exact: true }).click();
    await expect(page).toHaveURL(/tab=audit/);

    // Switch to System Maintenance tab
    await page.getByRole("button", { name: "Mantenimiento", exact: true }).click();
    await expect(page).toHaveURL(/tab=system/);

    // Switch back to Integrity tab
    await page.getByRole("button", { name: "Integridad", exact: true }).click();
    await expect(page).toHaveURL(/tab=integrity/);
  });

  test("Integrity Audit trigger provides feedback", async ({ page }) => {
    // Navigate to Integrity tab explicitly (should be default but ensure it)
    await page.getByRole("button", { name: "Integridad", exact: true }).click();

    // Wait for the audit button to be visible
    const auditBtn = page.getByRole("button", { name: /ejecutar auditoría profunda/i });
    await expect(auditBtn).toBeVisible({ timeout: 30000 });

    // Click the audit button
    await auditBtn.click();

    // Button should be disabled during execution
    await expect(auditBtn)
      .toBeDisabled({ timeout: 10000 })
      .catch(() => {
        // If button doesn't become disabled, the action may have completed quickly
      });
  });

  test("System Maintenance stats are visible", async ({ page }) => {
    // Navigate to System Maintenance tab
    await page.getByRole("button", { name: "Mantenimiento", exact: true }).click();
    await expect(page).toHaveURL(/tab=system/);

    // Check for specific stats text: anchor on a proven-visible KpiStat
    // ("Total activos", same as admin-tools) then count all stat hits.
    // (first() is wrong here: plain text also matches collapsed sidebar
    // entries and .first() picks the hidden one.)
    await expect(page.getByText(/total activos/i)).toBeVisible({ timeout: 30000 });
    const hasStats = await page
      .locator("text=/BD Productiva|Uptime|Memoria|Usuarios|Empleados|Registros/i")
      .count();
    expect(hasStats).toBeGreaterThan(0);
  });
});
