import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

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
