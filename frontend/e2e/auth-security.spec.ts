import crypto from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "999.666";

let cachedAdminToken: string | null = null;

function buildTag(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 0xffff).toString(36)}`;
}

function buildTempPassword(seed: string): string {
  return ["Qa", "Auth", seed].join("-");
}

function buildValidChileanRut(): string {
  const num = 91000000 + Math.floor(Math.random() * 8000000);
  const digits = String(num).split("").reverse();
  let sum = 0;
  let factor = 2;
  for (const d of digits) {
    sum += Number(d) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rem = 11 - (sum % 11);
  const dv = rem === 11 ? "0" : rem === 10 ? "K" : String(rem);
  return `${num}-${dv}`;
}

function decodeBase32(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotp(base32Secret: string, stepOffset = 0): string {
  const key = decodeBase32(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split(".")[1] || "";
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
}

async function getAdminToken(request: APIRequestContext, forceRefresh = false): Promise<string> {
  if (cachedAdminToken && !forceRefresh) {
    const probe = await request.get(`${API_BASE}/configs`, {
      headers: { Authorization: `Bearer ${cachedAdminToken}` },
    });
    if (probe.ok()) {
      return cachedAdminToken;
    }
    cachedAdminToken = null;
  }

  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `admin login failed: HTTP ${res.status()}`).toBe(true);
  const body = (await res.json()) as { token: string };
  cachedAdminToken = body.token;
  return cachedAdminToken;
}

interface TempEmployee {
  id: string;
  name: string;
  rut: string;
  pin: string;
}

interface TempUser {
  id: string;
  username: string;
  initialSecret: string;
  role: string;
  employeeId?: string;
}

async function createTempEmployee(request: APIRequestContext, tag: string): Promise<TempEmployee> {
  let token = await getAdminToken(request);
  const emp: TempEmployee = {
    id: `QAE2EA-${tag}`.toUpperCase(),
    name: `QA Auth ${tag}`,
    rut: buildValidChileanRut(),
    pin: "2468",
  };

  const payload = {
    id: emp.id,
    name: emp.name,
    rut: emp.rut,
    position: "QA Security",
    area: "QA",
    workdayType: "Ordinaria",
    pin: emp.pin,
  };

  let res = await request.post(`${API_BASE}/employees`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  if (res.status() === 401) {
    token = await getAdminToken(request, true);
    res = await request.post(`${API_BASE}/employees`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    });
  }
  expect(res.ok(), `create temp employee failed: HTTP ${res.status()}`).toBe(true);
  return emp;
}

async function createTempUser(
  request: APIRequestContext,
  role: "Usuario" | "Reloj_Control" | "Supervisor_Elevado" | "Administrador",
  options?: { employeeId?: string; clearForceChange?: boolean },
): Promise<TempUser> {
  const tag = buildTag();
  const username = `qa_e2e_auth_${tag}`.slice(0, 30);
  const initialSecret = buildTempPassword(tag);
  let token = await getAdminToken(request);

  let createRes = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      username,
      password: initialSecret,
      role,
      ...(options?.employeeId ? { employeeId: options.employeeId } : {}),
    },
  });
  if (createRes.status() === 401) {
    token = await getAdminToken(request, true);
    createRes = await request.post(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        username,
        password: initialSecret,
        role,
        ...(options?.employeeId ? { employeeId: options.employeeId } : {}),
      },
    });
  }
  expect(createRes.ok(), `create temp user failed: HTTP ${createRes.status()}`).toBe(true);
  const created = (await createRes.json()) as { id: string; username: string; role: string };

  if (options?.clearForceChange) {
    const clearRes = await request.put(`${API_BASE}/users/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password: initialSecret },
    });
    expect(clearRes.ok(), `clear force change failed: HTTP ${clearRes.status()}`).toBe(true);
  }

  return {
    id: created.id,
    username: created.username,
    initialSecret,
    role: created.role,
    employeeId: options?.employeeId,
  };
}

