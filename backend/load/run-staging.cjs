// Runner pre-release de carga contra staging (spec 005 fase 1).
// Uso: npm run load:staging
// Hace los 2 logins FUERA de Artillery (secuenciales: el rate-limit de
// login en prod es 5/min por ip:user) y pasa los tokens por env al
// escenario, que solo hace lecturas (no ensucia datos, no crea sesiones
// por VU). Al final limpia las 2 sesiones que abrió (logout).
const { spawn } = require("node:child_process");
const { api, createWorker, disposeWorker } = require("./e2e-worker.cjs");

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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

  const tokenDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "portal-load-token-"));
  const tokenFile = path.join(tokenDirectory, "worker.token");
  const saveToken = () => {
    fs.writeFileSync(tokenFile + ".next", worker.token, { mode: 0o600 });
    fs.renameSync(tokenFile + ".next", tokenFile);
  };
  saveToken();
  let renewalTimer;
  let renewing;
  let renewalError;
  try {
    const child = spawn("npx", ["artillery", "run", "load/staging-read.yaml"], {
      cwd: __dirname + "/..",
      env: {
        ...process.env,
        LOAD_TARGET: TARGET,
        LOAD_ADMIN_TOKEN: adminToken,
        LOAD_WORKER_TOKEN: worker.token,
        LOAD_WORKER_TOKEN_FILE: tokenFile,
        LOAD_EMPLOYEE_ID: worker.employeeId,
        LOAD_TODAY: today,
      },
      stdio: "inherit",
      encoding: "utf8",
    });
    const closed = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => resolve(code));
    });
    // Renew outside measured scenarios; preserve the short Usuario JWT lifetime.
    renewalTimer = setInterval(() => {
      if (renewing) return;
      renewing = login(worker.username, process.env.E2E_FACTORY_PASSWORD || "e2e-worker-123")
        .then((token) => {
          worker.token = token;
          saveToken();
        })
        .catch((error) => {
          renewalError = error;
          child.kill("SIGTERM");
        })
        .finally(() => {
          renewing = undefined;
        });
    }, 60000);
    process.exitCode = (await closed) ?? 1;
    if (renewalError) throw renewalError;
  } finally {
    clearInterval(renewalTimer);
    if (renewing) await renewing;
    fs.rmSync(tokenDirectory, { recursive: true, force: true });
    try {
      await disposeWorker(API, adminToken, worker);
    } finally {
      await logout(adminToken);
    }
  }
}

main().catch((err) => {
  console.error(`load:staging: ${err.message}`);
  process.exit(1);
});
