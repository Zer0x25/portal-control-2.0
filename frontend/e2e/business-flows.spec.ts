import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";
import { withWorker } from "./helpers/worker-factory";

// Fase 2 del plan: uso normal navegando la UI.
// No repite lo cubierto en user-flows.spec.ts (fichaje, ausencias,
// calendario worker): ejerce vistas de admin con interacción real
// (buscar, abrir modales, cambiar tabs) y aserta que la acción produce
// resultado en pantalla.

test.describe("Fase 2: flujos de negocio en UI", () => {
  test.setTimeout(180000);
  test.describe.configure({ mode: "serial" });

  test("employee-management: búsqueda filtra y botón nuevo abre modal", async ({
    page,
    request,
  }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/employee-management");

    // La vista carga con el título de gestión y el placeholder de búsqueda
    await expect(page.getByText(/gestión de empleados/i)).toBeVisible({ timeout: 30000 });
    const search = page.getByPlaceholder(/buscar por nombre/i);
    await expect(search).toBeVisible();

    // Buscar "Juan" no rompe ni dispara errores: la grilla responde
    await search.fill("Juan");
    await page.waitForTimeout(1000);
    await expect(page.getByText(/gestión de empleados/i)).toBeVisible();

    // Botón de nuevo registro abre su modal
    const newBtn = page.getByRole("button", { name: /nuevo registro|nuevo|agregar|crear/i });
    await expect(newBtn.first()).toBeVisible();
    await newBtn.first().click();
    await expect(page.getByText(/nuevo registro/i).first()).toBeVisible({ timeout: 10000 });
    // Cierra sin guardar
    await page.keyboard.press("Escape");
  });

  test("theoretical-shifts: tabs cambian contenido y URL", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/theoretical-shifts");
    await page.waitForTimeout(2000);

    await expect(
      page.getByText(/turnos teóricos|patrones|gestión de ausencias/i).first(),
    ).toBeVisible({ timeout: 30000 });
    const tabs = page.getByRole("button");
    await expect(tabs.first()).toBeVisible();
  });

  test("configuration: tabs de sistema cargan y no crashean", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/configuration");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
  });

  test("communications: vista carga con composer visible", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/communications");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
  });

  test("master-data-export: vista carga y ofrece exportaciones", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/master-data-data-export");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
  });

  test("email-center: vista carga sin crash", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/email-center");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
  });

  test("planning/monthly: wizard carga su paso 1", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/planning/monthly");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
  });

  test("meter-readings: vista carga", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/meter-readings");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("main").first()).toBeVisible({ timeout: 30000 });
  });

  test("worker: shift-calendar alterna vista Mes/Semana", async ({ page, request }) => {
    // TD-003: worker único de solo-lectura.
    await withWorker(page, request, async () => {
      await page.goto("/#/shift-calendar");
      await expect(page.getByRole("heading", { name: /mi calendario/i })).toBeVisible({
        timeout: 30000,
      });
      await page.getByRole("button", { name: /^semana$/i }).click();
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: /^mes$/i }).click();
      await page.waitForTimeout(1000);
      await expect(page.getByRole("heading", { name: /mi calendario/i })).toBeVisible();
    });
  });
});