async function cleanupTempEntities(
  request: APIRequestContext,
  options: { userIds?: string[]; employeeIds?: string[]; tokens?: string[] },
): Promise<void> {
  for (const tok of options.tokens ?? []) {
    await request
      .post(`${API_BASE}/auth/logout`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      .catch(() => {});
  }

  const adminToken = await getAdminToken(request).catch(() => null);
  if (!adminToken) return;
  const headers = { Authorization: `Bearer ${adminToken}` };

  for (const empId of options.employeeIds ?? []) {
    const recRes = await request
      .get(`${API_BASE}/records?employeeId=${empId}&pageSize=50`, { headers })
      .catch(() => null);
    if (recRes && recRes.ok()) {
      const body = (await recRes.json()) as { data?: Array<{ id: string }> };
      const list = Array.isArray(body) ? body : (body.data ?? []);
      for (const rec of list) {
        await request.delete(`${API_BASE}/records/${rec.id}`, { headers }).catch(() => {});
      }
    }
  }

  for (const userId of options.userIds ?? []) {
    await request.delete(`${API_BASE}/users/${userId}`, { headers }).catch(() => {});
  }

  for (const empId of options.employeeIds ?? []) {
    await request
      .put(`${API_BASE}/employees/${empId}`, {
        headers,
        data: { status: "Archivado" },
      })
      .catch(() => {});
  }
}

async function uiLogin(page: Page, username: string, secret: string): Promise<void> {
  await page.goto("/#/");
  await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });
  await page.fill("#username", username);
  await page.fill("#password", secret);
  await page.locator('[data-testid="login-submit"]').click();
}

