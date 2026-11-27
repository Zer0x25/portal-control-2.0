import { expect, Locator, Page, APIRequestContext, test } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

const requirePilotEnv = () => {
  test.skip(
    process.env.E2E_API_URL !== "http://127.0.0.1:8080/api" ||
      process.env.E2E_BASE_URL !== "http://127.0.0.1:5199",
    "Requiere frontend local y staging aislado",
  );
};

async function assertNoDocumentOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "No debe haber desbordamiento horizontal en el documento",
  ).toBe(true);
}

async function assertFitsViewport(locator: Locator) {
  const fits = await locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.left >= -1 && box.right <= window.innerWidth + 1;
  });
  expect(fits, "El control enfocado debe quedar dentro del viewport").toBe(true);
}

async function tabTo(page: Page, locator: Locator, maxTabs = 60) {
  for (let i = 0; i < maxTabs; i++) {
    if (await locator.evaluate((el) => el === document.activeElement)) {
      await expect(locator).toBeFocused();
      await assertFitsViewport(locator);
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(locator).toBeFocused();
}

async function setupRolePage(
  page: Page,
  request: APIRequestContext,
  role: "Super_Administrador" | "Supervisor" | "Administrador" | "Reloj_Control",
) {
  if (role === "Super_Administrador") {
    await loginFast(page, request, "admin");
    return async () => {};
  }

  const api = process.env.E2E_API_URL!;
  const adminToken = await loginFast(page, request, "admin");
  const headers = { Authorization: `Bearer ${adminToken}` };
  const username = `qa_pil_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const password = `Qa-Pil-${Date.now().toString(36)}-test`;

  const created = await request.post(`${api}/users`, {
    headers,
    data: { username, password, role },
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
          role,
          employeeId: session.employeeId ?? null,
          isDeleted: false,
          lastModified: Date.now(),
          syncStatus: "synced",
        },
      },
    );
  } catch (error) {
    if (userToken) {
      await request
        .post(`${api}/auth/logout`, { headers: { Authorization: `Bearer ${userToken}` } })
        .catch(() => {});
    }
    await request.delete(`${api}/users/${user.id}`, { headers }).catch(() => {});
    throw error;
  }

  return async () => {
    if (userToken) {
      await request
        .post(`${api}/auth/logout`, { headers: { Authorization: `Bearer ${userToken}` } })
        .catch(() => {});
    }
    const deleted = await request.delete(`${api}/users/${user.id}`, { headers });
    expect(deleted.ok(), `eliminar cuenta temporal: ${deleted.status()}`).toBeTruthy();
  };
}

const MOCK_ACTIVE_SHIFT = {
  id: "shift-pilot-1",
  folio: "901",
  date: "2026-11-21",
  shiftName: "Turno Piloto",
  startTime: "2026-11-21T08:00:00.000Z",
  responsibleUser: "admin",
  status: "open",
  logEntries: [
    {
      id: "log-pilot-1",
      time: "09:15",
      annotation: "Revisión de tablero eléctrico",
      timestamp: 1795252500000,
    },
  ],
  supplierEntries: [
    {
      id: "sup-pilot-1",
      entryType: "provider",
      arrivalMode: "vehicle",
      time: "10:30",
      licensePlate: "AB1234",
      driverName: "Carlos Méndez",
      paxCount: 1,
      company: "Servicios Industriales",
      reason: "Entrega de insumos",
      timestamp: 1795257000000,
    },
  ],
  reportCreatedAt: "2026-11-21T08:00:00.000Z",
  updatedAt: "2026-11-21T10:30:00.000Z",
  lastModified: 1795257000000,
  syncStatus: "synced",
  isDeleted: false,
};

const MOCK_CLOSED_SHIFT = {
  ...MOCK_ACTIVE_SHIFT,
  id: "shift-pilot-closed",
  folio: "900",
  shiftName: "Turno Anterior",
  status: "closed",
  endTime: "2026-11-20T20:00:00.000Z",
};

const WIDTHS = [355, 853, 1138] as const;

for (const role of ["Super_Administrador", "Administrador", "Reloj_Control"] as const) {
  test(`Dashboard controles internos por teclado y tamaño para ${role}`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);
    requirePilotEnv();
    const cleanup = await setupRolePage(page, request, role);

    try {
      await page.route(/\/api\/shift-reports(?:\?.*)?$/, (route) => {
        const url = new URL(route.request().url());
        const status = url.searchParams.get("status");
        if (status === "closed") {
          return route.fulfill({
            json: { data: [MOCK_CLOSED_SHIFT], total: 1, page: 1, totalPages: 1 },
          });
        }
        return route.fulfill({
          json: { data: [MOCK_ACTIVE_SHIFT], total: 1, page: 1, totalPages: 1 },
        });
      });

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 850 });
        await page.goto("/#/dashboard");
        await expect(page.getByRole("list", { name: "Widgets del dashboard" })).toBeVisible({
          timeout: 30000,
        });
        await assertNoDocumentOverflow(page);

        // Accesos Rápidos
        const firstQuickAction = page.getByRole("button", { name: "Horarios", exact: true });
        await firstQuickAction.focus();
        await assertFitsViewport(firstQuickAction);
        for (const label of ["Novedades", "Calendario", "Personal"]) {
          await tabTo(page, page.getByRole("button", { name: label, exact: true }), 10);
        }

        // Gestión de Alertas
        const incomingBtn = page.getByRole("button", { name: /^Ingresos \(/ });
        const missingBtn = page.getByRole("button", { name: /^Salidas \(/ });
        await incomingBtn.focus();
        await assertFitsViewport(incomingBtn);
        if ((await incomingBtn.getAttribute("aria-pressed")) !== "true") {
          await page.keyboard.press("Enter");
        }
        await expect(incomingBtn).toHaveAttribute("aria-pressed", "true");
        await tabTo(page, missingBtn, 5);
        await page.keyboard.press("Enter");
        await expect(missingBtn).toHaveAttribute("aria-pressed", "true");
        await expect(incomingBtn).toHaveAttribute("aria-pressed", "false");
        await tabTo(page, page.getByRole("region", { name: "Alertas operativas" }), 5);

        if (width >= 853) {
          // Recursos del Sistema -> Notas
          const notesBtn = page.getByRole("button", { name: "Notas", exact: true });
          await notesBtn.focus();
          await assertFitsViewport(notesBtn);
          await page.keyboard.press("Enter");
          const notesDialog = page.getByRole("dialog", { name: /Tablero de Notas/i });
          await expect(notesDialog).toBeVisible();
          await page.keyboard.press("Tab");
          expect(await notesDialog.evaluate((el) => el.contains(document.activeElement))).toBe(
            true,
          );
          await page.keyboard.press("Escape");
          await expect(notesDialog).toBeHidden();
          await expect(notesBtn).toBeFocused();

          // Historial de Turnos
          const historyRegion = page.getByRole("region", { name: "Historial de turnos" });
          await historyRegion.focus();
          const reportRow = historyRegion.getByRole("button", { name: /Folio: 901/i });
          await tabTo(page, reportRow, 5);
          await page.keyboard.press("Enter");
          const reportDialog = page.getByRole("dialog", { name: /Reporte de Turno #901/i });
          await expect(reportDialog).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(reportDialog).toBeHidden();
          await expect(reportRow).toBeFocused();
        }
      }
    } finally {
      await cleanup();
    }
  });
}

for (const role of ["Super_Administrador", "Supervisor", "Administrador"] as const) {
  test(`Supervisión controles internos por teclado y tamaño para ${role}`, async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    requirePilotEnv();
    const cleanup = await setupRolePage(page, request, role);

    try {
      await page.route("**/api/kpis/summary", (route) =>
        route.fulfill({
          json: {
            kpis: {
              tardinessCount: 1,
              absenceCount: 0,
              vacationCount: 0,
              medicalLeaveCount: 0,
              specialPermitCount: 0,
              overtimePercentage: 0,
              avgWeeklyHours: 40,
              tardinessRate: 5,
              unjustifiedAbsenceRate: 0,
              justifiedAbsenceRate: 0,
              vacationRate: 0,
              medicalLeaveRate: 0,
              specialPermitRate: 0,
              totalAbsenteeismRate: 0,
              absenceRate: 0,
            },
            kpiDetails: {
              tardyRecords: [
                {
                  id: "tardy-pilot-1",
                  employeeId: "emp-1",
                  employeeName: "Juan Pérez",
                  employeeArea: "Operaciones",
                  employeeWorkdayType: "Ordinaria",
                  date: "2026-11-20",
                  entrada: "2026-11-20T08:15:00.000Z",
                  status: "Completado",
                  source: "MANUAL",
                },
              ],
              absentEmployees: [],
              vacationRecords: [],
              medicalLeaveRecords: [],
              specialPermitRecords: [],
            },
          },
        }),
      );

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 850 });
        await page.goto("/#/dashboard-supervisor?tab=dashboard");
        const nav = page.getByRole("navigation", { name: "Secciones de supervisión" });
        await expect(nav).toBeVisible({ timeout: 30000 });
        await assertNoDocumentOverflow(page);

        // 1. Resumen Hoy (tab=dashboard)
        const totalScheduledBtn = page.getByRole("button", { name: /Total Programados Hoy/i });
        await expect(totalScheduledBtn).toBeVisible({ timeout: 30000 });
        await totalScheduledBtn.focus();
        await assertFitsViewport(totalScheduledBtn);
        await page.keyboard.press("Enter");
        await expect(totalScheduledBtn).toHaveAttribute("aria-pressed", "true");

        const searchInput = page.getByRole("searchbox", {
          name: "Filtrar colaboradores por nombre",
        });
        await tabTo(page, searchInput, 15);
        const clearBtn = page.getByRole("button", { name: "Limpiar Parámetros" });
        await tabTo(page, clearBtn, 5);
        await page.keyboard.press("Enter");
        await expect(totalScheduledBtn).toHaveAttribute("aria-pressed", "false");
        await tabTo(
          page,
          page.getByRole("region", { name: "Lista de presencia en tiempo real" }),
          5,
        );

        // 2. Indicadores (tab=kpis)
        await nav.getByRole("button", { name: "Indicadores" }).click();
        const prevMonth = page.getByRole("button", { name: "Mes anterior" });
        await expect(prevMonth).toBeVisible({ timeout: 30000 });
        await prevMonth.focus();
        await assertFitsViewport(prevMonth);
        await page.keyboard.press("Tab");
        const monthTrigger = page.getByRole("button", { name: /VENTANA CRONOLÓGICA/i });
        await expect(monthTrigger).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(monthTrigger).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Escape");
        await expect(monthTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(monthTrigger).toBeFocused();

        const calcBtn = page.getByRole("button", { name: /Calcular Métricas/i });
        await tabTo(page, calcBtn, 15);
        await page.keyboard.press("Enter");
        const tardinessBtn = page.getByRole("button", { name: /Registros con Atraso/i });
        await expect(tardinessBtn).toContainText("1");
        await tabTo(page, tardinessBtn, 5);
        await page.keyboard.press("Enter");
        const kpiDialog = page.getByRole("dialog", { name: "Detalle de Atrasos" });
        await expect(kpiDialog).toBeVisible();
        await expect(kpiDialog).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(kpiDialog).toBeHidden();
        await expect(tardinessBtn).toBeFocused();

        // 3. Analytics (tab=analytics)
        await nav.getByRole("button", { name: "Analytics" }).click();
        const heatmapRegion = page.getByRole("region", { name: "Mapa de calor de asistencia" });
        await expect(heatmapRegion).toBeVisible({ timeout: 30000 });
        await heatmapRegion.focus();
        await expect(heatmapRegion).toBeFocused();
        await assertNoDocumentOverflow(page);

        // 4. Empleados / Solicitudes (tab=employees)
        await nav.getByRole("button", { name: "Empleados" }).click();
        const pendingFilter = page.getByRole("button", { name: /Pendiente/i });
        await expect(pendingFilter).toBeVisible({ timeout: 30000 });
        await pendingFilter.focus();
        await assertFitsViewport(pendingFilter);
        for (const label of [/Aprobada/i, /Rechazada/i]) {
          const btn = page.getByRole("button", { name: label });
          await tabTo(page, btn, 5);
          await page.keyboard.press("Enter");
          await expect(btn).toHaveAttribute("aria-pressed", "true");
        }
        await tabTo(page, page.getByRole("region", { name: "Solicitudes de corrección" }), 5);

        // 5. Reportes (tab=reports)
        await nav.getByRole("button", { name: "Reportes" }).click();
        const reportMonthTrigger = page.getByRole("button", { name: /Periodo de Consulta/i });
        await expect(reportMonthTrigger).toBeVisible({ timeout: 30000 });
        await reportMonthTrigger.focus();
        await assertFitsViewport(reportMonthTrigger);
        await page.keyboard.press("Enter");
        await expect(reportMonthTrigger).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Escape");
        await expect(reportMonthTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(reportMonthTrigger).toBeFocused();
        await tabTo(page, page.getByRole("button", { name: /Generar Reporte/i }), 15);

        // 6. Turnos / Cierre Contable (tab=shifts)
        await nav.getByRole("button", { name: "Turnos" }).click();
        const historyBtn = page.getByRole("button", { name: "Ver Historial de Cierres" });
        await expect(historyBtn).toBeVisible({ timeout: 30000 });
        await historyBtn.focus();
        await assertFitsViewport(historyBtn);
        await page.keyboard.press("Enter");
        const closureDialog = page.getByRole("dialog", { name: "Historial de Cierres Contables" });
        await expect(closureDialog).toBeVisible();
        await tabTo(
          page,
          closureDialog.getByRole("region", { name: "Contenido del historial de cierres" }),
          5,
        );
        await page.keyboard.press("Escape");
        await expect(closureDialog).toBeHidden();
        await expect(historyBtn).toBeFocused();

        const cutoffBtn = page.getByRole("button", { name: /Nuevo Límite de Cierre \(CUT-OFF\)/i });
        if (await cutoffBtn.isEnabled()) {
          await tabTo(page, cutoffBtn, 5);
          await page.keyboard.press("Enter");
          const dateDialog = page.getByRole("dialog", { name: "Seleccionar Fecha" });
          await expect(dateDialog).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(dateDialog).toBeHidden();
          await expect(cutoffBtn).toBeFocused();
        }
        await assertNoDocumentOverflow(page);
      }
    } finally {
      await cleanup();
    }
  });
}

for (const role of ["Super_Administrador", "Administrador", "Reloj_Control"] as const) {
  test(`Bitácora controles internos por teclado y tamaño para ${role}`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);
    requirePilotEnv();
    const cleanup = await setupRolePage(page, request, role);

    try {
      await page.route(/\/api\/shift-reports(?:\?.*)?$/, (route) => {
        const url = new URL(route.request().url());
        const status = url.searchParams.get("status");
        if (status === "closed") {
          return route.fulfill({
            json: { data: [MOCK_CLOSED_SHIFT], total: 1, page: 1, totalPages: 1 },
          });
        }
        return route.fulfill({
          json: { data: [MOCK_ACTIVE_SHIFT], total: 1, page: 1, totalPages: 1 },
        });
      });

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 850 });
        await page.goto("/#/logbook");
        const historyBtn = page.getByRole("button", { name: "Historial de Turnos" });
        await expect(historyBtn).toBeVisible({ timeout: 30000 });
        await assertNoDocumentOverflow(page);

        // Historial de Turnos + calendario anidado + vista previa
        await historyBtn.focus();
        await assertFitsViewport(historyBtn);
        await page.keyboard.press("Enter");
        const historyDialog = page.getByRole("dialog", { name: /Historial de Reportes/i });
        await expect(historyDialog).toBeVisible();

        const filterDateBtn = historyDialog.getByRole("button", { name: "Filtrar Fecha" });
        await tabTo(page, filterDateBtn, 10);
        await page.keyboard.press("Enter");
        const dateDialog = page.getByRole("dialog", { name: "Seleccionar Fecha" });
        await expect(dateDialog).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dateDialog).toBeHidden();
        await expect(filterDateBtn).toBeFocused();

        await tabTo(
          page,
          historyDialog.getByRole("region", { name: "Tabla del historial de reportes" }),
          10,
        );
        const previewBtn = historyDialog.getByRole("button", {
          name: "Ver detalle del turno #900",
        });
        await tabTo(page, previewBtn, 10);
        await page.keyboard.press("Escape");
        await expect(historyDialog).toBeHidden();
        await expect(historyBtn).toBeFocused();

        // Cerrar Guardia -> confirmación cancelada con Escape
        const closeShiftBtn = page.getByRole("button", { name: "Cerrar Guardia" });
        await tabTo(page, closeShiftBtn, 10);
        await page.keyboard.press("Enter");
        const confirmCloseDialog = page.getByRole("dialog", { name: "Confirmar Cierre de Turno" });
        await expect(confirmCloseDialog).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(confirmCloseDialog).toBeHidden();
        await expect(closeShiftBtn).toBeFocused();

        if (width >= 853) {
          // Botones de creación y edición en escritorio/tablet
          const addNoveltyBtn = page.getByRole("button", { name: "Ingresar Novedad" });
          await tabTo(page, addNoveltyBtn, 10);
          await page.keyboard.press("Enter");
          const noveltyDialog = page.getByRole("dialog", { name: /Ingreso de novedad/i });
          await expect(noveltyDialog).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(noveltyDialog).toBeHidden();
          await expect(addNoveltyBtn).toBeFocused();

          const editNoveltyBtn = page.getByRole("button", {
            name: /Editar novedad: Revisión de tablero eléctrico/i,
          });
          await tabTo(page, editNoveltyBtn, 10);
          await page.keyboard.press("Enter");
          const editNoveltyDialog = page.getByRole("dialog", { name: /Editar novedad/i });
          await expect(editNoveltyDialog).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(editNoveltyDialog).toBeHidden();
          await expect(editNoveltyBtn).toBeFocused();

          const addSupplierBtn = page.getByRole("button", { name: "Ingresar Proveedor" });
          await tabTo(page, addSupplierBtn, 10);
          await page.keyboard.press("Enter");
          const supplierDialog = page.getByRole("dialog", { name: /Ingreso de personas/i });
          await expect(supplierDialog).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(supplierDialog).toBeHidden();
          await expect(addSupplierBtn).toBeFocused();
        } else {
          // Móvil (355 px): listas semánticas + edición + FAB con Escape
          await expect(page.getByRole("list", { name: "Novedades del turno" })).toBeVisible();
          await expect(page.getByRole("list", { name: "Ingresos de proveedores" })).toBeVisible();

          const editNoveltyBtn = page.getByRole("button", {
            name: /Editar novedad: Revisión de tablero eléctrico/i,
          });
          await tabTo(page, editNoveltyBtn, 10);
          await page.keyboard.press("Enter");
          const editNoveltyDialog = page.getByRole("dialog", { name: /Editar novedad/i });
          await expect(editNoveltyDialog).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(editNoveltyDialog).toBeHidden();
          await expect(editNoveltyBtn).toBeFocused();

          const fabToggle = page.getByRole("button", { name: "Abrir acciones" });
          await tabTo(page, fabToggle, 20);
          await page.keyboard.press("Enter");
          await expect(page.getByRole("button", { name: "Agregar Novedad" })).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(page.getByRole("button", { name: "Agregar Novedad" })).toBeHidden();
          await expect(fabToggle).toBeFocused();
        }
      }
    } finally {
      await cleanup();
    }
  });
}
