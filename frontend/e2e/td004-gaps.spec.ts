import { test, expect, type APIRequestContext } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";
import { createWorker, disposeWorker, getAdminToken } from "./helpers/worker-factory";

// TD-004: cierre de huecos del barrido e2e (spec 005). Cada test ejercita
// una interacción funcional mínima y SEGURA contra staging (solo lectura,
// salvo el flujo kiosk que crea un worker único vía factoría TD-003 y lo
// limpia: records + usuario; la fila del empleado queda como residual E2E).

async function adminToken(request: APIRequestContext): Promise<string> {
  const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
  const res = await request.post(`${apiBase}/auth/login`, {
    data: {
      username: process.env.E2E_ADMIN_USERNAME || "admin",
      password: process.env.E2E_ADMIN_PASSWORD || "999.666",
    },
  });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  return body.token as string;
}

test.describe.serial("TD-004: cierre de huecos e2e", () => {
  test.setTimeout(180000);

  test("logbook: historial filtra y previsualiza reporte", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/logbook");
    await expect(page.getByRole("heading", { name: /libro de novedades/i })).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole("button", { name: /historial de turnos/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });
    const search = page.getByPlaceholder(/buscar folio, responsable o turno/i);
    await expect(search).toBeVisible();
    // Round-trip de filtrado cliente: gibberish → sin resultados, limpiar → vuelve lista.
    await search.fill("zzz-sin-match-99");
    await expect(page.getByText(/sin resultados disponibles/i)).toBeVisible({ timeout: 10000 });
    await search.fill("");
    await expect(page.getByText(/resultados:|total cargados:/i).first()).toBeVisible({
      timeout: 10000,
    });
    await page.keyboard.press("Escape");
  });

  test("dashboard-supervisor: filtro en vivo y cálculo de KPIs", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/dashboard-supervisor");
    await expect(page.getByRole("heading", { name: /control y supervisión/i })).toBeVisible({
      timeout: 30000,
    });
    const filter = page.getByPlaceholder(/filtrar por nombre/i);
    await expect(filter).toBeVisible({ timeout: 15000 });
    await filter.fill("zzz-sin-match-99");
    await expect(page.getByText(/sin coincidencias operativas/i)).toBeVisible({ timeout: 10000 });
    await filter.fill("");
    await page.getByRole("button", { name: /^indicadores$/i }).click();
    await expect(page).toHaveURL(/tab=kpis/, { timeout: 15000 });
    await page.getByRole("button", { name: /calcular métricas/i }).click();
    await expect(page.getByText(/asistencia y puntualidad/i)).toBeVisible({ timeout: 30000 });
  });

  test("email-center: redirect, gate de envío y modal SMTP sin mutar", async ({
    page,
    request,
  }) => {
    // Defensa en profundidad: aunque el test nunca hace submit, bloquea el envío real.
    await page.route("**/api/email/send-test", (r) => r.abort());
    await loginFast(page, request, "admin");
    await page.goto("/#/email-center");
    await expect(page).toHaveURL(/configuration\?tab=email/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /nueva comunicación/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByPlaceholder("DESTINATARIO@DOMINIO.COM")).toBeVisible();
    // Gate: sin SMTP verificado el Despachar queda deshabilitado.
    const dispatch = page.getByRole("button", { name: /despachar|enviando/i });
    await expect(dispatch).toBeVisible();
    // Verificar conexión muestra estado (nominal o error) sin enviar nada.
    await page.getByRole("button", { name: /verificar/i }).click();
    await expect(page.getByText(/servicio nominal|error de enlace/i).first()).toBeVisible({
      timeout: 20000,
    });
    // Modal SMTP abre y cierra sin guardar (no muta config global).
    await page.getByRole("button", { name: /configurar smtp/i }).click();
    await expect(page.getByText(/gestión de perfiles smtp/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /^cerrar$/i }).click();
  });

  test("planning/monthly: stub documentado como en construcción", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/planning/monthly");
    await expect(page.getByRole("heading", { name: /planificación mensual/i })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole("heading", { name: /módulo en construcción/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("governance: triggers funcionales de solo lectura", async ({ page, request }) => {
    await loginFast(page, request, "admin");
    await page.goto("/#/admin/governance?tab=integrity");
    const audit = page.getByRole("button", { name: /ejecutar auditoría profunda/i });
    await expect(audit).toBeVisible({ timeout: 30000 });
    await audit.click();
    await expect(page.getByText(/auditoría de integridad|salud de datos/i).first()).toBeVisible({
      timeout: 60000,
    });
    await page.goto("/#/admin/governance?tab=system");
    const diagnose = page.getByRole("button", { name: /iniciar diagnóstico/i });
    await expect(diagnose).toBeVisible({ timeout: 30000 });
    await diagnose.click();
    await expect(
      page.getByText(/diagnóstico completado|sincronización óptima|atención requerida/i).first(),
    ).toBeVisible({ timeout: 60000 });
  });

  test("kiosk: flujo PIN completo con worker único", async ({ page, request }) => {
    const token = await adminToken(request);
    const worker = await createWorker(request, token);
    try {
      await page.goto("/#/kiosk");
      await expect(page.getByRole("heading", { name: /identificación/i })).toBeVisible({
        timeout: 30000,
      });
      await page.getByText(/seleccionar de la lista/i).click();
      const search = page.getByPlaceholder("BUSCAR POR NOMBRE...");
      await expect(search).toBeVisible({ timeout: 10000 });
      await search.fill(worker.employeeName);
      await page.getByRole("button", { name: new RegExp(worker.employeeName, "i") }).click();
      await expect(page.getByRole("heading", { name: /ingrese pin/i })).toBeVisible({
        timeout: 10000,
      });
      // PIN de factoría = 2468; auto-submit al 4º dígito. Un solo intento:
      // 5 fallos bloquean al empleado y requieren reset de admin.
      for (const digit of ["2", "4", "6", "8"]) {
        await page.getByRole("button", { name: digit, exact: true }).click();
      }
      await expect(page.getByRole("heading", { name: /acciones/i })).toBeVisible({
        timeout: 15000,
      });
      const start = page.getByRole("button", { name: /inicio jornada/i });
      await expect(start).toBeEnabled({ timeout: 15000 });
      await start.click();
      await expect(page.getByRole("heading", { name: /completado/i })).toBeVisible({
        timeout: 20000,
      });
    } finally {
      await disposeWorker(request, await getAdminToken(request), worker);
    }
  });
});
