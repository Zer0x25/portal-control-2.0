import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

test.describe("Headless Navigation & Shell Introspection", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/dashboard");
    await expect(page).toHaveURL(/#\/dashboard/, { timeout: 30000 });
    await expect(page.getByText(/sincronizando entorno/i)).not.toBeVisible({ timeout: 15000 });
  });

  test("shell determinista publica landmarks y metadatos de ruta para agentes", async ({ page }) => {
    // 1. App shell root y atributos de estado
    const shell = page.locator('[data-testid="app-shell"]');
    await expect(shell).toBeVisible({ timeout: 15000 });
    await expect(shell).toHaveAttribute("data-current-path", /\/dashboard/);

    // 2. Skip to content link accesible
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute("href", "#main-content");

    // 3. Landmarks semánticos del shell
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });

  test("navegación secuencial headless vía nav-items y sincronización de estado activo", async ({
    page,
  }) => {
    const navRoutes = [
      { slug: "time-control", path: "/time-control" },
      { slug: "theoretical-shifts", path: "/theoretical-shifts" },
      { slug: "configuration", path: "/configuration" },
      { slug: "dashboard", path: "/dashboard" },
    ];

    const shell = page.locator('[data-testid="app-shell"]');

    for (const { slug, path } of navRoutes) {
      const navItem = page.locator(`[data-testid="nav-item-${slug}"]`);
      await expect(navItem).toBeVisible({ timeout: 10000 });

      // Click determinista en el enlace de navegación
      await navItem.click();

      // Verificar actualización de URL y atributo data-current-path en el app-shell
      await expect(page).toHaveURL(new RegExp(path), { timeout: 15000 });
      await expect(shell).toHaveAttribute("data-current-path", new RegExp(path));

      // Verificar indicador de activación data-nav-active
      const activeIndicator = navItem.locator("[data-nav-active]");
      await expect(activeIndicator).toHaveAttribute("data-nav-active", "true");

      // Verificar que el contenido principal no crasheó
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    }
  });

  test("alternancia reactiva de tema claro/oscuro desde la barra lateral", async ({ page }) => {
    const themeBtn = page.locator('[data-testid="theme-toggle-button"]');
    await expect(themeBtn).toBeVisible({ timeout: 10000 });

    // Estado inicial
    const html = page.locator("html");
    const wasDarkInitially = await html.evaluate((el) => el.classList.contains("dark"));

    // Toggle 1
    await themeBtn.click();
    await expect(async () => {
      const isDark = await html.evaluate((el) => el.classList.contains("dark"));
      expect(isDark).toBe(!wasDarkInitially);
    }).toPass({ timeout: 5000 });

    // Toggle 2 (revertir)
    await themeBtn.click();
    await expect(async () => {
      const isDark = await html.evaluate((el) => el.classList.contains("dark"));
      expect(isDark).toBe(wasDarkInitially);
    }).toPass({ timeout: 5000 });
  });

  test("modales del shell: Acerca de, Seguridad y Manual de Usuario abren y cierran sin crash", async ({
    page,
  }) => {
    // 1. Modal Acerca de
    const aboutBtn = page.locator('[data-testid="about-modal-button"]');
    await expect(aboutBtn).toBeVisible({ timeout: 10000 });
    await aboutBtn.click();
    const aboutTitle = page.getByRole("heading", { name: /información del sistema/i });
    await expect(aboutTitle).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await expect(aboutTitle).not.toBeVisible({ timeout: 5000 });

    // 2. Menú de usuario en header
    const userMenuBtn = page.locator('[data-testid="user-menu-button"]');
    await expect(userMenuBtn).toBeVisible({ timeout: 10000 });
    await userMenuBtn.click();
    await expect(page.locator('[data-testid="user-menu-dropdown"]')).toBeVisible({ timeout: 5000 });

    // 3. Modal de Seguridad (Cambio de contraseña)
    const securityBtn = page.locator('[data-testid="security-modal-button"]');
    await expect(securityBtn).toBeVisible();
    await securityBtn.click();
    const passwordHeading = page.getByRole("heading", { name: /cambiar.*contrase/i });
    await expect(passwordHeading).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await expect(passwordHeading).not.toBeVisible({ timeout: 5000 });

    // 4. Modal de Manual de Usuario
    await userMenuBtn.click();
    await expect(page.locator('[data-testid="user-menu-dropdown"]')).toBeVisible({ timeout: 5000 });
    const helpBtn = page.locator('[data-testid="help-modal-button"]');
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();
    const manualTitle = page.getByText(/manual de usuario/i).first();
    await expect(manualTitle).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await expect(manualTitle).not.toBeVisible({ timeout: 5000 });
  });

  test("navegación móvil en viewport 375px: drawer lateral y ausencia de overflow horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });

    // En móvil el sidebar inicia cerrado (-translate-x-full)
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toHaveClass(/translate-x-full/);

    // Botón hamburguesa abre el drawer
    const toggleBtn = page.locator('[data-testid="sidebar-toggle-button"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Click backdrop cierra el drawer
    await toggleBtn.click();
    await expect(sidebar).toHaveClass(/translate-x-full/);

    // Cero desborde horizontal (WCAG 1.4.10 Reflow a 375px)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow, "El viewport móvil de 375px tiene desborde horizontal").toBe(
      false,
    );
  });
});
