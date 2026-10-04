// TD-003: factoría de workers únicos para los runners de carga (contraparte
// CJS de frontend/e2e/helpers/worker-factory.ts). Crea empleado+usuario vía
// API pública con el token admin, salda el flag de cambio de password
// (spec 002 H-06) y devuelve creds + token. Dispose borra records y usuario;
// la fila del empleado queda (sin DELETE /api/employees), área `E2E`.
async function api(base, token, path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path}: HTTP ${res.status} ${body.message || ""}`);
  }
  return body;
}

function tag() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 0xffffff).toString(36)}`;
}

async function createWorker(base, adminToken) {
  const t = tag().toUpperCase();
  const employeeId = `E2EL-${t}`;
  const username = `e2e.load.${t}`.toLowerCase().slice(0, 30);
  const password = process.env.E2E_FACTORY_PASSWORD || "e2e-worker-123";
  const pin = "2468";

  await api(base, adminToken, "/employees", {
    method: "POST",
    body: JSON.stringify({
      id: employeeId,
      name: `E2E Load ${t}`,
      rut: `90${String(Math.floor(Math.random() * 9000000) + 1000000)}-${Math.floor(Math.random() * 10)}`,
      position: "Operador E2E",
      area: "E2E",
      workdayType: "Ordinaria",
      pin,
    }),
  });
  const user = await api(base, adminToken, "/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role: "Usuario", employeeId }),
  });
  // Salda isForcePasswordChange (UpdateUserSchema no expone el flag directo).
  await api(base, adminToken, `/users/${user.id}`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  });
  const login = await api(base, null, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (login.mustChangePassword === true) throw new Error("factory worker exige cambio de clave");
  return { employeeId, username, userId: user.id, token: login.token };
}

async function disposeWorker(base, adminToken, worker) {
  const list = await api(base, adminToken, `/records?employeeId=${worker.employeeId}&pageSize=50`);
  const recs = Array.isArray(list) ? list : (list.records ?? list.data ?? []);
  for (const r of recs) {
    await api(base, adminToken, `/records/${r.id}`, { method: "DELETE" });
  }
  await api(base, adminToken, `/users/${worker.userId}`, { method: "DELETE" });
  await api(base, worker.token, "/auth/logout", { method: "POST" }).catch(() => {});
}

module.exports = { api, createWorker, disposeWorker };
