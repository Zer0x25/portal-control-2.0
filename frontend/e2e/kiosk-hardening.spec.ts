import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";
import { getAdminToken } from "./helpers/worker-factory";

const API_BASE = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";

interface QaWorker {
  employeeId: string;
  name: string;
  rut: string;
  rutDigits: string;
  pin: string;
}

function computeRutDv(bodyNum: number): string {
  let sum = 0;
  let mul = 2;
  let n = bodyNum;
  while (n > 0) {
    sum += (n % 10) * mul;
    n = Math.floor(n / 10);
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = 11 - (sum % 11);
  if (rem === 11) return "0";
  if (rem === 10) return "K";
  return String(rem);
}

function generateValidRut(seedOffset: number, requireK = false): { rut: string; digits: string } {
  let body = 91_000_000 + ((Date.now() + seedOffset * 97) % 8_000_000);
  if (requireK) {
    while (computeRutDv(body) !== "K") {
      body += 1;
    }
  }
  const dv = computeRutDv(body);
  return {
    rut: `${body}-${dv}`,
    digits: `${body}${dv}`,
  };
}

let workerSeq = 0;
const createdEmployeeIds: string[] = [];
const createdLeaveIds: string[] = [];

async function createQaWorker(
  request: APIRequestContext,
  adminToken: string,
  options?: { pin?: string; requireK?: boolean; workdayType?: string },
): Promise<QaWorker> {
  workerSeq += 1;
  const tag = `${Date.now().toString(36)}-${workerSeq}`.toUpperCase();
  const { rut, digits } = generateValidRut(workerSeq * 131, options?.requireK ?? false);
  const employeeId = `QA-K4-${tag}`;
  const name = `QA K4 Worker ${tag}`;
  const pin = options?.pin ?? "2468";

  const res = await request.post(`${API_BASE}/employees`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      id: employeeId,
      name,
      rut,
      position: "Operador QA K4",
      area: "QA-K4",
      workdayType: options?.workdayType ?? "Ordinaria",
      pin,
    },
  });
  expect(res.ok(), `createQaWorker HTTP ${res.status()}`).toBe(true);
  createdEmployeeIds.push(employeeId);

  return { employeeId, name, rut, rutDigits: digits, pin };
}

async function cleanupQaWorkerRecordsAndArchive(
  request: APIRequestContext,
  adminToken: string,
  employeeId: string,
): Promise<void> {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const recRes = await request.get(`${API_BASE}/records?employeeId=${employeeId}&pageSize=50`, {
    headers,
  });
  if (recRes.ok()) {
    const body = await recRes.json();
    const recs = Array.isArray(body) ? body : (body.records ?? body.data ?? []);
    for (const rec of recs) {
      await request.delete(`${API_BASE}/records/${rec.id}`, { headers });
    }
  }
  await request.put(`${API_BASE}/employees/${employeeId}`, {
    headers,
    data: { status: "Archivado" },
  });
}

async function enterPinDigits(page: Page, pin: string): Promise<void> {
  for (const ch of pin) {
    await page.locator(`[data-testid="kiosk-key-${ch}"]`).click();
  }
}