test.describe("Auth, MFA, Session Lifecycle & Kiosk Security (Phase 4)", () => {
  test.setTimeout(120000);

  test("mustChangePassword: difiere sync/navegación, mantiene modal bloqueante y navega por rol al guardar", async ({
    page,
    request,
  }) => {
    const roles: Array<{
      role: "Reloj_Control" | "Supervisor_Elevado" | "Usuario";
      expectedPath: RegExp;
      needsEmployee: boolean;
    }> = [
      {
        role: "Reloj_Control",
        expectedPath: /#\/(dashboard|dashboard-supervisor)/,
        needsEmployee: false,
      },
      {
        role: "Supervisor_Elevado",
        expectedPath: /#\/(dashboard|dashboard-supervisor)/,
        needsEmployee: false,
      },
      { role: "Usuario", expectedPath: /#\/worker-portal/, needsEmployee: true },
    ];

    const createdUserIds: string[] = [];
    const createdEmployeeIds: string[] = [];
    const capturedTokens: string[] = [];

    try {
      for (const entry of roles) {
        const tag = buildTag();
        let employeeId: string | undefined;
        if (entry.needsEmployee) {
          const emp = await createTempEmployee(request, tag);
          employeeId = emp.id;
          createdEmployeeIds.push(emp.id);
        }

        const user = await createTempUser(request, entry.role, {
          employeeId,
          clearForceChange: false,
        });
        createdUserIds.push(user.id);

        const protectedRequestsBeforeChange: string[] = [];
        const forbiddenResponses: Array<{ url: string; status: number }> = [];
        let forceChangeCompleted = false;

        const onRequest = (req: import("@playwright/test").Request) => {
          const url = req.url();
          if (forceChangeCompleted) return;
          if (
            /\/api\/(users|employees(?!\/kiosk)|records|configs(?!\/public|\/is_control_interno_enabled)|holidays|kpis|shifts|corrections|notes|audit-logs)/.test(
              url,
            )
          ) {
            protectedRequestsBeforeChange.push(`${req.method()} ${url}`);
          }
        };
        const onResponse = (res: import("@playwright/test").Response) => {
          if (res.status() === 403) {
            forbiddenResponses.push({ url: res.url(), status: res.status() });
          }
        };

        page.on("response", onResponse);

        try {
          await page.goto("/#/");
          await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });
          await expect
            .poll(() => page.evaluate(() => sessionStorage.getItem("authToken")), {
              timeout: 10000,
            })
            .toBeNull();
          await page.fill("#username", user.username);
          await page.fill("#password", user.initialSecret);

          page.on("request", onRequest);
          const loginResponsePromise = page.waitForResponse(
            (res) => res.url().includes("/api/auth/login") && res.request().method() === "POST",
          );
          await page.locator('[data-testid="login-submit"]').click();
          const loginResponse = await loginResponsePromise;
          expect(loginResponse.status()).toBe(200);
          const loginJson = (await loginResponse.json()) as {
            role: string;
            mustChangePassword: boolean;
            token?: string;
          };
          expect(loginJson.role).toBe(entry.role);
          expect(loginJson.mustChangePassword).toBe(true);
          if (loginJson.token) capturedTokens.push(loginJson.token);

          const modalHeading = page.getByRole("dialog", {
            name: /cambio de contraseña requerido/i,
          });
          await expect(modalHeading).toBeVisible({ timeout: 15000 });

          // Permanece en login sin montar shell ni disparar sync antes de cambiar clave
          await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0);
          await expect(page).toHaveURL(/#\/(\?.*)?$/);

          // Modal bloqueante: Escape y clic en backdrop no cierran
          await page.keyboard.press("Escape");
          await page.mouse.click(10, 10);
          await expect(modalHeading).toBeVisible();
          expect(protectedRequestsBeforeChange).toEqual([]);

          const updatedSecret = buildTempPassword(`${tag}New`);
          await page.fill("#newPassword", updatedSecret);
          await page.fill("#confirmPassword", updatedSecret);

          const updateResponsePromise = page.waitForResponse(
            (res) =>
              res.url().includes(`/api/users/${user.id}`) && res.request().method() === "PUT",
          );
          forceChangeCompleted = true;
          await page.getByRole("button", { name: /establecer nueva contraseña/i }).click();
          const updateResponse = await updateResponsePromise;
          expect(updateResponse.status()).toBe(200);

          await expect(modalHeading).not.toBeVisible({ timeout: 15000 });
          await expect(page).toHaveURL(entry.expectedPath, { timeout: 30000 });
          await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 30000 });
          expect(forbiddenResponses).toEqual([]);

          // Logout limpio para siguiente iteración de rol
          const currentTok = await page.evaluate(() => sessionStorage.getItem("authToken"));
          if (currentTok) capturedTokens.push(currentTok);
          await page.locator('[data-testid="header-logout-button"]').click();
          await expect(page.locator("#username")).toBeVisible({ timeout: 15000 });
          await expect
            .poll(() => page.evaluate(() => sessionStorage.getItem("authToken")), {
              timeout: 10000,
            })
            .toBeNull();
        } finally {
          page.off("request", onRequest);
          page.off("response", onResponse);
        }
      }
    } finally {
      await cleanupTempEntities(request, {
        userIds: createdUserIds,
        employeeIds: createdEmployeeIds,
        tokens: capturedTokens,
      });
    }
  });

  test("ChangePasswordModal en rol no-admin (Usuario): actualiza clave sin GET /api/users ni HTTP 403", async ({
    page,
    request,
  }) => {
    const tag = buildTag();
    const emp = await createTempEmployee(request, tag);
    const worker = await createTempUser(request, "Usuario", {
      employeeId: emp.id,
      clearForceChange: true,
    });
    const capturedTokens: string[] = [];

    try {
      const usersGetRequests: string[] = [];
      const forbiddenResponses: string[] = [];
      page.on("request", (req) => {
        if (req.method() === "GET" && /\/api\/users(\?|$)/.test(req.url())) {
          usersGetRequests.push(req.url());
        }
      });
      page.on("response", (res) => {
        if (res.status() === 403) forbiddenResponses.push(`${res.status()} ${res.url()}`);
      });

      await uiLogin(page, worker.username, worker.initialSecret);
      await expect(page).toHaveURL(/#\/worker-portal/, { timeout: 30000 });
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator("#initial-sync-overlay")).toHaveCount(0, { timeout: 20000 });

      const tok = await page.evaluate(() => sessionStorage.getItem("authToken"));
      if (tok) capturedTokens.push(tok);

      await page.locator('[data-testid="user-menu-button"]').click();
      await expect(page.locator('[data-testid="mfa-setup-button"]')).toHaveCount(0);
      await page.locator('[data-testid="security-modal-button"]').click();

      const modalTitle = page.getByRole("heading", { name: /cambiar mi contraseña/i });
      await expect(modalTitle).toBeVisible({ timeout: 10000 });

      const updatedSecret = buildTempPassword(`${tag}Self`);
      await page.fill("#newPassword", updatedSecret);
      await page.fill("#confirmPassword", updatedSecret);

      const updatePromise = page.waitForResponse(
        (res) => res.url().includes(`/api/users/${worker.id}`) && res.request().method() === "PUT",
      );
      await page.getByRole("button", { name: /guardar cambios/i }).click();
      const updateRes = await updatePromise;
      expect(updateRes.status()).toBe(200);

      await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
      expect(usersGetRequests).toEqual([]);
      expect(forbiddenResponses).toEqual([]);

      // Verifica que la nueva contraseña funciona en login API
      const verifyLogin = await request.post(`${API_BASE}/auth/login`, {
        data: { username: worker.username, password: updatedSecret },
      });
      expect(verifyLogin.status()).toBe(200);
      const verifyBody = (await verifyLogin.json()) as { token?: string };
      if (verifyBody.token) capturedTokens.push(verifyBody.token);
    } finally {
      await cleanupTempEntities(request, {
        userIds: [worker.id],
        employeeIds: [emp.id],
        tokens: capturedTokens,
      });
    }
  });

  test("MFA en UI con Administrador temporal: visibilidad de mfa-setup-button, enrolamiento, backdrop no cierra y toast de bienvenida", async ({
    page,
    request,
  }) => {
    const nonAdmin = await createTempUser(request, "Supervisor_Elevado", {
      clearForceChange: true,
    });
    const tempAdmin = await createTempUser(request, "Administrador", {
      clearForceChange: true,
    });
    const capturedTokens: string[] = [];

    try {
      // 1. No-admin no ve mfa-setup-button
      await uiLogin(page, nonAdmin.username, nonAdmin.initialSecret);
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 30000 });
      await page.locator('[data-testid="user-menu-button"]').click();
      await expect(page.locator('[data-testid="user-menu-dropdown"]')).toBeVisible({
        timeout: 5000,
      });
      await expect(page.locator('[data-testid="mfa-setup-button"]')).toHaveCount(0);
      await page.locator('[data-testid="dropdown-logout-button"]').click();
      await expect(page.locator("#username")).toBeVisible({ timeout: 15000 });

      // 2. Administrador temporal sin MFA ve mfa-setup-button y completa enrolamiento
      await uiLogin(page, tempAdmin.username, tempAdmin.initialSecret);
      await expect(page).toHaveURL(/#\/(dashboard|dashboard-supervisor)/, { timeout: 30000 });
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });

      await page.locator('[data-testid="user-menu-button"]').click();
      const mfaBtn = page.locator('[data-testid="mfa-setup-button"]');
      await expect(mfaBtn).toBeVisible({ timeout: 5000 });
      await expect(mfaBtn).toContainText(/configurar mfa/i);
      await mfaBtn.click();

      const setupModal = page.locator('[data-testid="mfa-setup-modal"]');
      await expect(setupModal).toBeVisible({ timeout: 10000 });

      const setupResPromise = page.waitForResponse(
        (res) => res.url().includes("/api/auth/mfa/setup") && res.request().method() === "POST",
      );
      await setupModal.getByRole("button", { name: /comenzar configuración/i }).click();
      const setupRes = await setupResPromise;
      expect(setupRes.status()).toBe(200);

      const secretEl = setupModal.locator("code");
      await expect(secretEl).toBeVisible({ timeout: 10000 });
      const base32Secret = ((await secretEl.textContent()) || "").trim();
      expect(base32Secret.length).toBeGreaterThanOrEqual(16);

      await setupModal.getByRole("button", { name: /ya escaneé el código/i }).click();
      const setupInput = page.locator('[data-testid="mfa-setup-form"] input');
      await expect(setupInput).toBeVisible({ timeout: 5000 });
      await setupInput.fill(generateTotp(base32Secret));

      const verifyResPromise = page.waitForResponse(
        (res) => res.url().includes("/api/auth/mfa/verify") && res.request().method() === "POST",
      );
      await setupModal.getByRole("button", { name: /habilitar mfa/i }).click();
      const verifyRes = await verifyResPromise;
      expect(verifyRes.status()).toBe(200);

      await expect(setupModal).not.toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/mfa configurado y habilitado correctamente/i)).toBeVisible({
        timeout: 10000,
      });

      // Tras habilitar MFA, mfa-setup-button desaparece del menú
      await page.locator('[data-testid="user-menu-button"]').click();
      await expect(page.locator('[data-testid="user-menu-dropdown"]')).toBeVisible({
        timeout: 5000,
      });
      await expect(page.locator('[data-testid="mfa-setup-button"]')).toHaveCount(0);

      await page.locator('[data-testid="dropdown-logout-button"]').click();
      await expect(page.locator("#username")).toBeVisible({ timeout: 15000 });

      // 3. Siguiente login abre mfa-login-modal; clic en backdrop NO cierra; TOTP válido autentica y muestra toast de bienvenida
      await uiLogin(page, tempAdmin.username, tempAdmin.initialSecret);
      const mfaLoginModal = page.locator('[data-testid="mfa-login-modal"]');
      await expect(mfaLoginModal).toBeVisible({ timeout: 15000 });

      await page.mouse.click(10, 10);
      await expect(mfaLoginModal).toBeVisible();

      const loginCodeInput = page.locator('[data-testid="mfa-login-form"] input');
      await loginCodeInput.fill(generateTotp(base32Secret));

      const validatePromise = page.waitForResponse(
        (res) => res.url().includes("/api/auth/mfa/validate") && res.request().method() === "POST",
      );
      await mfaLoginModal.getByRole("button", { name: /confirmar/i }).click();
      const validateRes = await validatePromise;
      expect(validateRes.status()).toBe(200);
      const validateBody = (await validateRes.json()) as { token?: string };
      if (validateBody.token) capturedTokens.push(validateBody.token);

      await expect(page).toHaveURL(/#\/(dashboard|dashboard-supervisor)/, { timeout: 30000 });
      await expect(page.getByText(`¡Bienvenido, ${tempAdmin.username}!`)).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await cleanupTempEntities(request, {
        userIds: [nonAdmin.id, tempAdmin.id],
        tokens: capturedTokens,
      });
    }
  });

  test("restauración sin authToken (currentUser huérfano): redirige a #/ con 0 respuestas 401", async ({
    page,
  }) => {
    const unauthorizedResponses: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() === 401) {
        unauthorizedResponses.push({ status: res.status(), url: res.url() });
      }
    });

    await page.addInitScript(() => {
      sessionStorage.removeItem("authToken");
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: "qa-orphan-user",
          username: "qa_e2e_auth_orphan",
          role: "Administrador",
          employeeId: null,
          isDeleted: false,
          lastModified: Date.now(),
          syncStatus: "synced",
        }),
      );
    });

    await page.goto("/#/dashboard");
    await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/#\/(\?.*)?$/);
    await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0);

    const remainingUser = await page.evaluate(() => sessionStorage.getItem("currentUser"));
    expect(remainingUser).toBeNull();
    expect(unauthorizedResponses).toEqual([]);
  });

  test("SessionExpiredOverlay ante 401 y ante auth:force_logout, más POST /api/auth/logout con Bearer en logout UI", async ({
    browser,
    request,
  }) => {
    const userLogout = await createTempUser(request, "Supervisor_Elevado", {
      clearForceChange: true,
    });
    const user401 = await createTempUser(request, "Supervisor_Elevado", {
      clearForceChange: true,
    });
    const userForce = await createTempUser(request, "Supervisor_Elevado", {
      clearForceChange: true,
    });
    const adminToken = await getAdminToken(request);

    try {
      // A) Logout UI envía POST /api/auth/logout con Bearer ANTES de limpiar token
      const ctxLogout = await browser.newContext();
      try {
        const page = await ctxLogout.newPage();
        await uiLogin(page, userLogout.username, userLogout.initialSecret);
        await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 30000 });

        const preLogoutToken = await page.evaluate(() => sessionStorage.getItem("authToken"));
        expect(preLogoutToken).toBeTruthy();

        let logoutAuthHeader: string | undefined;
        page.on("request", (req) => {
          if (req.url().includes("/api/auth/logout") && req.method() === "POST") {
            logoutAuthHeader = req.headers()["authorization"];
          }
        });

        const logoutResPromise = page.waitForResponse(
          (res) => res.url().includes("/api/auth/logout") && res.request().method() === "POST",
        );
        await page.locator('[data-testid="header-logout-button"]').click();
        const logoutRes = await logoutResPromise;
        expect(logoutRes.status()).toBe(200);
        expect(logoutAuthHeader).toBe(`Bearer ${preLogoutToken}`);

        await expect(page.locator("#username")).toBeVisible({ timeout: 15000 });
        const afterStorage = await page.evaluate(() => ({
          token: sessionStorage.getItem("authToken"),
          user: sessionStorage.getItem("currentUser"),
        }));
        expect(afterStorage.token).toBeNull();
        expect(afterStorage.user).toBeNull();

        // El token previo queda invalidado en backend
        const probeOld = await request.get(`${API_BASE}/configs`, {
          headers: { Authorization: `Bearer ${preLogoutToken}` },
        });
        expect(probeOld.status()).toBe(401);
      } finally {
        await ctxLogout.close();
      }

      // B) SessionExpiredOverlay ante HTTP 401 (socket bloqueado para aislar ruta 401 -> unauthorized)
      const ctx401 = await browser.newContext();
      try {
        const page = await ctx401.newPage();
        await page.route("**/socket.io/**", (route) => route.abort());
        await uiLogin(page, user401.username, user401.initialSecret);
        await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 30000 });

        await page.goto("/#/dashboard-supervisor?tab=kpis");
        const calcBtn = page.getByRole("button", { name: /calcular métricas/i });
        await expect(calcBtn).toBeVisible({ timeout: 20000 });

        const purgeRes = await request.post(`${API_BASE}/admin/purge-sessions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { username: user401.username },
        });
        expect(purgeRes.status()).toBe(200);

        await calcBtn.click();
        const overlay = page.locator('[data-testid="session-expired-overlay"]');
        await expect(overlay).toBeVisible({ timeout: 10000 });
        await expect(overlay).toHaveCount(1);
        const shownAt = Date.now();
        await page.waitForTimeout(1500);
        await expect(overlay).toBeVisible();

        await expect(page.locator("#username")).toBeVisible({ timeout: 15000 });
        expect(Date.now() - shownAt).toBeGreaterThanOrEqual(2500);
        const storage401 = await page.evaluate(() => ({
          token: sessionStorage.getItem("authToken"),
          user: sessionStorage.getItem("currentUser"),
        }));
        expect(storage401.token).toBeNull();
        expect(storage401.user).toBeNull();
      } finally {
        await ctx401.close();
      }

      // C) SessionExpiredOverlay ante expulsión Socket.IO auth:force_logout
      const ctxForce = await browser.newContext();
      try {
        const page = await ctxForce.newPage();
        const wsConnected = new Promise<void>((resolve) => {
          page.on("websocket", (ws) => {
            if (ws.url().includes("socket.io")) {
              ws.on("framereceived", (frame) => {
                if (typeof frame.payload === "string" && frame.payload.startsWith("40")) {
                  resolve();
                }
              });
            }
          });
        });

        await uiLogin(page, userForce.username, userForce.initialSecret);
        await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 30000 });
        await Promise.race([wsConnected, page.waitForTimeout(4000)]);

        const purgeRes = await request.post(`${API_BASE}/admin/purge-sessions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { username: userForce.username },
        });
        expect(purgeRes.status()).toBe(200);

        const overlay = page.locator('[data-testid="session-expired-overlay"]');
        await expect(overlay).toBeVisible({ timeout: 10000 });
        await expect(overlay).toHaveCount(1);
        const shownAt = Date.now();
        await page.waitForTimeout(1500);
        await expect(overlay).toBeVisible();

        await expect(page.locator("#username")).toBeVisible({ timeout: 15000 });
        expect(Date.now() - shownAt).toBeGreaterThanOrEqual(2500);
        const storageForce = await page.evaluate(() => ({
          token: sessionStorage.getItem("authToken"),
          user: sessionStorage.getItem("currentUser"),
        }));
        expect(storageForce.token).toBeNull();
        expect(storageForce.user).toBeNull();
      } finally {
        await ctxForce.close();
      }
    } finally {
      await cleanupTempEntities(request, {
        userIds: [userLogout.id, user401.id, userForce.id],
      });
    }
  });

  test("Kiosko (#/kiosk): aísla kioskToken sin pisar authToken del portal y limpia al salir sin 403", async ({
    page,
    request,
  }) => {
    const tag = buildTag();
    const emp = await createTempEmployee(request, tag);
    const worker = await createTempUser(request, "Usuario", {
      employeeId: emp.id,
      clearForceChange: true,
    });
    const capturedTokens: string[] = [];

    try {
      const forbiddenResponses: string[] = [];
      page.on("response", (res) => {
        if (res.status() === 403) forbiddenResponses.push(`${res.status()} ${res.url()}`);
      });

      // 1. Sesión portal previa en sessionStorage
      await uiLogin(page, worker.username, worker.initialSecret);
      await expect(page).toHaveURL(/#\/worker-portal/, { timeout: 30000 });
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator("#initial-sync-overlay")).toHaveCount(0, { timeout: 20000 });

      const portalToken = await page.evaluate(() => sessionStorage.getItem("authToken"));
      expect(portalToken).toBeTruthy();
      if (portalToken) capturedTokens.push(portalToken);

      // 2. Ir a /#/kiosk y autenticar PIN
      await page.goto("/#/kiosk");
      await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
        timeout: 20000,
      });
      await page.getByText(/seleccionar de la lista/i).click();
      const search = page.getByPlaceholder("BUSCAR POR NOMBRE...");
      await expect(search).toBeVisible({ timeout: 10000 });
      await search.fill(emp.name);
      await page.getByRole("button", { name: new RegExp(emp.name, "i") }).click();
      await expect(page.locator('[data-testid="kiosk-step"][data-step="pin_input"]')).toBeVisible({
        timeout: 10000,
      });

      const kioskLoginPromise = page.waitForResponse(
        (res) => res.url().includes("/api/auth/kiosk-login") && res.request().method() === "POST",
      );
      for (const digit of emp.pin.split("")) {
        await page.locator(`[data-testid="kiosk-key-${digit}"]`).click();
      }
      const kioskLoginRes = await kioskLoginPromise;
      expect(kioskLoginRes.status()).toBe(200);

      await expect(page.locator('[data-testid="kiosk-step"][data-step="actions"]')).toBeVisible({
        timeout: 15000,
      });

      const tokensInKiosk = await page.evaluate(() => ({
        authToken: sessionStorage.getItem("authToken"),
        kioskToken: sessionStorage.getItem("kioskToken"),
      }));
      expect(tokensInKiosk.authToken).toBe(portalToken);
      expect(tokensInKiosk.kioskToken).toBeTruthy();
      const kioskPayload = decodeJwtPayload(tokensInKiosk.kioskToken as string);
      expect(kioskPayload.role).toBe("Kiosk_Employee");
      expect(kioskPayload.employeeId).toBe(emp.id);

      // 3. Reset ("Atrás") limpia kioskToken preservando authToken
      await page.getByRole("button", { name: /atrás/i }).click();
      await expect(page.locator('[data-testid="kiosk-step"][data-step="rut_input"]')).toBeVisible({
        timeout: 10000,
      });
      const tokensAfterReset = await page.evaluate(() => ({
        authToken: sessionStorage.getItem("authToken"),
        kioskToken: sessionStorage.getItem("kioskToken"),
      }));
      expect(tokensAfterReset.kioskToken).toBeNull();
      expect(tokensAfterReset.authToken).toBe(portalToken);

      // 4. Salir con kiosk-exit-button regresa al portal sin kioskToken ni HTTP 403
      await page.locator('[data-testid="kiosk-exit-button"]').click();
      await expect(page).toHaveURL(/#\/worker-portal/, { timeout: 30000 });
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });

      const tokensBackInPortal = await page.evaluate(() => ({
        authToken: sessionStorage.getItem("authToken"),
        kioskToken: sessionStorage.getItem("kioskToken"),
      }));
      expect(tokensBackInPortal.kioskToken).toBeNull();
      expect(tokensBackInPortal.authToken).toBe(portalToken);
      expect(forbiddenResponses).toEqual([]);
    } finally {
      await cleanupTempEntities(request, {
        userIds: [worker.id],
        employeeIds: [emp.id],
        tokens: capturedTokens,
      });
    }
  });

  test("Exportación (/api/records/export): usa Authorization Bearer y 0 parámetros ?token=", async ({
    page,
    request,
  }) => {
    const tag = buildTag();
    const emp = await createTempEmployee(request, tag);
    const tempUser = await createTempUser(request, "Supervisor_Elevado", {
      clearForceChange: true,
    });
    const capturedTokens: string[] = [];

    try {
      const adminToken = await getAdminToken(request);
      const punchRes = await request.post(`${API_BASE}/records/punch`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { employeeId: emp.id, source: "WEB", forcedType: "entrada" },
      });
      expect(punchRes.ok(), `seed punch failed: HTTP ${punchRes.status()}`).toBe(true);

      await uiLogin(page, tempUser.username, tempUser.initialSecret);
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator("#initial-sync-overlay")).toHaveCount(0, { timeout: 20000 });
      const tok = await page.evaluate(() => sessionStorage.getItem("authToken"));
      expect(tok).toBeTruthy();
      if (tok) capturedTokens.push(tok);

      await page.goto("/#/time-control");
      const deferredTable = page.locator('[data-testid="deferred-time-record-table"]');
      await expect(deferredTable).toBeVisible({ timeout: 30000 });
      await deferredTable.scrollIntoViewIfNeeded();
      const exportTrigger = page.getByRole("button", { name: /exportar datos/i });
      await expect(exportTrigger).toBeVisible({ timeout: 30000 });
      await exportTrigger.click();

      let exportRequestAuth: string | undefined;
      let exportRequestUrl = "";
      page.on("request", (req) => {
        if (req.url().includes("/api/records/export")) {
          exportRequestUrl = req.url();
          exportRequestAuth = req.headers()["authorization"];
        }
      });

      const downloadPromise = page.waitForEvent("download");
      const exportResPromise = page.waitForResponse(
        (res) => res.url().includes("/api/records/export") && res.request().method() === "GET",
      );
      await page.getByRole("button", { name: /standard csv/i }).click();

      const [exportRes, download] = await Promise.all([exportResPromise, downloadPromise]);
      expect(exportRes.status()).toBe(200);
      expect(exportRequestUrl).toContain("/api/records/export");
      expect(exportRequestUrl).not.toMatch(/[?&]token=/);
      expect(new URL(exportRequestUrl).searchParams.has("token")).toBe(false);
      expect(exportRequestAuth).toBe(`Bearer ${tok}`);
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|xml)$/i);

      // Control negativo: query ?token= rechazado con 401 en backend
      const legacyTokenQueryRes = await request.get(
        `${API_BASE}/records/export?startDate=2026-11-01&endDate=2026-11-16&format=csv&token=${encodeURIComponent(tok!)}`,
      );
      expect(legacyTokenQueryRes.status()).toBe(401);
    } finally {
      await cleanupTempEntities(request, {
        userIds: [tempUser.id],
        employeeIds: [emp.id],
        tokens: capturedTokens,
      });
    }
  });
});
