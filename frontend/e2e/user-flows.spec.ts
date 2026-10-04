import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";
import {
  createWorker,
  disposeWorker,
  getAdminToken,
  loginAs,
  withWorker,
} from "./helpers/worker-factory";

// Reescrito en spec 004 fase 3 (2026-10-03): la app usa HashRouter, todas
// las navegaciones van con `/#/...`; el botón es "Registrar Ausencia"
// (abre formulario) y el submit "Registrar"; el calendario del worker se
// titula "Mi Calendario" con vistas "Mes/Semana/Día". El flujo de ausencia
// no hace submit: ensaya apertura, selección de colaborador y llenado,
// y cancela para no ensuciar la BD de dev en cada corrida.
//
// TD-003: el flujo de asistencia usa worker único de factoría (aislado,
// sin slot compartido ni records de EMP001); los otros dos tests son
// admin o solo-lectura. Ya no se necesita modo serial.

// Sin networkidle a propósito: las assertions explícitas (toBeVisible /
// toBeEnabled con timeout) ya gatean readiness, y networkidle con el
// websocket abierto suma ~1s por navegación sin aportar señal.

test.describe("Critical User Flows", () => {
  test.setTimeout(120000);
  test("Attendance Flow: Clock In and Clock Out (Worker)", async ({ page, request }) => {
    // TD-003: worker único de factoría (empleado+usuario recién creados):
    // el ciclo siempre parte de "fuera" sin depender del seed compartido
    // ni de cleanup de EMP001. Dispose borra records + usuario.
    const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:4000/api";
    const adminLogin = await request.post(`${apiBase}/auth/login`, {
      data: {
        username: process.env.E2E_ADMIN_USERNAME || "admin",
        password: process.env.E2E_ADMIN_PASSWORD || "999.666",
      },
    });
    expect(adminLogin.ok()).toBe(true);
    const { token: adminToken } = await adminLogin.json();
    const worker = await createWorker(request, adminToken);
    try {
      // Login as worker
      worker.token = await loginAs(page, request, worker.username, worker.password);

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
    } finally {
      await disposeWorker(request, await getAdminToken(request), worker);
    }
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
    // TD-003: worker único de solo-lectura.
    await withWorker(page, request, async () => {
      await page.goto("/#/shift-calendar");
      await expect(page.getByRole("heading", { name: /mi calendario/i })).toBeVisible({
        timeout: 30000,
      });

      // Verify calendar view buttons (labels: Mes / Semana / Día)
      await expect(page.getByRole("button", { name: /^mes$/i })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: /^semana$/i })).toBeVisible();
    });
  });
});
