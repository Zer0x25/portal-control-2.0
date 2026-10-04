// Runner pre-release de carga contra staging (spec 005 fase 1).
// Uso: npm run load:staging
// Hace los 2 logins FUERA de Artillery (secuenciales: el rate-limit de
// login en prod es 5/min por ip:user) y pasa los tokens por env al
// escenario, que solo hace lecturas (no ensucia datos, no crea sesiones
// por VU). Al final limpia las 2 sesiones que abrió (logout).
const { spawnSync } = require("node:child_process");
const { api, createWorker, disposeWorker } = require("./e2e-worker.cjs");

const TARGET = process.env.LOAD_TARGET || "http://127.0.0.1:8080";
const API = `${TARGET}/api`;

async function login(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`login ${username}: HTTP ${res.status}`);
  const body = await res.json();
  return body.token;
}

async function logout(token) {
  try {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best-effort: la sesión expira sola
  }
}

async function main() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  // Secuenciales con margen: jti evita colisiones, pero el limiter de
  // login cuenta intentos por ip:user (los éxitos limpian, igual se
  // espacian por seguridad).
  // Worker único de factoría (TD-003): el seed compartido queda solo como
  // compatibilidad; la carga ya no toca EMP001/juan.perez.
  const adminToken = await login(
    process.env.E2E_ADMIN_USERNAME || "admin",
    process.env.E2E_ADMIN_PASSWORD || "999.666",
  );
  await new Promise((r) => setTimeout(r, 2000));
  const worker = await createWorker(API, adminToken);

  try {
    const result = spawnSync("npx", ["artillery", "run", "load/staging-read.yaml"], {
      cwd: __dirname + "/..",
      env: {
        ...process.env,
        LOAD_TARGET: TARGET,
        LOAD_ADMIN_TOKEN: adminToken,
        LOAD_WORKER_TOKEN: worker.token,
        LOAD_EMPLOYEE_ID: worker.employeeId,
        LOAD_TODAY: today,
      },
      stdio: "inherit",
      encoding: "utf8",
    });
    process.exitCode = result.status ?? 1;
  } finally {
    await disposeWorker(API, adminToken, worker);
    await logout(adminToken);
  }
}

main().catch((err) => {
  console.error(`load:staging: ${err.message}`);
  process.exit(1);
});
