import { expect, type APIRequestContext, type Page } from "@playwright/test";

// TD-003: factoría de workers únicos para e2e. Cada test que ficha crea su
// propio empleado+usuario vía API pública (sin tocar el seed legacy
// EMP001/juan.perez), lo usa y lo limpia. Quita la colisión de jornada
// única por empleado/día y el slot único de sesión del rol Usuario.
//
// Residual conocido: no existe DELETE /api/employees, así que la fila del
// empleado queda en staging (nombre/área `E2E`, identificable para purga).

export interface E2EWorker {
  employeeId: string;
  employeeName: string;
  username: string;
  password: string;
  pin: string;
  userId: string;
  token?: string;
}

// Un login admin por proceso de Playwright: loginFast crea una sesión por
// test y el rol Administrador evicta desde 10 concurrentes (el sweep largo
// caía redirigido a login). Cachear baja el pico de sesiones.
let cachedAdminToken: string | null = null;

export async function getAdminToken(request: APIRequestContext): Promise<string> {
  if (!cachedAdminToken) {
    const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
    const res = await request.post(`${apiBase}/auth/login`, {
      data: {
        username: process.env.E2E_ADMIN_USERNAME || "admin",
        password: process.env.E2E_ADMIN_PASSWORD || "999.666",
      },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    cachedAdminToken = body.token as string;
  }
  return cachedAdminToken;
}

function suffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 0xffffff).toString(36)}`;
}

export async function createWorker(
  request: APIRequestContext,
  adminToken: string,
): Promise<E2EWorker> {
  const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
  let headers = { Authorization: `Bearer ${adminToken}` };
  const tag = suffix();
  // RUT solo necesita min 8 chars a nivel schema; se usa rango sintético 90M+.
  const rut = `90${String(Math.floor(Math.random() * 9000000) + 1000000)}-${Math.floor(Math.random() * 10)}`;
  // El backend persiste el id de empleado en mayúsculas: normalizar aquí o
  // el FK de create-user rebota con 400.
  const employeeId = `E2ET-${tag}`.toUpperCase();
  const worker: E2EWorker = {
    employeeId,
    employeeName: `E2E Kiosk ${tag}`,
    username: `e2e.td003.${tag}`.slice(0, 30),
    password: "e2e-worker-123",
    pin: "2468",
    userId: "",
  };

  let empRes = await request.post(`${apiBase}/employees`, {
    headers,
    data: {
      id: worker.employeeId,
      name: worker.employeeName,
      rut,
      position: "Operador E2E",
      area: "E2E",
      workdayType: "Ordinaria",
      pin: worker.pin,
    },
  });
  // El token admin cacheado puede haber sido evictado por presión de
  // sesiones (límite 10): ante 401 se refresca una vez y se reintenta.
  if (empRes.status() === 401) {
    cachedAdminToken = null;
    headers = { Authorization: `Bearer ${await getAdminToken(request)}` };
    empRes = await request.post(`${apiBase}/employees`, {
      headers,
      data: {
        id: worker.employeeId,
        name: worker.employeeName,
        rut,
        position: "Operador E2E",
        area: "E2E",
        workdayType: "Ordinaria",
        pin: worker.pin,
      },
    });
  }
  expect(empRes.ok(), `create employee: HTTP ${empRes.status()}`).toBe(true);

  const userRes = await request.post(`${apiBase}/users`, {
    headers,
    data: {
      username: worker.username,
      password: worker.password,
      role: "Usuario",
      employeeId: worker.employeeId,
    },
  });
  expect(userRes.ok(), `create user: HTTP ${userRes.status()}`).toBe(true);
  const userBody = await userRes.json();
  worker.userId = (userBody.id ?? userBody.userId ?? userBody.user?.id) as string;
  expect(worker.userId, "create user: sin id en respuesta").toBeTruthy();

  // Los usuarios creados nacen con isForcePasswordChange=true y el login
  // devuelve mustChangePassword (loginFast/loginAs lo rechazan). Spec 002
  // H-06: re-setear el password salda el flag (UpdateUserSchema no expone
  // el flag directo, solo vía password).
  const clearRes = await request.put(`${apiBase}/users/${worker.userId}`, {
    headers,
    data: { password: worker.password },
  });
  expect(clearRes.ok(), `clear force-password: HTTP ${clearRes.status()}`).toBe(true);
  return worker;
}

export async function disposeWorker(
  request: APIRequestContext,
  adminToken: string,
  worker: E2EWorker,
): Promise<void> {
  const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
  const headers = { Authorization: `Bearer ${adminToken}` };
  const listRes = await request.get(
    `${apiBase}/records?employeeId=${worker.employeeId}&pageSize=50`,
    { headers },
  );
  if (listRes.ok()) {
    const body = await listRes.json();
    const recs = Array.isArray(body) ? body : (body.records ?? body.data ?? []);
    for (const rec of recs) {
      await request.delete(`${apiBase}/records/${rec.id}`, { headers });
    }
  }
  if (worker.userId) {
    if (worker.token) {
      await request.post(`${apiBase}/auth/logout`, {
        headers: { Authorization: `Bearer ${worker.token}` },
      });
    }
    await request.delete(`${apiBase}/users/${worker.userId}`, { headers });
  }
}

// Atajo para tests de solo-lectura: crea worker, loguea, corre fn, dispone.
export async function withWorker(
  page: Page,
  request: APIRequestContext,
  fn: (worker: E2EWorker) => Promise<void>,
): Promise<void> {
  const adminToken = await getAdminToken(request);
  const worker = await createWorker(request, adminToken);
  try {
    worker.token = await loginAs(page, request, worker.username, worker.password);
    await fn(worker);
  } finally {
    // Releer: createWorker pudo refrescar el token evictado.
    await disposeWorker(request, await getAdminToken(request), worker);
  }
}
// loginFast con credenciales explícitas (auth-helper solo soporta admin/worker fijos).
// Devuelve el token para que el llamador pueda cerrar la sesión.
export async function loginAs(
  page: Page,
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
  const res = await request.post(`${apiBase}/auth/login`, { data: { username, password } });
  expect(res.ok()).toBe(true);
  const body = await res.json();
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
  return body.token as string;
}
