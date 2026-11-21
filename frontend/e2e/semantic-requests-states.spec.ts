import { expect, test } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

for (const width of [355, 853, 1138]) {
  test(`carga, error y adjunto de solicitudes a ${width}px`, async ({ page, request }) => {
    test.skip(
      process.env.E2E_API_URL !== "http://127.0.0.1:8080/api" ||
        process.env.E2E_BASE_URL !== "http://127.0.0.1:5199",
      "Requiere frontend local y staging aislado",
    );
    await page.setViewportSize({ width, height: 850 });
    await loginFast(page, request, "admin");
    let releaseRequest: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    let calls = 0;
    await page.route("**/api/corrections/stats*", (route) =>
      route.fulfill({ json: { pending: 1, approved: 0, rejected: 0 } }),
    );
    await page.route(/\/api\/corrections(?:\?.*)?$/, async (route) => {
      calls++;
      if (calls === 1) {
        await gate;
        return route.fulfill({ status: 400, json: { message: "Error simulado" } });
      }
      return route.fulfill({
        json: {
          total: 1,
          requests: [
            {
              id: "solicitud-prueba",
              employeeId: "empleado-prueba",
              timeRecordId: "registro-prueba",
              recordField: "entrada",
              originalValue: "2026-11-20T08:00:00Z",
              requestedValue: "2026-11-20T09:00:00Z",
              reason: "Evidencia simulada",
              status: "pending",
              createdAt: "2026-11-20T12:00:00Z",
              attachment: {
                filename: "evidencia-simulada.png",
                mimeType: "image/png",
                data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l+0AAAAASUVORK5CYII=",
              },
            },
          ],
        },
      });
    });
    await page.goto("/#/dashboard-supervisor?tab=employees");
    await expect(page.getByRole("status").filter({ hasText: "Auditando bandeja" })).toBeVisible();
    releaseRequest();
    await expect(page.getByRole("alert")).toContainText("No se pudieron cargar las solicitudes");
    await expect(page.getByText("AUDITADO. SIN PENDIENTES.")).toHaveCount(0);
    const retry = page.getByRole("button", { name: "Reintentar carga", exact: true });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText('"Evidencia simulada"')).toBeVisible();
    const open = page.getByRole("button", { name: "VER EVIDENCIA ADJUNTA" });
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: /Vista: evidencia-simulada.png/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img", { name: "evidencia-simulada.png" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Descargar" })).toHaveAttribute(
      "download",
      "evidencia-simulada.png",
    );
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });
}

test("solicitudes vacías muestran el estado correspondiente", async ({ page, request }) => {
  test.skip(
    process.env.E2E_API_URL !== "http://127.0.0.1:8080/api" ||
      process.env.E2E_BASE_URL !== "http://127.0.0.1:5199",
    "Requiere frontend local y staging aislado",
  );
  await loginFast(page, request, "admin");
  await page.route("**/api/corrections/stats*", (route) =>
    route.fulfill({ json: { pending: 0, approved: 0, rejected: 0 } }),
  );
  await page.route(/\/api\/corrections(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { requests: [], total: 0 } }),
  );
  await page.goto("/#/dashboard-supervisor?tab=employees");
  await expect(page.getByText("AUDITADO. SIN PENDIENTES.")).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
});
