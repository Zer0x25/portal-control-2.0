import { Page, APIRequestContext, expect } from "@playwright/test";

// Presupuesto calibrado en spec 004 fase 3 (2026-10-03): el boot real es
// ~14s en dev tibio y hasta ~30s en frío (build + seed + Vite compile).
// Los 10s/15s originales fallaban siempre; 30s/60s igual que smoke.spec.ts.
export async function login(page: Page, username?: string, password?: string) {
  const finalUsername = username || process.env.E2E_ADMIN_USERNAME || "admin";
  const finalPassword = password || process.env.E2E_ADMIN_PASSWORD || "999.666";

  await page.goto("/");

  // Wait for the page to load and selectors to be available
  await expect(page.locator("#username")).toBeVisible({ timeout: 30000 });

  await page.fill("#username", finalUsername);
  await page.fill("#password", finalPassword);

  // The submit click can land before React hydration attaches the handler
  // (dev cold-boot compiles chunks lazily): retry the click while the
  // login form is still on screen, up to ~60s total like the smoke spec.
  let loggedIn = false;
  for (let attempt = 0; attempt < 3 && !loggedIn; attempt++) {
    await page.getByRole("button", { name: /acceder al portal/i }).click();
    try {
      await expect(page).toHaveURL(
        /(dashboard|time-control|configuration|admin\/tools|worker-portal|theoretical-shifts|shift-calendar)/,
        { timeout: 20000 },
      );
      loggedIn = true;
    } catch {
      if (attempt === 2) throw new Error(`login: no redirect after 3 attempts (${finalUsername})`);
    }
  }
}

export type E2ERole = "admin" | "worker";

const ROLE_CREDS: Record<E2ERole, { username: string; password: string }> = {
  admin: {
    username: process.env.E2E_ADMIN_USERNAME || "admin",
    password: process.env.E2E_ADMIN_PASSWORD || "999.666",
  },
  worker: { username: "juan.perez", password: "123456" },
};

// Login rápido (post-004): autentica por API (~200ms) y siembra
// sessionStorage ANTES de navegar, replicando lo que guarda el slice de
// auth tras un login UI (`authToken` + `currentUser` → `_verifyAuth`
// restaura sesión sin roundtrip). Evita pagar el boot de Vite (~20s) en
// la página de login en cada test. El smoke mantiene el login UI real
// como gate de la ruta crítica; todo lo demás usa esto.
export async function loginFast(page: Page, request: APIRequestContext, role: E2ERole) {
  const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:4000/api";
  const { username, password } = ROLE_CREDS[role];
  const res = await request.post(`${apiBase}/auth/login`, { data: { username, password } });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  if (body.mustChangePassword === true) {
    throw new Error(`loginFast: ${username} requires password change, UI flow needed`);
  }
  const user = {
    id: body.userId,
    username: body.username,
    role: body.role,
    employeeId: body.employeeId ?? null,
    isDeleted: false,
    lastModified: Date.now(),
    syncStatus: "synced",
  };
  await page.addInitScript(
    ({ token, storedUser }: { token: string; storedUser: unknown }) => {
      sessionStorage.setItem("authToken", token);
      sessionStorage.setItem("currentUser", JSON.stringify(storedUser));
    },
    { token: body.token, storedUser: user },
  );
}
