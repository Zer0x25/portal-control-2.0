import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

// Reescrito en spec 004 fase 3 (2026-10-03): login compartido con
// presupuestos calibrados; el saludo del dashboard está partido en dos
// nodos (`Hola,` + `<span>nombre</span>`), así que se aserta por rol
// heading (nombre accesible completo) en vez de getByText; el tab de
// auditoría se titula "Visor de Auditoría" (no "Bitácora de Eventos").

/**
 * Simplified Data Validation Tests for Governance Hub
 *
 * Strategy: Verify that key numbers from the API appear in the UI
 * This avoids brittle CSS selectors and focuses on data presence.
 */

test.describe("Governance Hub - Simplified Data Validation", () => {
  test.setTimeout(120000);
  test.beforeEach(async ({ page, request }) => {
    // loginFast seeds an authenticated session; no greeting assertion
    // here (dashboard header varies by role/flag).
    await loginFast(page, request, "admin");
  });

  test("Integrity Tab - key metrics are visible", async ({ page }) => {
    let apiData: { status?: string; lastCheckedCount?: number } | null = null;
    page.on("response", async (response) => {
      if (response.url().includes("/api/audit-logs/integrity-status")) {
        const raw = await response.json();
        apiData = raw.data ?? raw;
      }
    });

    // Explicit navigation to the hash route
    await page.goto("/#/admin/governance?tab=integrity");
    await expect(page).toHaveURL(/tab=integrity/, { timeout: 30000 });

    // Wait for content to appear (even if it takes a bit)
    await expect(page.getByText(/INTEGRA|DEGRADADA/)).toBeVisible({ timeout: 30000 });

    if (apiData) {
      const expectedStatus = apiData.status === "ok" ? "INTEGRA" : "DEGRADADA";
      await expect(page.getByText(expectedStatus).first()).toBeVisible();

      if (apiData.lastCheckedCount && apiData.lastCheckedCount > 0) {
        await expect(
          page.getByText(apiData.lastCheckedCount.toLocaleString()).first(),
        ).toBeVisible();
      }
    }
  });

  test("Security Tab - MFA and alerts are visible", async ({ page }) => {
    let apiData: { mfaAdoption?: number; criticalAlertsCount?: number } | null = null;
    page.on("response", async (response) => {
      if (response.url().includes("/api/admin/security-insights")) {
        const json = await response.json();
        apiData = json.data?.stats;
      }
    });

    await page.goto("/#/admin/governance?tab=security");
    await expect(page).toHaveURL(/tab=security/, { timeout: 30000 });

    await expect(page.getByText(/Vigilancia & Riesgos/i)).toBeVisible({ timeout: 30000 });

    if (apiData?.mfaAdoption !== undefined) {
      const mfaPercent = `${apiData.mfaAdoption.toFixed(1)}%`;
      await expect(page.getByText(mfaPercent)).toBeVisible();
      await expect(
        page.getByText(apiData.criticalAlertsCount?.toString() ?? "0").first(),
      ).toBeVisible();
    }
  });

  test("System Tab - main statistics are visible", async ({ page }) => {
    let apiData: { usersCount?: number; employeesCount?: number } | null = null;
    page.on("response", async (response) => {
      if (response.url().includes("/api/admin/stats")) {
        const json = await response.json();
        apiData = json.data;
      }
    });

    await page.goto("/#/admin/governance?tab=system");
    await expect(page).toHaveURL(/tab=system/, { timeout: 30000 });

    // Wait for the stats section to actually have content (KpiCard title
    // is a heading; plain text also matches a collapsed sidebar entry)
    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible({ timeout: 30000 });

    if (apiData) {
      const uCount = (apiData.usersCount ?? 0).toString();
      const eCount = (apiData.employeesCount ?? 0).toString();

      await expect(page.getByText(uCount).first()).toBeVisible();
      await expect(page.getByText(eCount).first()).toBeVisible();
    }
  });

  test("Audit Tab - some logs are displayed", async ({ page }) => {
    await page.goto("/#/admin/governance?tab=audit");
    await expect(page).toHaveURL(/tab=audit/, { timeout: 30000 });

    await expect(page.getByText(/Visor de Auditoría/i)).toBeVisible({ timeout: 30000 });

    // Rows are absolutely-positioned virtualized divs, not <tr>s (the only
    // <tr> is the header). Audit activity (logins included) guarantees rows.
    const rows = page.locator("div[style*='translateY']");
    await expect(rows.first()).toBeVisible({ timeout: 30000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
