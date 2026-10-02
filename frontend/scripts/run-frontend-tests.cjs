const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
const artifactDir = path.resolve(__dirname, "../../scripts/logs/tests/frontend");
const artifactFile = path.join(artifactDir, `frontend.${timestamp}.json`);
const latestFile = path.join(artifactDir, "frontend.latest.json");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveResult(payload) {
  ensureDir(artifactDir);
  const data = JSON.stringify(payload, null, 2);
  fs.writeFileSync(artifactFile, data, "utf8");
  fs.writeFileSync(latestFile, data, "utf8");
  console.log(`[test:run:ci] JSON result: ${artifactFile}`);
}

function parseArgs(argv) {
  const relatedIndex = argv.indexOf("--related");
  if (relatedIndex === -1) {
    return { mode: "run", files: argv };
  }

  const files = argv.slice(relatedIndex + 1).filter(Boolean);
  return { mode: "related", files };
}

function main() {
  const env = { ...process.env };
  env.NODE_OPTIONS = env.NODE_OPTIONS || "--max-old-space-size=4096";
  const parsed = parseArgs(process.argv.slice(2));

  const args =
    parsed.mode === "related" && parsed.files.length > 0
      ? ["vitest", "related", ...parsed.files, "--run"]
      : ["vitest", "run", ...process.argv.slice(2)];
  const stepName =
    parsed.mode === "related" && parsed.files.length > 0 ? "vitest_related" : "vitest_run";
  const startedAt = new Date();
  const start = Date.now();

  const result = spawnSync("npx", args, {
    shell: process.platform === "win32",
    env,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const payload = {
    timestamp: new Date().toISOString(),
    suite: "frontend_tests",
    overall: result.status === 0 ? "PASS" : "FAIL",
    exit_code: result.status ?? 1,
    duration_ms: Date.now() - start,
    steps: [
      {
        step: stepName,
        command: `npx ${args.join(" ")}`,
        started_at: startedAt.toISOString(),
        ended_at: new Date().toISOString(),
        duration_ms: Date.now() - start,
        exit_code: result.status ?? 1,
        status: result.status === 0 ? "PASS" : "FAIL",
      },
    ],
  };

  saveResult(payload);
  process.exit(result.status ?? 1);
}

main();
