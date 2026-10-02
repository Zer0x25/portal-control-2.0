import { Page, expect } from "@playwright/test";

export async function login(page: Page, username?: string, password?: string) {
  const finalUsername = username || process.env.E2E_ADMIN_USERNAME || "admin";
  const finalPassword = password || process.env.E2E_ADMIN_PASSWORD || "999.666";

  await page.goto("/");

  // Wait for the page to load and selectors to be available
  await expect(page.locator("#username")).toBeVisible({ timeout: 10000 });

  await page.fill("#username", finalUsername);
  await page.fill("#password", finalPassword);
  await page.getByRole("button", { name: /acceder al portal/i }).click();

  // Wait for login to complete by checking for a common element in logged-in state or URL change
  await expect(page).toHaveURL(
    /(dashboard|time-control|configuration|admin\/tools|worker-portal|theoretical-shifts|shift-calendar)/,
    { timeout: 15000 },
  );
}
