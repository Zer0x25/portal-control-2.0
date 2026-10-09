import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { loginFast } from "./helpers/auth-helper";
import { withWorker } from "./helpers/worker-factory";

// Spec 005 fase 2 + TD-001: accesibilidad con axe-core sobre los flujos
// críticos, en tema claro y oscuro. Gatea violaciones críticas y serias
// (TD-001 llevó el contraste a 0 serious en 3 páginas × 2 temas, 2026-10-04).
// Moderadas (landmarks/region/heading-order) quedan como backlog en consola.

async function expectNoBlockingA11y(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze();
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
});
