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
}

function suffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 0xffffff).toString(36)}`;
}

export async function createWorker(
  request: APIRequestContext,
  adminToken: string,
): Promise<E2EWorker> {
  const apiBase = process.env.E2E_API_URL || "http://127.0.0.1:8080/api";
  const headers = { Authorization: `Bearer ${adminToken}` };
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

  const empRes = await request.post(`${apiBase}/employees`, {
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
    await request.delete(`${apiBase}/users/${worker.userId}`, { headers });
  }
}

// loginFast con credenciales explícitas (auth-helper solo soporta admin/worker fijos).
export async function loginAs(
  page: Page,
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<void> {
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
}