async function openKioskToEmployeePin(page: Page, worker: QaWorker): Promise<void> {
  await page.goto("/#/kiosk");
  await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: /seleccionar de la lista/i }).click();
  await expect(page.locator('[data-testid="kiosk-step"][data-step="employee_list"]')).toBeVisible({
    timeout: 10000,
  });
  const search = page.getByPlaceholder("BUSCAR POR NOMBRE...");
  await search.fill(worker.name);
  await page.getByRole("button", { name: new RegExp(worker.name, "i") }).click();
  await expect(page.locator('[data-testid="kiosk-step"][data-step="pin_input"]')).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Kiosco Hardening E2E (Fase 4)", () => {
  test.afterAll(async ({ request }) => {
    const adminToken = await getAdminToken(request);
    const headers = { Authorization: `Bearer ${adminToken}` };
    for (const leaveId of createdLeaveIds.splice(0)) {
      await request.delete(`${API_BASE}/leaves/${leaveId}`, { headers }).catch(() => {});
    }
    for (const empId of createdEmployeeIds.splice(0)) {
      await cleanupQaWorkerRecordsAndArchive(request, adminToken, empId).catch(() => {});
    }
  });

  test("GET /api/employees/kiosk sin rut en claro, sin Authorization con sesión portal y retry en error inicial", async ({
    page,
    request,
  }) => {
    const adminToken = await getAdminToken(request);
    const worker = await createQaWorker(request, adminToken);

    const kioskApiRes = await request.get(`${API_BASE}/employees/kiosk`);
    expect(kioskApiRes.status()).toBe(200);
    const kioskList = (await kioskApiRes.json()) as Array<Record<string, unknown>>;
    const found = kioskList.find((e) => e.id === worker.employeeId);
    expect(found).toBeTruthy();
    expect(found).not.toHaveProperty("rut");
    expect(typeof found?.rutHash).toBe("string");
    expect((found?.rutHash as string).length).toBe(64);
    expect(found?.workdayType).toBe("Ordinaria");

    // Con sesión portal activa, GET /api/employees/kiosk no debe enviar Authorization
    await loginFast(page, request, "admin");
    let kioskAuthHeader: string | undefined;
    let shouldFail = true;
    await page.route("**/api/employees/kiosk*", async (route) => {
      const headers = route.request().headers();
      kioskAuthHeader = headers.authorization;
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Fallo simulado" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/#/kiosk");
    const retryBtn = page.getByRole("button", { name: /reintentar/i });
    await expect(retryBtn).toBeVisible({ timeout: 25000 });
    expect(kioskAuthHeader).toBeUndefined();

    shouldFail = false;
    await retryBtn.click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 15000,
    });
    expect(kioskAuthHeader).toBeUndefined();
  });

  test("rut_input: teclado físico, NumericKeypad Enter/Space, K solo DV final y móvil 375x667 sin solapamiento", async ({
    page,
    request,
  }) => {
    const adminToken = await getAdminToken(request);
    const workerK = await createQaWorker(request, adminToken, { requireK: true });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/#/kiosk");
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 20000,
    });

    // Verificar sin solapamiento en 375x667
    const geom = await page.evaluate(() => {
      const stepEl = document.querySelector('[data-testid="kiosk-step"]')?.getBoundingClientRect();
      const exitEl = document
        .querySelector('[data-testid="kiosk-exit-button"]')
        ?.getBoundingClientRect();
      const connEl = document.querySelector('[aria-label*="Conexi"]')?.getBoundingClientRect();
      const overlaps = (a?: DOMRect, b?: DOMRect) =>
        Boolean(
          a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
        );
      return {
        hasStep: Boolean(stepEl),
        hasExit: Boolean(exitEl),
        overlapsExit: overlaps(stepEl, exitEl),
        overlapsConn: overlaps(stepEl, connEl),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(geom.hasStep).toBe(true);
    expect(geom.hasExit).toBe(true);
    expect(geom.overlapsExit).toBe(false);
    expect(geom.overlapsConn).toBe(false);
    expect(geom.horizontalOverflow).toBe(false);

    // K al inicio bloqueada y dígitos después de K bloqueados ("k1k2" -> "1-K")
    await page.keyboard.type("k1k2");
    await expect(page.locator('[data-testid="kiosk-display"]')).toHaveText("1-K");

    // Borrar con Backspace físico
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await expect(page.locator('[data-testid="kiosk-display"]')).toHaveText("00.000.000-0");

    // NumericKeypad activado con Space (nota: Enter en window keydown dispara handleRutConfirm)
    const key1 = page.locator('[data-testid="kiosk-key-1"]');
    await key1.focus();
    await page.keyboard.press("Space");
    await expect(page.locator('[data-testid="kiosk-display"]')).toHaveText("1");
    await page.keyboard.press("Backspace");

    // Ingreso completo por teclado físico con DV K final
    await page.keyboard.type(workerK.rutDigits);
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-testid="kiosk-step"][data-step="pin_input"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("pin_input: bloqueo K, sin doble POST, Atrás aborta en vuelo, 5to fallo 403 invalida caché", async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);
    const adminToken = await getAdminToken(request);
    const worker = await createQaWorker(request, adminToken, { pin: "2468" });

    await openKioskToEmployeePin(page, worker);

    // Bloqueo de "K" en pin_input (ni tecla UI ni teclado físico)
    await page.locator('[data-testid="kiosk-key-K"]').click();
    await page.keyboard.press("k");
    await expect(page.getByRole("status", { name: /0 de 4 dígitos ingresados/i })).toBeVisible();

    // Atrás aborta petición en vuelo y no salta a actions
    let loginCount = 0;
    await page.route("**/api/auth/kiosk-login", async (route) => {
      loginCount += 1;
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });

    await enterPinDigits(page, worker.pin);
    await page.getByRole("button", { name: /atrás/i }).click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(900);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible();
    const tokenAfterAbort = await page.evaluate(() => sessionStorage.getItem("kioskToken"));
    expect(tokenAfterAbort).toBeNull();
    await page.unroute("**/api/auth/kiosk-login");

    // Sin doble POST al completar 4 dígitos y pulsar Confirmar Identidad
    loginCount = 0;
    await openKioskToEmployeePin(page, worker);
    await page.route("**/api/auth/kiosk-login", async (route) => {
      loginCount += 1;
      await new Promise((r) => setTimeout(r, 350));
      await route.continue();
    });
    await enterPinDigits(page, worker.pin);
    await page.locator('[data-testid="kiosk-key-confirm"]').click({ force: true });
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    expect(loginCount).toBe(1);
    await page.unroute("**/api/auth/kiosk-login");

    // Salir al menú y probar 5 fallos -> 403 e invalidación de caché employeesKiosk
    await page.getByRole("button", { name: /atrás/i }).click();
    await openKioskToEmployeePin(page, worker);

    let fifthStatus = 0;
    let employeesRefetchedAfterBlock = false;
    page.on("response", (res) => {
      if (res.url().includes("/api/auth/kiosk-login") && res.status() === 403) {
        fifthStatus = 403;
      }
      if (fifthStatus === 403 && res.url().includes("/api/employees/kiosk")) {
        employeesRefetchedAfterBlock = true;
      }
    });

    for (let attempt = 1; attempt <= 5; attempt++) {
      const loginAttemptPromise = page.waitForResponse(
        (res) => res.url().includes("/api/auth/kiosk-login") && res.request().method() === "POST",
      );
      await enterPinDigits(page, "9999");
      const attemptRes = await loginAttemptPromise;
      if (attempt < 5) {
        expect(attemptRes.status()).toBe(401);
        await expect(page.locator('[data-testid="kiosk-pin-error"]')).toBeVisible({
          timeout: 10000,
        });
      } else {
        expect(attemptRes.status()).toBe(403);
      }
    }

    expect(fifthStatus).toBe(403);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 10000,
    });
    await expect.poll(() => employeesRefetchedAfterBlock, { timeout: 10000 }).toBe(true);

    // Al intentar seleccionar nuevamente al empleado bloqueado, no debe entrar a pin_input
    await page.getByRole("button", { name: /seleccionar de la lista/i }).click();
    const search = page.getByPlaceholder("BUSCAR POR NOMBRE...");
    await search.fill(worker.name);
    await page.getByRole("button", { name: new RegExp(worker.name, "i") }).click();
    await expect(
      page.locator('[data-testid="kiosk-step"][data-step="employee_list"]'),
    ).toBeVisible();
  });

  test("mustChangePin fuerza change_pin, prohíbe rut.slice(0,4) y botón kiosk-change-pin-button funciona", async ({
    page,
    request,
  }) => {
    const adminToken = await getAdminToken(request);
    const worker = await createQaWorker(request, adminToken, { pin: "3579" });

    // Reactivar Archivado -> Activo para dejar mustChangePin=true con hash de rut.slice(0,4)
    const archRes = await request.put(`${API_BASE}/employees/${worker.employeeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "Archivado" },
    });
    expect(archRes.ok()).toBe(true);
    const reactRes = await request.put(`${API_BASE}/employees/${worker.employeeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "Activo" },
    });
    expect(reactRes.ok()).toBe(true);

    const initialPin = worker.rut.slice(0, 4);

    // Entrar vía RUT para que enteredRutPrefix quede registrado
    await page.goto("/#/kiosk");
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 20000,
    });
    await page.keyboard.type(worker.rutDigits);
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-testid="kiosk-step"][data-step="pin_input"]')).toBeVisible({
      timeout: 10000,
    });

    await enterPinDigits(page, initialPin);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="change_pin"]')).toBeVisible({
      timeout: 15000,
    });

    // Intentar fijar rut.slice(0, 4) -> bloqueado en UI
    await enterPinDigits(page, initialPin);
    await enterPinDigits(page, initialPin);
    await page.locator('[data-testid="kiosk-key-confirm"]').click();
    await expect(page.getByText(/primeros 4 dígitos de tu rut/i)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="kiosk-step"][data-step="change_pin"]')).toBeVisible();

    // Fijar nuevo PIN válido -> avanza a actions y muestra kiosk-change-pin-button
    await enterPinDigits(page, "4826");
    await enterPinDigits(page, "4826");
    await page.locator('[data-testid="kiosk-key-confirm"]').click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    const changePinBtn = page.locator('[data-testid="kiosk-change-pin-button"]');
    await expect(changePinBtn).toBeVisible();
    await changePinBtn.click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="change_pin"]')).toBeVisible();
  });

  test("actions & punch: ciclo 4 pasos source KIOSK, isSubmitting GPS, 429 toast único y timer 2500ms cancelado", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    const adminToken = await getAdminToken(request);
    const worker = await createQaWorker(request, adminToken, { pin: "2468" });
    const worker2 = await createQaWorker(request, adminToken, { pin: "2468" });

    // Mock geolocalización con demora de 900ms para observar isSubmitting visual
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            setTimeout(() => {
              success({
                coords: {
                  latitude: -33.4489,
                  longitude: -70.6693,
                  accuracy: 10,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                },
                timestamp: Date.now(),
              } as GeolocationPosition);
            }, 900);
          },
        },
      });
    });

    const punchPayloads: Array<Record<string, unknown>> = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/records/punch") && req.method() === "POST") {
        punchPayloads.push(req.postDataJSON() as Record<string, unknown>);
      }
    });

    // Paso 1: Inicio Jornada + verificar isSubmitting visual y cancelación de timer 2500ms al pulsar Atrás
    await openKioskToEmployeePin(page, worker);
    await enterPinDigits(page, worker.pin);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    const btnEntrada = page.getByRole("button", { name: "Inicio Jornada" });
    await expect(btnEntrada).toBeEnabled({ timeout: 5000 });
    await btnEntrada.click();

    await expect(page.locator('[aria-busy="true"]')).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole("button", { name: "Inicio Jornada" })).toHaveText(/registrando/i);

    await expect(page.locator('[data-testid="kiosk-step"][data-step="success"]')).toBeVisible({
      timeout: 10000,
    });

    // Pulsar Atrás antes de 2500ms, abrir pin_input con worker2 y confirmar que NO resetea a los 2800ms
    await page.getByRole("button", { name: /atrás/i }).click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible();
    await page.getByRole("button", { name: /seleccionar de la lista/i }).click();
    await page.getByPlaceholder("BUSCAR POR NOMBRE...").fill(worker2.name);
    await page.getByRole("button", { name: new RegExp(worker2.name, "i") }).click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="pin_input"]')).toBeVisible();
    await page.waitForTimeout(2800);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="pin_input"]')).toBeVisible();

    // Volver con worker 1 dentro de los 15s -> probar 429 cooldown en UN ÚNICO toast
    await page.getByRole("button", { name: /atrás/i }).click();
    await openKioskToEmployeePin(page, worker);
    await enterPinDigits(page, worker.pin);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    const btnColInicio = page.getByRole("button", { name: "Inicio Colación" });
    await expect(btnColInicio).toBeEnabled({ timeout: 5000 });
    await btnColInicio.click();

    // Un único toast por cooldown 429
    await expect(page.getByText(/espere unos segundos/i)).toBeVisible({ timeout: 5000 });
    const toastCloseButtons = page.getByRole("button", { name: "Cerrar notificación" });
    expect(await toastCloseButtons.count()).toBe(1);

    // Esperar cooldown 15s y completar Inicio Colación -> Fin Colación -> Fin Jornada
    await page.waitForTimeout(16000);
    await btnColInicio.click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="success"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 5000,
    });

    await page.waitForTimeout(16000);
    await openKioskToEmployeePin(page, worker);
    await enterPinDigits(page, worker.pin);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    const btnColFin = page.getByRole("button", { name: "Fin Colación" });
    await expect(btnColFin).toBeEnabled({ timeout: 5000 });
    await btnColFin.click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="success"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 5000,
    });

    await page.waitForTimeout(16000);
    await openKioskToEmployeePin(page, worker);
    await enterPinDigits(page, worker.pin);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    const btnSalida = page.getByRole("button", { name: "Fin Jornada" });
    await expect(btnSalida).toBeEnabled({ timeout: 5000 });
    await btnSalida.click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="success"]')).toBeVisible({
      timeout: 10000,
    });

    expect(punchPayloads.length).toBeGreaterThanOrEqual(4);
    for (const payload of punchPayloads) {
      expect(payload.source).toBe("KIOSK");
    }
  });

  test("ON_LEAVE, BREAK_INCOMPLETE_TOO_EARLY, 401 expirado y kiosk-exit-button con logout real", async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);
    const adminToken = await getAdminToken(request);
    const workerLeave = await createQaWorker(request, adminToken, { pin: "2468" });
    const workerBreak = await createQaWorker(request, adminToken, { pin: "2468" });

    // 1. ON_LEAVE
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(
      new Date(),
    );
    const leaveRes = await request.post(`${API_BASE}/leaves`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        employeeId: workerLeave.employeeId,
        type: "Vacaciones",
        startDate: today,
        endDate: today,
        notes: "QA K4 Leave",
      },
    });
    expect(leaveRes.ok(), `create leave HTTP ${leaveRes.status()}`).toBe(true);
    const leaveBody = await leaveRes.json();
    if (leaveBody?.id) createdLeaveIds.push(leaveBody.id as string);

    await openKioskToEmployeePin(page, workerLeave);
    await enterPinDigits(page, workerLeave.pin);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    const btnEntradaLeave = page.getByRole("button", { name: "Inicio Jornada" });
    await expect(btnEntradaLeave).toBeEnabled({ timeout: 5000 });
    await btnEntradaLeave.click();
    await expect(page.getByText(/licencia, vacaciones o permiso/i)).toBeVisible({ timeout: 5000 });

    // 2. BREAK_INCOMPLETE_TOO_EARLY (<60m colación)
    const loginBreakRes = await request.post(`${API_BASE}/auth/kiosk-login`, {
      data: { employeeId: workerBreak.employeeId, pin: workerBreak.pin },
    });
    expect(loginBreakRes.status()).toBe(200);
    const { token: breakToken } = (await loginBreakRes.json()) as { token: string };

    // Crear entrada e inicioColacion hace 20m vía admin para no esperar cooldown
    const recRes = await request.post(`${API_BASE}/records`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        employeeId: workerBreak.employeeId,
        employeeName: workerBreak.name,
        employeeArea: "QA-K4",
        employeeWorkdayType: "Ordinaria",
        date: today,
        entrada: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        inicioColacion: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        status: "Colacion",
        source: "KIOSK",
      },
    });
    expect(recRes.ok(), `create break record HTTP ${recRes.status()}`).toBe(true);

    await page.getByRole("button", { name: /atrás/i }).click();
    await openKioskToEmployeePin(page, workerBreak);
    await enterPinDigits(page, workerBreak.pin);
    await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
      timeout: 15000,
    });
    const btnSalidaBreak = page.getByRole("button", { name: "Fin Jornada" });
    await expect(btnSalidaBreak).toBeEnabled({ timeout: 5000 });
    await btnSalidaBreak.click();
    await expect(page.getByText(/colaci[oó]n incompleta debe superar 60 minutos/i)).toBeVisible({
      timeout: 5000,
    });

    // 3. 401 expirado redirige a rut_input
    await page.route("**/api/records/punch", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Token expirado" }),
      });
    });
    await btnSalidaBreak.click();
    await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
      timeout: 5000,
    });
    await page.unroute("**/api/records/punch");

    // 4. kiosk-exit-button invoca POST /api/auth/logout con revocación real del kioskToken
    await page.evaluate((t) => sessionStorage.setItem("kioskToken", t), breakToken);
    const logoutPromise = page.waitForResponse(
      (res) => res.url().includes("/api/auth/logout") && res.request().method() === "POST",
    );
    await page.locator('[data-testid="kiosk-exit-button"]').click();
    const logoutRes = await logoutPromise;
    expect(logoutRes.status()).toBe(200);

    // Verificar revocación real del token en API
    const postLogoutCheck = await request.get(`${API_BASE}/records?pageSize=1`, {
      headers: { Authorization: `Bearer ${breakToken}` },
    });
    expect(postLogoutCheck.status()).toBe(401);
  });
});
