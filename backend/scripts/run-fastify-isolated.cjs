const { execFileSync, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const path = require("node:path");

// Always creates an owned disposable container. Never reads .env or reuses project DB URLs.
const backend = path.resolve(__dirname, "..");
const password = crypto.randomBytes(24).toString("hex");
let container;
function command(binary, args, env) {
  const result = spawnSync(binary, args, { cwd: backend, env, stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${binary} failed (${result.status})`);
}
async function main() {
  if (Number(process.versions.node.split(".")[0]) !== 26) throw new Error("Use Node 26");
  try {
    container = execFileSync(
      "docker",
      [
        "run",
        "--detach",
        "--publish",
        "127.0.0.1::5432",
        "--env",
        "POSTGRES_DB=pweb3_test",
        "--env",
        `POSTGRES_PASSWORD=${password}`,
        "--env",
        "POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=scram-sha-256",
        "postgres:18.4-alpine",
      ],
      { encoding: "utf8" },
    ).trim();
    const address = execFileSync("docker", ["port", container, "5432/tcp"], {
      encoding: "utf8",
    }).trim();
    const url = `postgresql://postgres:${password}@${address}/pweb3_test`;
    const env = {
      ...process.env,
      DATABASE_URL: url,
      DIRECT_URL: url,
      TEST_DATABASE_URL: url,
      TEST_DIRECT_URL: url,
      JWT_SECRET: crypto.randomBytes(32).toString("hex"),
      DISABLE_HOLIDAY_AUTOSYNC: "true",
      NODE_ENV: "test",
      BACKUP_ENABLED: "false",
      SENTRY_DSN: "",
    };
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const probe = spawnSync(
        "docker",
        ["exec", container, "pg_isready", "-U", "postgres", "-d", "pweb3_test"],
        { stdio: "ignore" },
      );
      if (probe.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Disposable PostgreSQL did not become ready");
    command(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], env);
    if (process.argv.includes("--kpi-contention")) {
      command(
        process.execPath,
        [
          "--import",
          "tsx",
          path.join(__dirname, "benchmark-kpi-contention.ts"),
          ...(process.argv.includes("--singleton-baseline") ? ["--singleton-baseline"] : []),
        ],
        env,
      );
    } else if (process.argv.includes("--benchmark")) {
      command(process.execPath, [path.join(__dirname, "benchmark-fastify.cjs")], env);
    } else {
      command(
        process.execPath,
        [
          path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
          "run",
          "--config",
          "vitest.fastify.integration.config.ts",
        ],
        env,
      );
    }
  } finally {
    if (container) execFileSync("docker", ["rm", "--force", container], { stdio: "ignore" });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
