const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
const artifactDir = path.resolve(__dirname, "../../scripts/logs/tests/backend");
const artifactFile = path.join(artifactDir, `unit.${timestamp}.json`);
const latestFile = path.join(artifactDir, "unit.latest.json");

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

function parseArgs(argv) {
  const relatedIndex = argv.indexOf("--related");
  if (relatedIndex === -1) {
    return { mode: "run", files: argv };
  }

  const files = argv.slice(relatedIndex + 1).filter(Boolean);
  return { mode: "related", files };
}

function saveResult(payload) {
  ensureDir(artifactDir);
  const data = JSON.stringify(payload, null, 2);
  fs.writeFileSync(artifactFile, data, "utf8");
  fs.writeFileSync(latestFile, data, "utf8");
  console.log(`[test:unit:ci] JSON result: ${artifactFile}`);
}

function main() {
  const env = { ...process.env };
  env.NODE_OPTIONS = env.NODE_OPTIONS || "--max-old-space-size=4096";
  const parsed = parseArgs(process.argv.slice(2));

  const totalStart = Date.now();
  const vitestArgs =
    parsed.mode === "related" && parsed.files.length > 0
      ? ["vitest", "related", ...parsed.files, "--run", "--silent"]
      : ["vitest", "run", "tests/unit", "tests/*.test.ts", "--silent"];
  const stepName =
    parsed.mode === "related" && parsed.files.length > 0 ? "vitest_unit_related" : "vitest_unit";
  const step = runStep(stepName, "npx", vitestArgs, env);

  const payload = {
    timestamp: new Date().toISOString(),
    suite: "backend_unit",
    overall: step.exit_code === 0 ? "PASS" : "FAIL",
    exit_code: step.exit_code,
    duration_ms: Date.now() - totalStart,
    steps: [step],
  };

  saveResult(payload);
  process.exit(step.exit_code);
}

main();
