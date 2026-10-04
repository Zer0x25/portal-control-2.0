// Runner de endpoints fríos contra staging (caza-bugs 2026-10-04).
// 1 login admin fuera de Artillery (rate-limit), escenario de solo-lecturas
// (staging-cold.yaml), logout al final. npm run load:staging:cold
const { spawnSync } = require("node:child_process");
const { api } = require("./e2e-worker.cjs");

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

  try {
    const result = spawnSync("npx", ["artillery", "run", "load/staging-cold.yaml"], {
      cwd: __dirname + "/..",
      env: { ...process.env, LOAD_TARGET: TARGET, LOAD_ADMIN_TOKEN: adminToken },
      stdio: "inherit",
    });
    process.exitCode = result.status ?? 1;
  } finally {
    await api(API, adminToken, `/auth/logout`, { method: "POST" }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`load:staging:cold: ${err.message}`);
  process.exit(1);
});
