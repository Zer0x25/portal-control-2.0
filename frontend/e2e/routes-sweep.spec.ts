import { test, expect, type Page } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

// Fase 1 del plan e2e/stress: barrido de rutas contra staging.
// Cada ruta se visita y se aserta: (a) no redirige al login,
// (b) no cae en ErrorBoundary, (c) no emite pageerror (React crashea).

const ADMIN_ROUTES: string[] = [
  "/#/dashboard",
  "/#/dashboard-supervisor",
  "/#/time-control",
  "/#/logbook",
  "/#/meter-readings",
  "/#/configuration",
  "/#/user-management",
  "/#/employee-management",
  "/#/personnel-management",
  "/#/theoretical-shifts",
  "/#/shift-calendar",
  "/#/communications",
  "/#/email-center",
  "/#/audit-logs",
  "/#/master-data-data-export",
  "/#/planning/monthly",
  "/#/admin/governance",
  "/#/admin/tools",
];

const WORKER_ROUTES: string[] = ["/#/worker-portal", "/#/shift-calendar", "/#/communications"];

async function expectRouteHealthy(page: Page, route: string) {
  let pageerror = "";
  const onError = (err: Error) => {
    pageerror = String(err).slice(0, 200);
  };
  page.on("pageerror", onError);
  await page.goto(route);
  await page.waitForTimeout(2000);

  const redirectedToLogin = await page
    .locator("#username")
    .isVisible()
    .catch(() => false);
  const crashed = await page
    .getByText(/algo salió mal|something went wrong/i)
    .isVisible()
    .catch(() => false);

  page.off("pageerror", onError);
  expect(redirectedToLogin, `${route}: redirigió a login`).toBeFalsy();
  expect(crashed, `${route}: cayó en ErrorBoundary`).toBeFalsy();
  expect(pageerror, `${route}: pageerror ${pageerror}`).toBe("");
}

test.describe("Barrido de rutas por rol", () => {
  test.setTimeout(300000);
  test.describe.configure({ mode: "serial" });

  test("admin recorre sus rutas", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    for (const r of ADMIN_ROUTES) await expectRouteHealthy(page, r);
  });

  test("worker recorre sus rutas", async ({ page, request }) => {
    await loginFast(page, request, "worker");
    for (const r of WORKER_ROUTES) await expectRouteHealthy(page, r);
  });
});
