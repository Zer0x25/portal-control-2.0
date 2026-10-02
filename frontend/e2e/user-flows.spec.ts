import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth-helper";

test.describe("Critical User Flows", () => {
  test("Attendance Flow: Clock In and Clock Out (Worker)", async ({ page }) => {
    // Login as worker
    await login(page, "juan.perez", "123456");

    // Navigate to Worker Portal
    await page.goto("/worker-portal");
    await expect(page.getByRole("heading", { name: /portal del trabajador/i })).toBeVisible();

    const startButton = page.getByRole("button", { name: /inicio jornada/i });
    const endButton = page.getByRole("button", { name: /fin jornada/i });

    // Logical branching based on current state
    if (await startButton.isEnabled()) {
      await startButton.click();
      await expect(page.getByText(/Acción registrada/i)).toBeVisible();
    } else if (await endButton.isEnabled()) {
      await endButton.click();
      await expect(page.getByText(/Acción registrada/i)).toBeVisible();
    }
  });

  test("Permission Request Flow: Submit Absence (Admin)", async ({ page }) => {
    // Login as admin
    await login(page, "admin", "999.666");

    await page.goto("/theoretical-shifts");

    // Scroll to LeaveManager section if needed
    const registrarBtn = page.getByRole("button", { name: /registrar ausencia/i });
    await expect(registrarBtn).toBeVisible({ timeout: 10000 });
    await registrarBtn.click();

    // Fill the form
    await page.fill("#employee-search", "Juan");
    await page.locator("li:has-text('Juan Perez')").click();

    // Verify form fields are visible
    await expect(page.locator("select")).toBeVisible();
    await page.fill("textarea", "E2E Test Absence Request");

    await expect(page.getByRole("button", { name: /confirmar registro/i })).toBeVisible();
  });

  test("Shift Verification Flow: View Calendar (Worker)", async ({ page }) => {
    // Login as worker
    await login(page, "juan.perez", "123456");

    await page.goto("/shift-calendar");
    await expect(
      page
        .getByRole("heading", { name: /Mi Calendario/i })
        .or(page.getByRole("heading", { name: /Calendario de Turnos/i })),
    ).toBeVisible();

    // Verify calendar view buttons
    await expect(page.getByRole("button", { name: /^mes$/i })).toBeVisible();
  });
});
