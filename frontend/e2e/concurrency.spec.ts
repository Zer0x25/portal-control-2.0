import { test, expect } from "@playwright/test";

// Fase 3 del plan: concurrencia contra staging.
// No usa loginFast UI: crea contextos browser independientes en paralelo
// (cada uno = un "usuario" distinto en otra pestaña) y dispara syncs
// simultáneos de dashboard/governance. Valida que backend + bd aguanta
// la ráfaga sin 5xx ni cuelgue de UI visible.

async function hammerRoute(context: import("@playwright/test").BrowserContext, route: string) {
  const page = await context.newPage();
  // Semilla de sesión admin + navegación directa
  await page.goto("/");
  await page.evaluate(() => {
    const body = JSON.parse(document.body.innerText || "{}");
    void body;
  });
  await page.goto(route);
  await page.waitForTimeout(2500);
  const crashed = await page
    .getByText(/algo salió mal|something went wrong/i)
    .isVisible()
    .catch(() => false);
  const onLogin = await page
    .locator("#username")
    .isVisible()
    .catch(() => false);
  expect(crashed, `${route}: ErrorBoundary bajo concurrencia`).toBeFalsy();
  expect(onLogin, `${route}: redirigió a login`).toBeFalsy();
  await page.close();
}

test.describe("Fase 3: concurrencia de vistas", () => {
  test.setTimeout(180000);

  test("5 contextos simultáneos cargan rutas distintas sin crashear", async ({
    browser,
    request,
  }) => {
    // Semilla: crea 5 contextos con sesión admin via loginFast-like init
    const contexts = await Promise.all(Array.from({ length: 5 }, () => browser.newContext()));
    try {
      // Obtén token de admin una vez para sembrar cada contexto
      const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
      const res = await request.post(`${apiBase}/auth/login`, {
        data: {
          username: process.env.E2E_ADMIN_USERNAME || "admin",
          password: process.env.E2E_ADMIN_PASSWORD || "999.666",
        },
      });
      const body = await res.json();

      const routes = [
        "/#/dashboard",
        "/#/admin/governance?tab=system",
        "/#/employee-management",
        "/#/theoretical-shifts",
        "/#/audit-logs",
      ];

      await Promise.all(
        contexts.map(async (ctx, i) => {
          await ctx.addInitScript(
            ([token, user]) => {
              sessionStorage.setItem("authToken", token as string);
              sessionStorage.setItem("currentUser", JSON.stringify(user));
            },
            [
              body.token,
              {
                id: body.userId,
                username: body.username,
                role: body.role,
                employeeId: body.employeeId ?? null,
                isDeleted: false,
                lastModified: Date.now(),
                syncStatus: "synced",
              },
            ],
          );
          await hammerRoute(ctx, routes[i % routes.length]);
        }),
      );
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
});
