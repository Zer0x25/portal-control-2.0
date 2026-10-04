// Fase 4: runner de escrituras contra staging (spec 005 fase 4).
// Loguea como admin fuera de Artillery (rate-limit), limpia records de
// hoy de EMP001 antes y después, corre el escenario de marcaciones y
// cierra sesión. npm run load:staging:writes
const { spawnSync } = require("node:child_process");

const TARGET = process.env.LOAD_TARGET || "http://127.0.0.1:8080";
const API = `${TARGET}/api`;

async function api(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function cleanToday(token) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const { body } = await api(token, `/records?employeeId=EMP001&desde=${today}&hasta=${today}`);
  const records = Array.isArray(body) ? body : body.records || body.data || [];
  for (const r of records) await api(token, `/records/${r.id}`, { method: "DELETE" });
  return records.length;
}

async function main() {
  const login = await api("", `/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      username: process.env.E2E_ADMIN_USERNAME || "admin",
      password: process.env.E2E_ADMIN_PASSWORD || "999.666",
    }),
  });
  if (login.status !== 200) throw new Error(`login admin: HTTP ${login.status}`);
  const token = login.body.token;

  const removed = await cleanToday(token);
  console.log(`🧹 Limpiados ${removed} records previos de EMP001`);

  try {
    const result = spawnSync("npx", ["artillery", "run", "load/staging-writes.yaml"], {
      cwd: __dirname + "/..",
      env: {
        ...process.env,
        LOAD_TARGET: TARGET,
        LOAD_ADMIN_TOKEN: token,
        LOAD_TODAY: new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" }),
      },
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  } finally {
    const removedAfter = await cleanToday(token);
    console.log(`🧹 Limpiados ${removedAfter} records de carga`);
    await api(token, `/auth/logout`, { method: "POST" }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`load:staging:writes: ${err.message}`);
  process.exit(1);
});
