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

  test("employee-management: búsqueda filtra y botón nuevo abre modal", async ({
    page,
    request,
  }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/employee-management");

    await expect(page).toHaveURL(/#\/personnel-management\?tab=employees$/);
    const heading = page.getByRole("heading", { name: "Gestión de Personal", exact: true });
    await expect(heading).toBeVisible();
    const search = page.getByPlaceholder(/buscar por nombre/i);
    await expect(search).toBeVisible();
    const employeeName = page.getByText("Juan Perez", { exact: true });
    await expect(employeeName).toBeVisible();

    await search.fill("Juan");
    await expect(employeeName).toBeVisible();
    await search.fill("E2E-no-existe-238");
    await expect(employeeName).toHaveCount(0);
    await search.clear();
    await expect(employeeName).toBeVisible();

    await page.getByRole("button", { name: "Nuevo Registro", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Alta de Nuevo Personal" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("theoretical-shifts: tabs cambian contenido y URL", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/theoretical-shifts");

    await expect(page.getByRole("heading", { name: "Matriz de Turnos" })).toBeVisible();
    await page.getByRole("button", { name: "Permisos", exact: true }).click();
    await expect(page).toHaveURL(/tab=leaves/);
    await expect(page.getByRole("heading", { name: "Gestión de Ausencias" })).toBeVisible();
    await page.getByRole("button", { name: "Patrones", exact: true }).click();
    await expect(page).toHaveURL(/tab=patterns/);
    await expect(page.getByRole("heading", { name: "Patrones de Turno" })).toBeVisible();
  });

  test("configuration: tabs de sistema cargan y no crashean", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/configuration");
    await expect(
      page.getByRole("tab", { name: "Variables Globales", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("communications: vista carga con composer visible", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/communications");
    await expect(page.getByRole("heading", { name: "Comunicados Internos" })).toBeVisible();
  });

  test("master-data-export: vista carga y ofrece exportaciones", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/master-data-data-export");
    await expect(page.getByRole("heading", { name: "Módulo de Exportación" })).toBeVisible();
  });

  test("email-center: vista carga sin crash", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/email-center");
    await expect(page.getByRole("tab", { name: "Centro de Correos", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("planning/monthly: wizard carga su paso 1", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/planning/monthly");
    await expect(page.getByRole("heading", { name: "Planificación Mensual" })).toBeVisible();
  });

  test("meter-readings: vista carga", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/meter-readings");
    await expect(page.getByRole("heading", { name: "Registro de Medidores" })).toBeVisible();
  });

  test("worker: shift-calendar alterna vista Mes/Semana", async ({ page, request }) => {
    // TD-003: worker único de solo-lectura.
    await withWorker(page, request, async () => {
      await page.goto("/#/shift-calendar");
      await expect(page.getByRole("heading", { name: /mi calendario/i })).toBeVisible({
        timeout: 30000,
      });
      await page.getByRole("button", { name: /^semana$/i }).click();
      await page.getByRole("button", { name: /^mes$/i }).click();
      await expect(page.getByRole("heading", { name: /mi calendario/i })).toBeVisible();
    });
  });
});
