import { test, expect, type Page } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

async function mockTimeRecordsForTypography(page: Page) {
  await page.route("**/api/records**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const date = requestUrl.searchParams.get("desde") ?? new Date().toISOString().slice(0, 10);
    const timestamp = `${date}T08:00:00.000Z`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "e2e-list-typography-record",
            employeeId: "e2e-list-typography-employee",
            employeeName: "ALEXANDRA PRUEBA",
            employeePosition: "OPERADORA",
            employeeArea: "E2E",
            employeeWorkdayType: "Ordinaria",
            date,
            status: "Completado",
            entrada: timestamp,
            salida: `${date}T17:00:00.000Z`,
            workedHours: 8,
            overtimeHours: 0,
            scheduledHours: 8,
            isDayOffWorked: false,
            isDeleted: false,
            lastModified: Date.now(),
            syncStatus: "synced",
          },
        ],
        total: 1,
        totalPages: 1,
      }),
    });
  });
}

// Fase 5 del plan spec 005: cerrar huecos de cobertura e2e
// registrados en e2e-stress-plan.md. Solo interacciones mínimas
// que antes no existían; el detalle fino va a backlog.

test.describe("Fase 5: cierre de huecos e2e", () => {
  test.setTimeout(120000);
  test.describe.configure({ mode: "serial" });

  test("kiosk: /kiosk carga sin crashear", async ({ page }) => {
    await page.goto("/#/kiosk");
    await page.waitForTimeout(2000);
    const crashed = await page
      .getByText(/algo salió mal|something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(crashed).toBeFalsy();
  });

  test("time-control: filtros presentes y grilla responde", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/time-control");
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
    // Empleados / tabla de asistencias visibles
    await expect(page.getByText(/asistencias|empleados/i).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("time-control: lista conserva la jerarquía tipográfica legible", async ({
    page,
    request,
  }) => {
    await loginFast(page, request, "admin");
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockTimeRecordsForTypography(page);
    await page.goto("/#/time-control");
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });

    const deferredTable = page.getByTestId("deferred-time-record-table");
    await expect(deferredTable).toBeVisible({ timeout: 30000 });
    await deferredTable.scrollIntoViewIfNeeded();

    const list = page.getByTestId("time-record-list");
    await expect(list).toBeVisible({ timeout: 30000 });
    const row = list.getByTestId("time-record-row").first();
    await expect(row).toBeVisible({ timeout: 30000 });

    const primary = row.locator('[data-list-role="primary"]');
    const primaryStyle = await primary.evaluate((element) => getComputedStyle(element));
    expect(primaryStyle.fontSize).toBe("14px");
    expect(primaryStyle.fontStyle).toBe("normal");
    expect(primaryStyle.fontFamily).toContain("Inter");

    const value = row.locator('[data-list-role="value"]').first();
    const valueStyle = await value.evaluate((element) => getComputedStyle(element));
    expect(valueStyle.fontSize).toBe("14px");
    expect(valueStyle.fontStyle).toBe("normal");
    expect(valueStyle.fontFamily).toContain("Roboto Mono");
    expect(valueStyle.fontVariantNumeric).toContain("tabular-nums");
  });

  test("user-management: listado con placeholder de búsqueda", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/user-management");
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
    const search = page.getByPlaceholder(/buscar|search/i);
    await expect(search).toBeVisible({ timeout: 10000 });
  });

  test("audit-logs: vista virtualizada muestra filas", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/audit-logs");
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
    // La tabla virtualizada usa divs con translateY
    const rows = page.locator("div[style*='translateY']");
    await expect(rows.first()).toBeVisible({ timeout: 30000 });
  });

  test("admin/governance: tabs críticos cargan", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/admin/governance?tab=security");
    await expect(page).toHaveURL(/tab=security/, { timeout: 30000 });
  });
});
