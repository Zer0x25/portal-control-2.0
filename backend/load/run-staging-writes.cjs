// Fase 4: runner de escrituras contra staging (spec 005 fase 4) + TD-003.
// Worker único de factoría: crea empleado+usuario, corre el escenario de
// marcaciones contra ESE empleado (Artillery recibe LOAD_EMPLOYEE_ID) y
// dispone todo (records + usuario). Ya no toca EMP001. npm run load:staging:writes
const { spawnSync } = require("node:child_process");
const { api, createWorker, disposeWorker } = require("./e2e-worker.cjs");

const TARGET = process.env.LOAD_TARGET || "http://127.0.0.1:8080";
const API = `${TARGET}/api`;

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

  const worker = await createWorker(API, adminToken);
  console.log(`👷 Worker de carga: ${worker.username} / ${worker.employeeId}`);

  try {
    const result = spawnSync("npx", ["artillery", "run", "load/staging-writes.yaml"], {
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
    console.log("🧹 Worker de carga dispuesto (records + usuario)");
    await api(API, adminToken, `/auth/logout`, { method: "POST" }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`load:staging:writes: ${err.message}`);
  process.exit(1);
});
