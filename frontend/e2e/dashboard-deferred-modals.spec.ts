import { expect, test } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

test.use({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });

test("Dashboard loads secondary modals only on demand and retains the notes draft", async ({
  page,
  request,
}, testInfo) => {
  const scripts: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const adminToken = await loginFast(page, request, "admin");
  const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
  const now = new Date();
  const response = await request.post(`${apiBase}/shift-reports`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      date: now.toISOString().slice(0, 10),
      folio: `E2E-${now.getTime()}`,
      shiftName: "E2E Dashboard",
      responsibleUser: process.env.E2E_ADMIN_USERNAME || "admin",
      startTime: now.toISOString(),
      endTime: now.toISOString(),
      status: "closed",
      logEntries: [],
      supplierEntries: [],
    },
  });
  expect(response.ok(), `create shift report: HTTP ${response.status()}`).toBe(true);
  const createdReport = (await response.json()) as { id: string };
  expect(createdReport.id, "created shift report has no id").toBeTruthy();

  try {
    await page.goto("/#/dashboard");
    const notesButton = page.getByRole("button", { name: "Notas", exact: true });
    await expect(notesButton).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("server-clock")).toBeVisible();
    const initialScripts = [...scripts];
    expect(
      initialScripts.filter((url) =>
        /QuickNotesModal\.container-|ShiftReportModal-|exportToPdf-|\/forms-|\/sanitization-/.test(
          url,
        ),
      ),
    ).toEqual([]);

    await notesButton.click();
    const draft = page.locator("#new-note-content");
    await expect(draft).toBeVisible();
    expect(scripts.some((url) => /QuickNotesModal\.container-/.test(url))).toBe(true);
    await page.getByRole("button", { name: "Fijar Nota" }).click();
    await expect(page.getByText("El contenido es obligatorio.", { exact: true })).toBeVisible();
    await draft.fill("Borrador sin enviar, prueba de rendimiento");
    await page.getByRole("button", { name: "Seleccionar color blue" }).click();
    await page.keyboard.press("Escape");
    await expect(draft).not.toBeVisible();
    await expect(notesButton).toBeFocused();
    await notesButton.click();
    await expect(draft).toHaveValue("Borrador sin enviar, prueba de rendimiento");
    await expect(page.getByRole("button", { name: "Seleccionar color blue" })).toHaveClass(
      /scale-110/,
    );
    await page.keyboard.press("Escape");

    const reports = page.getByRole("region", { name: "Historial de turnos" });
    const report = reports.getByText(/^Folio:/).first();
    await expect(report).toBeVisible();
    await report.dblclick();
    await expect(page.getByRole("button", { name: "Imprimir Reporte" })).toBeVisible();
    expect(scripts.some((url) => /ShiftReportModal-/.test(url))).toBe(true);
    expect(scripts.some((url) => /exportToPdf-/.test(url))).toBe(true);
    const printWindow = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Imprimir Reporte" }).click();
    const popup = await printWindow;
    await expect(popup.locator("body")).toContainText(/Reporte|Bitácora/i);
    await popup.close();
    expect(errors).toEqual([]);
    await testInfo.attach("dashboard-deferred-modals.json", {
      body: JSON.stringify({ initialScripts, allScripts: scripts, errors }, null, 2),
      contentType: "application/json",
    });
  } finally {
    const cleanup = await request.delete(`${apiBase}/shift-reports/${createdReport.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(cleanup.status(), "delete E2E shift report").toBe(204);
  }
});
