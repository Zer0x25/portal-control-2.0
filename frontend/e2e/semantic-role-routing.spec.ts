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
    role: "Supervisor_Elevado",
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
