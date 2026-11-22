import { expect, test } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

for (const width of [355, 853, 1138]) {
  test(`solicitudes conservan los datos y permiten reintentar a ${width}px`, async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.E2E_API_URL !== "http://127.0.0.1:8080/api" ||
        process.env.E2E_BASE_URL !== "http://127.0.0.1:5199",
      "Requiere frontend local y staging aislado",
    );
    await page.setViewportSize({ width, height: 850 });
    await loginFast(page, request, "admin");
    const fixture = (index: number) => ({
      id: `solicitud-${index}`,
      employeeId: "empleado-prueba",
      timeRecordId: `registro-${index}`,
      recordField: "entrada",
      originalValue: "2026-11-20T08:00:00Z",
      requestedValue: "2026-11-20T09:00:00Z",
      reason: `Solicitud número ${index}`,
      status: "pending",
      createdAt: "2026-11-20T12:00:00Z",
    });
    let nextPageCalls = 0;
    await page.route("**/api/corrections/stats*", (route) =>
      route.fulfill({ json: { pending: 31, approved: 0, rejected: 0 } }),
    );
    await page.route(/\/api\/corrections(?:\?.*)?$/, (route) => {
      const offset = Number(new URL(route.request().url()).searchParams.get("offset") || 0);
      if (offset === 0)
        return route.fulfill({
          json: { requests: Array.from({ length: 30 }, (_, i) => fixture(i)), total: 31 },
        });
      nextPageCalls += 1;
      return nextPageCalls === 1
        ? route.fulfill({ status: 400, json: { message: "Error de prueba" } })
        : route.fulfill({ json: { requests: [fixture(30)], total: 31 } });
    });
    await page.goto("/#/dashboard-supervisor?tab=employees");
    const first = page.getByText('"Solicitud número 0"');
    await expect(first).toBeAttached({ timeout: 30000 });
    const loadMore = page.getByRole("button", { name: "Cargar más solicitudes" });
    for (
      let i = 0;
      i < 150 && !(await loadMore.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(loadMore).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toContainText("No se pudieron cargar más solicitudes");
    await expect(first).toBeAttached();
    const retry = page.getByRole("button", { name: "Reintentar carga adicional" });
    for (
      let i = 0;
      i < 150 && !(await retry.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(retry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText('"Solicitud número 30"')).toBeAttached();
    await expect(loadMore).toHaveCount(0);
    expect(nextPageCalls).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
