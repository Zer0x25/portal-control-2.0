import { expect, test } from "@playwright/test";
import { STORAGE_KEYS } from "../src/constants";
import type { ShiftReport } from "../src/types";
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
  const now = new Date();
  const report: ShiftReport = {
    id: "e2e-dashboard-report",
    folio: `E2E-${now.getTime()}`,
    date: now.toISOString().slice(0, 10),
    shiftName: "E2E Dashboard",
    responsibleUser: "admin",
    startTime: now.toISOString(),
    endTime: now.toISOString(),
    status: "closed",
    logEntries: [],
    supplierEntries: [],
    reportCreatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastModified: now.getTime(),
    syncStatus: "synced",
    isDeleted: false,
  };

  // This test needs a dashboard report, not the login handover workflow. Keep
  // that automation disabled in this browser and serve an isolated fixture so
  // a failed retry cannot leave a closed report in staging for later tests.
  await page.addInitScript(
    (key) => sessionStorage.setItem(key, "true"),
    STORAGE_KEYS.SHIFT_HANDOVER_VIEWED,
  );
  await loginFast(page, request, "admin");
  await page.route("**/api/shift-reports**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [report], total: 1, page: 1, totalPages: 1 }),
    });
  });

  await page.goto("/#/dashboard");
  const notesButton = page.getByRole("button", { name: "Notas", exact: true });
  await expect(notesButton).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("server-clock")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relevo de Turno" })).toHaveCount(0);
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
  const reportRow = reports.getByText(/^Folio:/).first();
  await expect(reportRow).toBeVisible();
  await reportRow.dblclick();
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
});
