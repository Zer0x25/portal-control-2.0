// Soak 15 min contra staging (caza-fugas de sesiones/memoria).
// 1 login admin fuera de Artillery, worker de factoría solo para dar
// LOAD_EMPLOYEE_ID a las queries (su token no se usa: expira en ~2 min).
// Al final: sesiones activas antes/después + dispose + logout.
// npm run load:staging:soak
const { spawnSync } = require("node:child_process");
const { api, createWorker, disposeWorker } = require("./e2e-worker.cjs");

const TARGET = process.env.LOAD_TARGET || "http://127.0.0.1:8080";
const API = `${TARGET}/api`;

async function sessionCount(adminToken) {
  // Sin endpoint de conteo: se mide fuera (psql) — aquí solo health.
  const res = await fetch(`${API}/health`);
  if (!res.ok) throw new Error(`health pre-soak: HTTP ${res.status}`);
}

async function main() {
  const login = await api(API, null, `/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      username: process.env.E2E_ADMIN_USERNAME || "admin",
      password: process.env.E2E_ADMIN_PASSWORD || "999.666",
    }),
  });
  const adminToken = login.token;
  if (!adminToken) throw new Error("login admin: sin token");

  await sessionCount(adminToken);
  const worker = await createWorker(API, adminToken);
  console.log(`👷 Soak employee: ${worker.employeeId} (token worker no usado)`);

  try {
    const result = spawnSync("npx", ["artillery", "run", "load/staging-soak.yaml"], {
      cwd: __dirname + "/..",
      env: {
        ...process.env,
        LOAD_TARGET: TARGET,
        LOAD_ADMIN_TOKEN: adminToken,
        LOAD_EMPLOYEE_ID: worker.employeeId,
        LOAD_TODAY: new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" }),
      },
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  } finally {
    await disposeWorker(API, adminToken, worker);
    await api(API, adminToken, `/auth/logout`, { method: "POST" }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`load:staging:soak: ${err.message}`);
  process.exit(1);
});
