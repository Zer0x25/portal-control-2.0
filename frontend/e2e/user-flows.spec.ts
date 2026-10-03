import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

// Reescrito en spec 004 fase 3 (2026-10-03): la app usa HashRouter, todas
// las navegaciones van con `/#/...`; el botón es "Registrar Ausencia"
// (abre formulario) y el submit "Registrar"; el calendario del worker se
// titula "Mi Calendario" con vistas "Mes/Semana/Día". El flujo de ausencia
// no hace submit: ensaya apertura, selección de colaborador y llenado,
// y cancela para no ensuciar la BD de dev en cada corrida.
//
// Serial (no parallel): los 2 tests de worker comparten el único slot de
// sesión del rol Usuario (el backend evicta la anterior) y el flujo de
// asistencia muta los records de hoy de EMP001.

// Sin networkidle a propósito: las assertions explícitas (toBeVisible /
// toBeEnabled con timeout) ya gatean readiness, y networkidle con el
// websocket abierto suma ~1s por navegación sin aportar señal.

test.describe.serial("Critical User Flows", () => {
  test.setTimeout(120000);
  test("Attendance Flow: Clock In and Clock Out (Worker)", async ({ page, request }) => {
    // Deterministic reset: delete today's records for the e2e employee via
    // API so the cycle always starts from "fuera" (previous runs leave a
    // closed record that would make punch buttons stale/muted).
    const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:4000/api";
    const todayCL = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
    const adminLogin = await request.post(`${apiBase}/auth/login`, {
      data: {
        username: process.env.E2E_ADMIN_USERNAME || "admin",
        password: process.env.E2E_ADMIN_PASSWORD || "999.666",
      },
    });
    expect(adminLogin.ok()).toBe(true);
    const { token } = await adminLogin.json();
    const authHeaders = { Authorization: `Bearer ${token}` };
    const listRes = await request.get(
      `${apiBase}/records?employeeId=EMP001&desde=${todayCL}&hasta=${todayCL}`,
      { headers: authHeaders },
    );
    expect(listRes.ok()).toBe(true);
    const listBody = await listRes.json();
    const existing = Array.isArray(listBody) ? listBody : (listBody.records ?? listBody.data ?? []);
    for (const rec of existing) {
      const del = await request.delete(`${apiBase}/records/${rec.id}`, {
        headers: authHeaders,
      });
      expect(del.ok()).toBe(true);
    }

    // Login as worker
    await loginFast(page, request, "worker");

    // Navigate to Worker Portal (HashRouter: #/ prefix required)
    await page.goto("/#/worker-portal");
    await expect(page.getByRole("heading", { name: /portal del trabajador/i })).toBeVisible({
      timeout: 30000,
    });
    // Let the daily records settle: buttons enable from server state, and
    // the pre-load default ("fuera") would offer a stale enabled action
    // that the backend rejects (duplicate punch fails silently, no toast).
    // (Sin networkidle: los toBeEnabled de abajo ya esperan al servidor.)

    const startButton = page.getByRole("button", { name: /inicio jornada/i });
    const endButton = page.getByRole("button", { name: /fin jornada/i });
    // Both actions are always offered (one enabled per state): never a vacuous pass
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await expect(endButton).toBeVisible();

    // Full cycle on a clean slate: clock in, then clock out, both succeed
    await expect(startButton).toBeEnabled({ timeout: 30000 });
    await startButton.click();
    await expect(page.getByText(/acción registrada/i)).toBeVisible({ timeout: 30000 });

    await expect(endButton).toBeEnabled({ timeout: 30000 });
    await endButton.click();
    await expect(page.getByText(/acción registrada/i)).toBeVisible({ timeout: 30000 });
  });

  test("Permission Request Flow: Submit Absence (Admin)", async ({ page, request }) => {
    // Login as admin
    await loginFast(page, request, "admin");

    await page.goto("/#/theoretical-shifts?tab=leaves");
    await expect(page.getByText(/gestión de ausencias/i)).toBeVisible({ timeout: 30000 });

    const registrarBtn = page.getByRole("button", { name: /^registrar ausencia$/i });
    await expect(registrarBtn).toBeVisible({ timeout: 30000 });
    await registrarBtn.click();

    // Employee search has no id: it is the input with "Nombre..." placeholder
    const searchInput = page.getByPlaceholder("Nombre...");
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("Juan");
    await page.locator("li", { hasText: "Juan Perez" }).first().click();

    // Leave type select + notes field are visible and fillable
    await expect(page.locator("select").first()).toBeVisible();
    await page.locator("select").first().selectOption("Vacaciones");
    await page.getByPlaceholder("Observaciones...").fill("E2E Test Absence Request");

    // Submit is offered (exact name: the opener button is hidden while open)
    await expect(page.getByRole("button", { name: /^registrar$/i })).toBeVisible();

    // Cancel instead of submitting: keeps the dev DB clean on every run
    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByRole("button", { name: /^registrar ausencia$/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("Shift Verification Flow: View Calendar (Worker)", async ({ page, request }) => {
    // Login as worker
    await loginFast(page, request, "worker");

    await page.goto("/#/shift-calendar");
    await expect(page.getByRole("heading", { name: /mi calendario/i })).toBeVisible({
      timeout: 30000,
    });

    // Verify calendar view buttons (labels: Mes / Semana / Día)
    await expect(page.getByRole("button", { name: /^mes$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /^semana$/i })).toBeVisible();
  });
});
