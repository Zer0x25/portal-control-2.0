import { test, expect } from "@playwright/test";

test.describe("Admin tools access control", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/admin/tools");

    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("heading", { name: /control maestro/i })).not.toBeVisible();
  });

  test("admin can login and open admin tools", async ({ page }) => {
    const username = process.env.E2E_ADMIN_USERNAME;
    const password = process.env.E2E_ADMIN_PASSWORD;

    test.skip(
      !username || !password,
      "Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to run admin login E2E.",
    );

    await page.goto("/");
    await page.fill("#username", username!);
    await page.fill("#password", password!);
    await page.getByRole("button", { name: /acceder al portal/i }).click();

    await expect(page).toHaveURL(/(dashboard|time-control|configuration|admin\/tools)/);

    await page.goto("/admin/tools");
    await expect(page).toHaveURL(/\/admin\/tools$/);
    await expect(page.getByRole("heading", { name: /control maestro/i })).toBeVisible();
    await expect(page.getByText(/salud del sistema/i)).toBeVisible();
  });
});
