import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { loginFast } from "./helpers/auth-helper";
import { withWorker } from "./helpers/worker-factory";

// Spec 005 fase 2 + TD-001: accesibilidad con axe-core sobre los flujos
// críticos, en tema claro y oscuro. Gatea violaciones críticas y serias
// (TD-001 llevó el contraste a 0 serious en 3 páginas × 2 temas, 2026-10-04).
// Moderadas (landmarks/region/heading-order) quedan como backlog en consola.

async function expectNoBlockingA11y(
  page: import("@playwright/test").Page,
  label: string,
  include?: string,
) {
  const builder = new AxeBuilder({ page });
  // Spec 036 AC6: la tabla de reportes se audita como subárbol para no
  // mezclar deuda de a11y preexistente del resto de la pestaña.
  if (include) builder.include(include);
  const results = await builder.analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  const backlog = results.violations.filter(
    (v) => v.impact !== "critical" && v.impact !== "serious",
  );
  if (backlog.length > 0) {
    console.log(`[A11Y-${label}] backlog:`);
    for (const v of backlog)
      console.log(`  - ${v.id} (${v.impact}): ${v.help} (${v.nodes.length} nodos)`);
  }
  if (blocking.length > 0) {
    console.log(
      `[A11Y-${label}] blocking:`,
      JSON.stringify(
        blocking.map((b) => ({
          id: b.id,
          impact: b.impact,
          nodes: b.nodes.map((n) => ({
            html: n.html,
            target: n.target,
            failureSummary: n.failureSummary,
          })),
        })),
        null,
        2,
      ),
    );
  }
  expect(blocking.map((v) => `${v.id} [${v.impact}]: ${v.nodes.length} nodos\n${v.help}`)).toEqual(
    [],
  );
}

async function gotoDark(page: import("@playwright/test").Page) {
  // El tema "system" (default sin preferencia guardada) resuelve por media
  // query al cargar: setearla antes de navegar basta para forzar dark.
  await page.emulateMedia({ colorScheme: "dark" });
}

async function openReportsTable(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
) {
  await loginFast(page, request, "admin");
  await page.goto("/#/dashboard-supervisor?tab=reports");

  const generate = page.getByRole("button", { name: /generar reporte/i });
  await expect(generate).toBeVisible({ timeout: 30000 });
  await generate.click();

  const grid = page.getByRole("grid", {
    name: /resumen de reporte por empleado|reporte diario del empleado/i,
  });
  await expect(grid).toBeVisible({ timeout: 60000 });
  await page.waitForTimeout(1500); // settle de animaciones y celdas lazy
  return grid;
}

test.describe("Accesibilidad axe-core", () => {
  test.setTimeout(60000);

  test("login light sin violaciones bloqueantes", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2500); // setlean animaciones de entrada
    await expectNoBlockingA11y(page, "login-light");
  });

  test("login dark sin violaciones bloqueantes", async ({ page }) => {
    await gotoDark(page);
    await page.goto("/");
    await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2500);
    await expectNoBlockingA11y(page, "login-dark");
  });

  test("dashboard admin light sin violaciones bloqueantes", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/dashboard");
    await expect(page).toHaveURL(/#\/dashboard/, { timeout: 30000 });
    await page.waitForTimeout(3000); // dejar que settleten widgets lazy
    await expectNoBlockingA11y(page, "dashboard-light");
  });

  test("dashboard admin dark sin violaciones bloqueantes", async ({ page, request }) => {
    await gotoDark(page);
    await loginFast(page, request, "admin");
    await page.goto("/#/dashboard");
    await expect(page).toHaveURL(/#\/dashboard/, { timeout: 30000 });
    await page.waitForTimeout(3000);
    await expectNoBlockingA11y(page, "dashboard-dark");
  });

  test("planificador (calendario de turnos) light sin violaciones bloqueantes", async ({
    page,
    request,
  }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/shift-calendar");
    await expect(page).toHaveURL(/#\/shift-calendar/, { timeout: 30000 });
    await page.waitForTimeout(3000); // setlean el calendario lazy
    await expectNoBlockingA11y(page, "planificador-light");
  });

  test("planificador (calendario de turnos) dark sin violaciones bloqueantes", async ({
    page,
    request,
  }) => {
    await gotoDark(page);
    await loginFast(page, request, "admin");
    await page.goto("/#/shift-calendar");
    await expect(page).toHaveURL(/#\/shift-calendar/, { timeout: 30000 });
    await page.waitForTimeout(3000);
    await expectNoBlockingA11y(page, "planificador-dark");
  });

  test("worker portal light sin violaciones bloqueantes", async ({ page, request }) => {
    await withWorker(page, request, async () => {
      await page.goto("/#/worker-portal");
      await expect(page.getByRole("heading", { name: /portal del trabajador/i })).toBeVisible({
        timeout: 30000,
      });
      await page.waitForTimeout(2000); // setlean animaciones de entrada
      await expectNoBlockingA11y(page, "worker-light");
    });
  });

  test("worker portal dark sin violaciones bloqueantes", async ({ page, request }) => {
    await gotoDark(page);
    await withWorker(page, request, async () => {
      await page.goto("/#/worker-portal");
      await expect(page.getByRole("heading", { name: /portal del trabajador/i })).toBeVisible({
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
      await expectNoBlockingA11y(page, "worker-dark");
    });
  });

  test("tabla de reportes light sin violaciones bloqueantes", async ({ page, request }) => {
    await openReportsTable(page, request);
    await expectNoBlockingA11y(page, "reports-table-light", '[role="grid"]');
  });

  test("tabla de reportes dark sin violaciones bloqueantes", async ({ page, request }) => {
    await gotoDark(page);
    await openReportsTable(page, request);
    await expectNoBlockingA11y(page, "reports-table-dark", '[role="grid"]');
  });
});
