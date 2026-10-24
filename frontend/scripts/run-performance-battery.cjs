const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const process = require("node:process");
const { chromium } = require("@playwright/test");
const { assertPerformanceRoutes } = require("./assert-performance-routes.cjs");
const { normalizeLighthouseReport } = require("./lighthouse-report.cjs");
const performanceRoutes = require("../performance-routes.json");

const frontendRoot = path.dirname(require.resolve("../package.json"));
const workspaceRoot = path.resolve(frontendRoot, "..");
const stagingUrl = "http://127.0.0.1:8080";
const apiUrl = `${stagingUrl}/api`;
const startedAt = new Date();
const shortSha = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--short=8", "HEAD"], {
      cwd: workspaceRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
})();
const runId = `${startedAt.toISOString().replace(/[:.]/g, "-")}-${shortSha}`;
const localResultsDirectory = path.join(frontendRoot, ".performance-results", runId);
const playwrightResultsDirectory = path.join(localResultsDirectory, "playwright");
const lighthouseDirectory = path.join(frontendRoot, ".lighthouseci");
const ledgerDirectory = path.join(
  workspaceRoot,
  "specs",
  "039-frontend-performance-battery",
  "evidencia",
  "runs",
);

const readCommand = (command, args) => {
  try {
    return execFileSync(command, args, { cwd: workspaceRoot, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

const sourceCommit = readCommand("git", ["rev-parse", "HEAD"]);
const workingTreeDirty = Boolean(readCommand("git", ["status", "--porcelain"]));
const stagingFrontendContainer = readCommand("docker", [
  "compose",
  "--env-file",
  ".env.staging",
  "-f",
  "compose.staging.yaml",
  "ps",
  "-q",
  "frontend",
]);
const stagingFrontendImage = stagingFrontendContainer
  ? readCommand("docker", ["inspect", "--format={{.Image}}", stagingFrontendContainer])
  : null;

const record = {
  schemaVersion: 1,
  runId,
  status: "running",
  startedAt: startedAt.toISOString(),
  completedAt: null,
  source: { commit: sourceCommit, workingTreeDirty },
  target: {
    name: "local-staging",
    baseUrl: stagingUrl,
    frontendImageId: stagingFrontendImage,
  },
  runtime: {
    platform: process.platform,
    architecture: os.arch(),
    nodeVersion: process.version,
    browser: "Chromium",
    viewport: { width: 1440, height: 900 },
  },
  routeCatalog: {
    count: performanceRoutes.length,
    families: Object.fromEntries(
      [...new Set(performanceRoutes.map((route) => route.family))]
        .sort()
        .map((family) => [
          family,
          performanceRoutes.filter((route) => route.family === family).map((route) => route.id),
        ]),
    ),
    routes: performanceRoutes.map(
      ({ id, path, currentPath, role, family, lighthouse, lighthouseSkipReason, probes = [] }) => ({
        id,
        path,
        currentPath,
        role: role ?? "anonymous",
        family,
        lighthouse,
        ...(lighthouseSkipReason ? { lighthouseSkipReason } : {}),
        probes: probes.map(({ id: probeId, kind }) => ({ id: probeId, kind })),
      }),
    ),
  },
  stages: {
    harnessValidation: { status: "not-run" },
    catalog: { status: "not-run" },
    playwright: { status: "not-run", reports: [] },
    lighthouseStandard: { status: "not-run", routes: [] },
    lighthouseColdDashboard: { status: "not-run", samples: [] },
    lighthouseColdPriorityRoutes: { status: "not-run", samples: [] },
  },
  failure: null,
};

const assertLocalTarget = () => {
  for (const [name, expected] of [
    ["E2E_BASE_URL", stagingUrl],
    ["E2E_API_URL", apiUrl],
  ]) {
    const configured = process.env[name];
    if (configured && configured.replace(/\/$/, "") !== expected) {
      throw new Error(`${name} must target local staging at ${expected}`);
    }
  }
};

const assertStagingHealthy = async () => {
  const [gateway, health] = await Promise.all([
    globalThis.fetch(stagingUrl),
    globalThis.fetch(`${apiUrl}/health`),
  ]);
  if (!gateway.ok || !health.ok) {
    throw new Error(
      `Local staging must be healthy before measurement (gateway=${gateway.status}, api=${health.status})`,
    );
  }
  record.target.health = { gatewayStatus: gateway.status, apiStatus: health.status };
  process.stdout.write("[PERF] Local staging gateway and API are healthy.\n");
};

const runStage = (stage, command, args, env) => {
  stage.startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: frontendRoot,
    env,
    stdio: "inherit",
  });
  stage.completedAt = new Date().toISOString();
  stage.exitCode = result.status ?? 1;
  stage.status = result.status === 0 ? "passed" : "failed";
  if (result.error) throw result.error;
  return stage.exitCode;
};

const readJsonFiles = (directory, predicate = () => true) => {
  try {
    return fs
      .readdirSync(directory)
      .filter((name) => name.endsWith(".json") && predicate(name))
      .map((name) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
};

const buildPerformanceEnvironment = (sourceEnv) => ({
  ...sourceEnv,
  E2E_BASE_URL: stagingUrl,
  E2E_API_URL: apiUrl,
  PERFORMANCE_RESULTS_DIR: playwrightResultsDirectory,
  PERFORMANCE_SOURCE_SHA: sourceCommit ?? "unknown",
  PERFORMANCE_REQUIRE_CLOCKING_OPTIONS_ENDPOINT: "1",
});

const routePathFor = (url) => {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.hash}`;
};

const assertColdPriorityRouteCoverage = (reports) => {
  const expectedSamples = new Map([
    ["worker-portal", 3],
    ["time-control", 3],
  ]);
  const counts = new Map([...expectedSamples.keys()].map((routeId) => [routeId, 0]));

  for (const report of reports) {
    if (!expectedSamples.has(report.routeId)) {
      throw new Error(`Unexpected route in cold priority profile: ${report.routeId}`);
    }
    if (!report.routeMatched) {
      throw new Error(`Cold priority Lighthouse route did not match: ${report.routeId}`);
    }
    counts.set(report.routeId, counts.get(report.routeId) + 1);
  }

  if (
    reports.length !== 6 ||
    [...expectedSamples].some(([routeId, count]) => counts.get(routeId) !== count)
  ) {
    throw new Error(
      `Cold priority profile expected three matched samples for Worker Portal and Time Control; found ${JSON.stringify(Object.fromEntries(counts))}`,
    );
  }
};

const collectRawLighthouseReports = (startedAtIso, completedAtIso) => {
  const startedAtMs = new Date(startedAtIso).getTime();
  const completedAtMs = new Date(completedAtIso).getTime();
  return readJsonFiles(lighthouseDirectory, (name) => name.endsWith(".report.json")).filter(
    (report) => {
      const fetchTime = new Date(report.fetchTime).getTime();
      return fetchTime >= startedAtMs && fetchTime <= completedAtMs;
    },
  );
};

const collectLighthouseReports = (startedAtIso, completedAtIso, profile) =>
  collectRawLighthouseReports(startedAtIso, completedAtIso)
    .map((report) => normalizeLighthouseReport(report, profile))
    .sort((left, right) => left.requestedPath.localeCompare(right.requestedPath));

const validateLighthouseStage = (stageName, stage) => {
  const profile = stageName.startsWith("lighthouseCold") ? "cold" : "warm";
  const reports = collectLighthouseReports(stage.startedAt, stage.completedAt, profile);
  if (stageName === "lighthouseColdDashboard") {
    stage.samples = reports;
    if (
      reports.length !== 3 ||
      reports.some((report) => report.routeId !== "dashboard" || !report.routeMatched)
    ) {
      throw new Error(
        `Cold Dashboard profile expected 3 dashboard reports; found ${reports.length}`,
      );
    }
    return;
  }
  if (stageName === "lighthouseColdPriorityRoutes") {
    stage.samples = reports;
    assertColdPriorityRouteCoverage(reports);
    return;
  }

  stage.routes = reports;
  const expectedRouteIds = performanceRoutes
    .filter((route) => route.lighthouse)
    .map((route) => route.id)
    .sort();
  const actualRouteIds = reports.map((report) => report.routeId).sort();
  if (
    reports.length !== expectedRouteIds.length ||
    JSON.stringify(actualRouteIds) !== JSON.stringify(expectedRouteIds) ||
    reports.some((report) => !report.routeMatched)
  ) {
    throw new Error(
      `Standard Lighthouse profile expected ${expectedRouteIds.length} matched routes; found ${reports.length}`,
    );
  }
  stage.routeAssertions = assertPerformanceRoutes(
    collectRawLighthouseReports(stage.startedAt, stage.completedAt),
    require("../.lighthouserc.json").ci.assert,
  );
  if (stage.routeAssertions.failures.length > 0) {
    throw new Error(
      `Lighthouse route budgets failed: ${stage.routeAssertions.failures.length} assertion(s) across ${stage.routeAssertions.urlCount} hash routes`,
    );
  }
};

const persistRunRecord = () => {
  record.completedAt = new Date().toISOString();
  record.stages.playwright.reports = readJsonFiles(playwrightResultsDirectory);

  for (const stageName of [
    "lighthouseStandard",
    "lighthouseColdDashboard",
    "lighthouseColdPriorityRoutes",
  ]) {
    const stage = record.stages[stageName];
    if (stage.startedAt && stage.completedAt) {
      try {
        validateLighthouseStage(stageName, stage);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stage.status = "failed";
        stage.validationError = message;
        record.failure ??= message;
      }
    }
  }

  const allPassed = Object.values(record.stages).every((stage) => stage.status === "passed");
  record.status = allPassed ? "passed" : "failed";

  fs.mkdirSync(ledgerDirectory, { recursive: true });
  const destination = path.join(ledgerDirectory, `${runId}.json`);
  const temporary = `${destination}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  fs.renameSync(temporary, destination);
  process.stdout.write(
    `[PERF] Versioned run record: ${path.relative(workspaceRoot, destination)}\n`,
  );
};

const main = async () => {
  const env = buildPerformanceEnvironment(process.env);
  let exitCode = 1;

  try {
    if (Number.parseInt(process.versions.node, 10) !== 26) {
      throw new Error(`Frontend performance battery requires Node 26; found ${process.version}`);
    }
    assertLocalTarget();
    await assertStagingHealthy();

    exitCode = runStage(
      record.stages.harnessValidation,
      process.execPath,
      [
        "--test",
        path.join(frontendRoot, "scripts", "lhci-puppeteer.test.cjs"),
        path.join(frontendRoot, "scripts", "assert-performance-routes.test.cjs"),
        path.join(frontendRoot, "scripts", "lighthouse-report.test.cjs"),
        path.join(frontendRoot, "scripts", "run-performance-battery.test.cjs"),
      ],
      env,
    );
    if (exitCode !== 0) throw new Error("Lighthouse session setup regression tests failed");

    const catalogStage = record.stages.catalog;
    const catalogStatus = runStage(
      catalogStage,
      process.execPath,
      [path.join(frontendRoot, "scripts", "check-performance-routes.cjs")],
      env,
    );
    exitCode = catalogStatus;

    if (catalogStatus === 0) {
      const playwrightStage = record.stages.playwright;
      process.stdout.write(
        "[PERF] Running serial Playwright route and interaction measurements.\n",
      );
      const playwrightStatus = runStage(
        playwrightStage,
        "npx",
        [
          "playwright",
          "test",
          "e2e/performance.spec.ts",
          "--project=perf",
          "--no-deps",
          "--workers=1",
        ],
        env,
      );
      exitCode = playwrightStatus;

      if (playwrightStatus === 0) {
        const chromePath = chromium.executablePath();
        const standardStage = record.stages.lighthouseStandard;
        process.stdout.write("[PERF] Running Lighthouse CI across the route catalog.\n");
        const standardStatus = runStage(
          standardStage,
          "npx",
          ["lhci", "autorun", "--config=.lighthouserc.json", `--collect.chromePath=${chromePath}`],
          env,
        );
        exitCode = standardStatus;

        if (standardStatus === 0) {
          const coldStage = record.stages.lighthouseColdDashboard;
          process.stdout.write(
            "[PERF] Running three cold-start Lighthouse samples for Dashboard.\n",
          );
          exitCode = runStage(
            coldStage,
            "npx",
            [
              "lhci",
              "autorun",
              "--config=.lighthouserc-dashboard-cold.json",
              `--collect.chromePath=${chromePath}`,
            ],
            env,
          );

          if (exitCode === 0) {
            const priorityStage = record.stages.lighthouseColdPriorityRoutes;
            process.stdout.write(
              "[PERF] Running three cold Lighthouse samples for Worker Portal and Time Control.\n",
            );
            exitCode = runStage(
              priorityStage,
              "npx",
              [
                "lhci",
                "autorun",
                "--config=.lighthouserc-priority-cold.json",
                `--collect.chromePath=${chromePath}`,
              ],
              env,
            );
          }
        }
      }
    }
  } catch (error) {
    record.failure = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[PERF] ${record.failure}\n`);
    exitCode = 1;
  }

  try {
    persistRunRecord();
    if (record.status !== "passed") exitCode = 1;
  } catch (error) {
    process.stderr.write(
      `[PERF] Could not persist run record: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    exitCode = 1;
  }

  return exitCode;
};

if (require.main === module) {
  main().then((status) => {
    process.exitCode = status;
  });
}

module.exports = {
  assertColdPriorityRouteCoverage,
  buildPerformanceEnvironment,
  validateLighthouseStage,
};
