const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
require("dotenv").config();

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
const artifactDir = path.resolve(__dirname, "../../scripts/logs/tests/backend");
const artifactFile = path.join(artifactDir, `integration.${timestamp}.json`);
const latestFile = path.join(artifactDir, "integration.latest.json");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runStep(step, command, args, env) {
  const startedAt = new Date();
  const start = Date.now();

  const result = spawnSync(command, args, {
    shell: process.platform === "win32",
    env,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const endedAt = new Date();
  return {
    step,
    command: `${command} ${args.join(" ")}`,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: Date.now() - start,
    exit_code: result.status ?? 1,
    status: result.status === 0 ? "PASS" : "FAIL",
  };
}

async function ensureTestDatabaseExists(testDatabaseUrl) {
  const parsed = new URL(testDatabaseUrl);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName) return;

  const currentDbName = parsed.pathname.replace(/^\//, "") || "postgres";
  const adminDbCandidates = ["postgres", "template1", currentDbName];
  let lastError = null;

  for (const adminDb of adminDbCandidates) {
    const adminUrl = new URL(testDatabaseUrl);
    adminUrl.pathname = `/${adminDb}`;

    const client = new Client({ connectionString: adminUrl.toString() });
    try {
      await client.connect();

      const existsResult = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = $1 LIMIT 1",
        [dbName],
      );
      if (existsResult.rowCount === 0) {
        const safeDbName = dbName.replace(/"/g, '""');
        await client.query(`CREATE DATABASE "${safeDbName}"`);
        console.log(`[test:integration:ci] Created missing test database: ${dbName}`);
      }
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // noop
      }
    }
  }

  throw lastError || new Error("Failed to connect to an admin database.");
}

function saveResult(payload) {
  ensureDir(artifactDir);
  const data = JSON.stringify(payload, null, 2);
  fs.writeFileSync(artifactFile, data, "utf8");
  fs.writeFileSync(latestFile, data, "utf8");
  console.log(`[test:integration:ci] JSON result: ${artifactFile}`);
}

function forceTestDatabaseUrl(urlValue) {
  if (!urlValue) return null;

  try {
    const parsed = new URL(urlValue);
    parsed.pathname = "/pweb3_test";
    parsed.searchParams.delete("pgbouncer");
    if (parsed.port === "6432") parsed.port = "5432";
    return parsed.toString();
  } catch {
    return urlValue;
  }
}

async function main() {
  const env = { ...process.env };
  const warnings = [];

  let testDatabaseUrl = env.TEST_DATABASE_URL || null;

  if (!testDatabaseUrl && env.DATABASE_URL) {
    testDatabaseUrl = forceTestDatabaseUrl(env.DATABASE_URL);
    const warning =
      "TEST_DATABASE_URL is not set. Deriving safe fallback from DATABASE_URL targeting pweb3_test.";
    warnings.push(warning);
    console.warn(`[test:integration:ci] ${warning}`);
  }

  if (testDatabaseUrl && env.TEST_DATABASE_URL && testDatabaseUrl !== env.TEST_DATABASE_URL) {
    const warning = "TEST_DATABASE_URL did not point to pweb3_test. Rewriting to pweb3_test.";
    warnings.push(warning);
    console.warn(`[test:integration:ci] ${warning}`);
  }

  testDatabaseUrl = forceTestDatabaseUrl(testDatabaseUrl);
  const testDirectUrl = env.TEST_DIRECT_URL || env.DIRECT_URL || testDatabaseUrl;

  if (!testDatabaseUrl) {
    const payload = {
      timestamp: new Date().toISOString(),
      suite: "backend_integration",
      overall: "FAIL",
      exit_code: 1,
      duration_ms: 0,
      warnings,
      steps: [
        {
          step: "env_guard",
          command: "validate TEST_DATABASE_URL or DATABASE_URL",
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_ms: 0,
          exit_code: 1,
          status: "FAIL",
          message: "Missing database connection.",
        },
      ],
    };
    saveResult(payload);
    process.exit(1);
  }

  env.DATABASE_URL = testDatabaseUrl;
  env.TEST_DATABASE_URL = testDatabaseUrl;
  env.DIRECT_URL = testDirectUrl;
  env.TEST_DIRECT_URL = testDirectUrl;
  env.NODE_OPTIONS = env.NODE_OPTIONS || "--max-old-space-size=4096";

  const totalStart = Date.now();
  const steps = [];

  try {
    await ensureTestDatabaseExists(testDatabaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ensure test database.";
    const payload = {
      timestamp: new Date().toISOString(),
      suite: "backend_integration",
      overall: "FAIL",
      exit_code: 1,
      duration_ms: Date.now() - totalStart,
      warnings,
      steps: [
        {
          step: "ensure_test_database",
          command: "pg: CREATE DATABASE IF NOT EXISTS",
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_ms: 0,
          exit_code: 1,
          status: "FAIL",
          message,
        },
      ],
    };
    saveResult(payload);
    process.exit(1);
  }

  const migrate = runStep("prisma_migrate_deploy", "npx", ["prisma", "migrate", "deploy"], env);
  steps.push(migrate);

  if (migrate.exit_code === 0) {
    const vitest = runStep(
      "vitest_integration",
      "npx",
      ["vitest", "run", "--config", "vitest.integration.config.ts"],
      env,
    );
    steps.push(vitest);
  }

  const firstFailure = steps.find((item) => item.exit_code !== 0);
  const exitCode = firstFailure ? firstFailure.exit_code : 0;
  const payload = {
    timestamp: new Date().toISOString(),
    suite: "backend_integration",
    overall: exitCode === 0 ? "PASS" : "FAIL",
    exit_code: exitCode,
    duration_ms: Date.now() - totalStart,
    warnings,
    steps,
  };

  saveResult(payload);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
