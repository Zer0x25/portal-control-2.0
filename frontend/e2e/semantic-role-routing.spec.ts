import { expect, test } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

test("cuenta de prueba Usuario no accede a las vistas del piloto", async ({ page, request }) => {
  test.skip(
    process.env.E2E_API_URL !== "http://127.0.0.1:8080/api" ||
      process.env.E2E_BASE_URL !== "http://127.0.0.1:5199",
    "Requiere frontend local y staging aislado",
  );
  await loginFast(page, request, "worker");
  for (const route of ["dashboard", "dashboard-supervisor", "logbook"]) {
    await page.goto(`/#/${route}`);
    await expect(page).toHaveURL(/#\/worker-portal/, { timeout: 30000 });
    await expect(page.locator("main")).toBeVisible();
  }
});

for (const entry of [
  { role: "Supervisor", allowed: ["dashboard-supervisor"], fallback: "dashboard-supervisor" },
  {
    role: "Administrador",
    allowed: ["dashboard", "dashboard-supervisor", "logbook"],
    fallback: "dashboard",
  },
  { role: "Reloj_Control", allowed: ["dashboard", "logbook"], fallback: "dashboard" },
  { role: "Fiscalizador", allowed: [], fallback: "time-control" },
]) {
  test(`rutas del piloto para ${entry.role}`, async ({ page, request }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 355, height: 850 });
    const api = process.env.E2E_API_URL;
    test.skip(
      api !== "http://127.0.0.1:8080/api" || process.env.E2E_BASE_URL !== "http://127.0.0.1:5199",
      "Requiere frontend local y staging aislado",
    );
    const adminToken = await loginFast(page, request, "admin");
    const headers = { Authorization: `Bearer ${adminToken}` };
    const username = `qa_sem_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const password = `Qa-Sem-${Date.now().toString(36)}-test`;
    const created = await request.post(`${api}/users`, {
      headers,
      data: { username, password, role: entry.role },
    });
    expect(created.ok(), `crear cuenta temporal: ${created.status()}`).toBeTruthy();
    const user = await created.json();
    let userToken: string | undefined;
    try {
      const updated = await request.put(`${api}/users/${user.id}`, { headers, data: { password } });
      expect(updated.ok(), `habilitar cuenta temporal: ${updated.status()}`).toBeTruthy();
      const login = await request.post(`${api}/auth/login`, { data: { username, password } });
      expect(login.ok(), `autenticar cuenta temporal: ${login.status()}`).toBeTruthy();
      const session = await login.json();
      expect(session.role.replace(/ /g, "_")).toBe(entry.role);
      userToken = session.token;
      await page.addInitScript(
        ({ token, storedUser }) => {
          sessionStorage.setItem("authToken", token);
          sessionStorage.setItem("currentUser", JSON.stringify(storedUser));
        },
        {
          token: session.token,
          storedUser: {
            id: session.userId,
            username: session.username,
            role: entry.role,
            employeeId: session.employeeId ?? null,
            isDeleted: false,
            lastModified: Date.now(),
            syncStatus: "synced",
          },
        },
      );
      for (const route of ["dashboard", "dashboard-supervisor", "logbook"]) {
        await page.goto(`/#/${route}`);
        const expected = entry.allowed.includes(route) ? route : entry.fallback;
        await expect(page).toHaveURL(new RegExp(`#/${expected}(?:[?#]|$)`), { timeout: 30000 });
        await expect(page.locator("main")).toBeVisible({ timeout: 30000 });
        if (entry.allowed.includes(route)) {
          const skip = page.getByRole("link", { name: /saltar al contenido principal/i });
          await skip.focus();
          await page.keyboard.press("Enter");
          await expect(page.locator("main")).toBeFocused();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        }
      }
      if (entry.allowed.includes("logbook")) {
        await page.route(/\/api\/shift-reports\?.*$/, (route) => {
          const url = new URL(route.request().url());
          return url.searchParams.get("status") === "closed"
            ? route.fulfill({ json: { data: [], total: 0, page: 1, totalPages: 0 } })
            : route.continue();
        });
        for (const width of [355, 853, 1138]) {
          await page.setViewportSize({ width, height: 850 });
          await page.goto("/#/dashboard");
          const logbookAction = page.getByRole("button", { name: "Novedades", exact: true });
          await expect(logbookAction).toBeVisible({ timeout: 30000 });
          await logbookAction.focus();
          await page.keyboard.press("Enter");
          await expect(page).toHaveURL(/#\/logbook/);
          const open = page.getByRole("button", { name: "Historial de Turnos" });
          await expect(open).toBeVisible({ timeout: 30000 });
          await open.focus();
          await page.keyboard.press("Enter");
          const dialog = page.getByRole("dialog", { name: /Historial de Reportes/ });
          await expect(dialog).toBeVisible();
          await expect(dialog).toBeFocused();
          await page.keyboard.press("Tab");
          expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
          await page.keyboard.press("Escape");
          await expect(dialog).toBeHidden();
          await expect(open).toBeFocused();
        }
      }
      if (entry.allowed.includes("dashboard-supervisor")) {
        const tabs = [
          ["Resumen Hoy", "dashboard"],
          ["Indicadores", "kpis"],
          ["Analytics", "analytics"],
          ["Empleados", "employees"],
          ["Reportes", "reports"],
          ["Turnos", "shifts"],
        ];
        for (const width of [355, 853, 1138]) {
          await page.setViewportSize({ width, height: 850 });
          await page.goto("/#/dashboard-supervisor");
          const nav = page.getByRole("navigation", { name: "Secciones de supervisión" });
          await expect(nav).toBeVisible({ timeout: 30000 });
          await nav.getByRole("button", { name: tabs[0][0] }).focus();
          for (const [index, [label, id]] of tabs.entries()) {
            const button = nav.getByRole("button", { name: new RegExp(label) });
            if (index > 0) await page.keyboard.press("Tab");
            await expect(button).toBeFocused();
            await page.keyboard.press("Enter");
            await expect(button).toHaveAttribute("aria-pressed", "true");
            await expect(page).toHaveURL(new RegExp(`tab=${id}(?:&|$)`));
            const visible = await button.evaluate((element) => {
              const parent = element.closest("nav")!.getBoundingClientRect();
              const rect = element.getBoundingClientRect();
              return rect.left >= parent.left - 1 && rect.right <= parent.right + 1;
            });
            expect(visible).toBe(true);
          }
          for (const panel of ["Indicadores", "Reportes"]) {
            await nav.getByRole("button", { name: panel }).click();
            const custom = page.getByRole("button", { name: "Personalizado", exact: true });
            await expect(custom).toBeVisible({ timeout: 30000 });
            await custom.focus();
            await page.keyboard.press("Enter");
            await expect(custom).toHaveAttribute("aria-pressed", "true");
            for (const label of ["Inicio", "Término"]) {
              const field = page.getByLabel(label, { exact: true });
              await expect(field).toBeVisible();
              for (
                let i = 0;
                i < 8 && !(await field.evaluate((el) => el === document.activeElement));
                i++
              ) {
                await page.keyboard.press("Tab");
              }
              await expect(field).toBeFocused();
              const fits = await field.evaluate((el) => {
                const box = el.getBoundingClientRect();
                return box.left >= 0 && box.right <= window.innerWidth;
              });
              expect(fits).toBe(true);
            }
            const filters =
              panel === "Indicadores"
                ? ["Tipo de Jornada", "Filtrar por Área", "Especificar Colaborador"]
                : ["Tipo de Jornada", "Ubicación / Área", "Colaborador Específico"];
            for (const label of filters) {
              const field = page.getByRole("combobox", { name: label, exact: true });
              for (
                let i = 0;
                i < 8 && !(await field.evaluate((el) => el === document.activeElement));
                i++
              ) {
                await page.keyboard.press("Tab");
              }
              await expect(field).toBeFocused();
            }
          }
        }
      }
    } finally {
      if (userToken)
        await request
          .post(`${api}/auth/logout`, { headers: { Authorization: `Bearer ${userToken}` } })
          .catch(() => {});
      const deleted = await request.delete(`${api}/users/${user.id}`, { headers });
      expect(deleted.ok(), `eliminar cuenta temporal: ${deleted.status()}`).toBeTruthy();
    }
  });
}
