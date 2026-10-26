import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, request as playwrightRequest } from "@playwright/test";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vitePort = Number(process.env.E2E_VITE_PORT ?? 5173);
if (!Number.isInteger(vitePort) || vitePort < 1024 || vitePort > 65535) {
  throw new Error("E2E_VITE_PORT must be an integer between 1024 and 65535");
}
const baseUrl = process.env.E2E_BASE_URL || `http://127.0.0.1:${vitePort}`;
const apiBase = (process.env.E2E_API_URL || "http://127.0.0.1:4000/api").replace(/\/$/, "");
const outputArg = process.argv
  .find((arg) => arg.startsWith("--output="))
  ?.slice("--output=".length);
const baselineArg = process.argv
  .find((arg) => arg.startsWith("--baseline="))
  ?.slice("--baseline=".length);
const samplesArg = process.argv
  .find((arg) => arg.startsWith("--samples="))
  ?.slice("--samples=".length);
const viewportArg = process.argv
  .find((arg) => arg.startsWith("--viewport="))
  ?.slice("--viewport=".length);
const cpuThrottleArg = process.argv
  .find((arg) => arg.startsWith("--cpu-throttle="))
  ?.slice("--cpu-throttle=".length);
const outputPath = outputArg ? resolve(frontendRoot, outputArg) : undefined;
const baselinePath = baselineArg ? resolve(frontendRoot, baselineArg) : undefined;
const sampleCount = samplesArg === undefined ? 3 : Number(samplesArg);
const cpuThrottleRate = cpuThrottleArg === undefined ? 1 : Number(cpuThrottleArg);

if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 10) {
  throw new Error("--samples must be an integer between 1 and 10");
}

if (!Number.isInteger(cpuThrottleRate) || cpuThrottleRate < 1 || cpuThrottleRate > 8) {
  throw new Error("--cpu-throttle must be an integer between 1 and 8");
}

const routes = [
  { id: "dashboard", path: "/#/dashboard", role: "admin" },
  { id: "planner", path: "/#/planning/monthly", role: "admin" },
  { id: "worker-portal", path: "/#/worker-portal", role: "worker" },
  { id: "time-control", path: "/#/time-control", role: "admin" },
  { id: "logbook", path: "/#/logbook", role: "admin" },
  { id: "kiosk", path: "/#/kiosk", role: null },
];

const routeArg = process.argv.find((arg) => arg.startsWith("--route="))?.slice("--route=".length);
const selectedRoutes = routeArg ? routes.filter((route) => route.id === routeArg) : routes;

if (routeArg && selectedRoutes.length === 0) {
  throw new Error(
    `Unknown route "${routeArg}". Available routes: ${routes.map((route) => route.id).join(", ")}`,
  );
}

const viewportPresets = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 412, height: 823 },
};

if (viewportArg && !Object.hasOwn(viewportPresets, viewportArg)) {
  throw new Error('--viewport must be "desktop" or "mobile"');
}

const viewportName = viewportArg ?? "desktop";
const viewport = viewportPresets[viewportName];

const credentials = {
  admin: {
    username: process.env.E2E_ADMIN_USERNAME || "admin",
    password: process.env.E2E_ADMIN_PASSWORD || "999.666",
  },
  worker: {
    username: process.env.E2E_WORKER_USERNAME || "juan.perez",
    password: process.env.E2E_WORKER_PASSWORD || "123456",
  },
};

let devServer;
let browser;
let apiRequest;

const wait = (durationMs) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, durationMs));

const startDevServer = () => {
  devServer = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(vitePort), "--strictPort"],
    { cwd: frontendRoot, env: process.env, stdio: "inherit" },
  );
};

const waitForDevServer = async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (devServer?.exitCode !== null && devServer?.exitCode !== undefined) {
      throw new Error(`Vite exited with code ${devServer.exitCode}`);
    }
    try {
      const response = await apiRequest.get(baseUrl, { timeout: 2_000 });
      if (response.ok()) return;
    } catch {
      // Vite is still starting.
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for the Vite dev server at ${baseUrl}`);
};

const login = async (role) => {
  const response = await apiRequest.post(`${apiBase}/auth/login`, {
    data: credentials[role],
  });
  if (!response.ok()) throw new Error(`Could not authenticate the ${role} render profile`);
  const body = await response.json();
  if (body.mustChangePassword === true) {
    throw new Error(`The ${role} profile requires the UI password-change flow`);
  }

  return {
    token: body.token,
    user: {
      id: body.userId,
      username: body.username,
      role: body.role,
      employeeId: body.employeeId ?? null,
      isDeleted: false,
      lastModified: Date.now(),
      syncStatus: "synced",
    },
  };
};

const measureRouteSample = async (route, sessions) => {
  const context = await browser.newContext({ viewport });
  if (route.role) {
    const session = sessions[route.role] ?? (sessions[route.role] = await login(route.role));
    await context.addInitScript(({ token, user, captureReadinessDiagnostics }) => {
      sessionStorage.setItem("authToken", token);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      window.__portalRenderCounts = {};
      window.__portalRenderMetrics = {};
      window.__portalRenderCommitEvents = [];
      window.__portalRenderCommitEventsDropped = 0;
      if (captureReadinessDiagnostics) {
        window.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = true;
        window.__portalReadinessRenderAudit = {
          syncPhases: [],
          apiClientStages: [],
          queryTimings: [],
        };
        window.addEventListener("portal:sync-phase", (event) => {
          window.__portalReadinessRenderAudit.syncPhases.push(event.detail);
        });
        window.addEventListener("portal:readiness-api-client-stage", (event) => {
          window.__portalReadinessRenderAudit.apiClientStages.push(event.detail);
        });
        window.addEventListener("portal:readiness-query", (event) => {
          window.__portalReadinessRenderAudit.queryTimings.push(event.detail);
        });
      }
    }, { ...session, captureReadinessDiagnostics: route.id === "time-control" });
  } else {
    await context.addInitScript(() => {
      window.__portalRenderCounts = {};
      window.__portalRenderMetrics = {};
      window.__portalRenderCommitEvents = [];
      window.__portalRenderCommitEventsDropped = 0;
    });
  }

  let cdp;
  try {
    const page = await context.newPage();
    cdp = await context.newCDPSession(page);
    if (cpuThrottleRate > 1) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottleRate });
    }
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction((id) => (window.__portalRenderCounts?.[id] ?? 0) > 0, route.id, {
      timeout: 60_000,
    });
    await page.waitForTimeout(1_000);

    const commits = await page.evaluate((id) => window.__portalRenderCounts?.[id] ?? 0, route.id);
    const renderProfile = await page.evaluate((id) => {
      const metrics = window.__portalRenderMetrics ?? {};
      return {
        root: metrics["app:root"] ?? null,
        appProfiles: Object.fromEntries(
          Object.entries(metrics).filter(
            ([metricId]) => metricId.startsWith("app:") && metricId !== "app:root",
          ),
        ),
        route: metrics[id] ?? null,
        widgets: Object.fromEntries(
          Object.entries(metrics).filter(([metricId]) => metricId.startsWith("widget:")),
        ),
        scopedProfiles: Object.fromEntries(
          Object.entries(metrics).filter(([metricId]) => metricId.startsWith(`${id}:`)),
        ),
        commitEvents: window.__portalRenderCommitEvents ?? [],
        commitEventsDropped: window.__portalRenderCommitEventsDropped ?? 0,
        readinessAudit: window.__portalReadinessRenderAudit ?? null,
      };
    }, route.id);

    return { navigationCommits: commits, renderProfile };
  } finally {
    await cdp?.detach();
    await context.close();
  }
};

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  return Number(value.toFixed(2));
};

const aggregateMetrics = (metrics) => {
  const present = metrics.filter(Boolean);
  return {
    samplesPresent: present.length,
    commitsMedian: median(present.map((metric) => metric.commits)),
    actualDurationMsMedian: median(present.map((metric) => metric.actualDurationMs)),
    baseDurationMsMedian: median(present.map((metric) => metric.baseDurationMs)),
    maxActualDurationMsMedian: median(present.map((metric) => metric.maxActualDurationMs)),
    phasesMedian: {
      mount: median(present.map((metric) => metric.phases.mount)),
      update: median(present.map((metric) => metric.phases.update)),
      nestedUpdate: median(present.map((metric) => metric.phases["nested-update"])),
    },
  };
};

const rangeStats = (values) => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return { sampleCount: 0, min: null, median: null, max: null };
  return {
    sampleCount: sorted.length,
    min: Number(sorted[0].toFixed(2)),
    median: median(sorted),
    max: Number(sorted.at(-1).toFixed(2)),
  };
};

const correlateReadinessCommits = (routeId, renderProfile) => {
  if (routeId !== "time-control") return null;
  const audit = renderProfile.readinessAudit;
  if (!audit) throw new Error("Time Control readiness render audit is missing");
  const validation = audit.syncPhases.find(
    ({ phase, name }) => phase === "validation" && name === "validateInstanceId",
  );
  const fetchResolved = audit.apiClientStages.find(({ stage }) => stage === "fetch-resolved");
  const bodyResolved = audit.apiClientStages.find(({ stage }) => stage === "read-body-resolved");
  const queryTiming = audit.queryTimings[0];
  if (!validation || !fetchResolved || !bodyResolved || !queryTiming) {
    throw new Error("Time Control readiness timing events are incomplete");
  }

  const validationStartMs = validation.startedAtMs;
  const validationEndMs = validation.startedAtMs + validation.durationMs;
  const bodyReadStartMs = fetchResolved.atMs;
  const bodyReadEndMs = bodyResolved.atMs;
  const scopeIds = [
    "app:root",
    ...Object.keys(renderProfile.appProfiles),
    routeId,
    `${routeId}:view`,
  ];
  const scopes = Object.fromEntries(
    scopeIds.map((scopeId) => {
      const commits = renderProfile.commitEvents.filter(({ id }) => id === scopeId);
      const validationOverlappingCommits = commits.filter(
        ({ startTimeMs, commitTimeMs }) =>
          startTimeMs <= validationEndMs && commitTimeMs >= validationStartMs,
      );
      const bodyReadOverlappingCommits = commits.filter(
        ({ startTimeMs, commitTimeMs }) =>
          startTimeMs <= bodyReadEndMs && commitTimeMs >= bodyReadStartMs,
      );
      return [
        scopeId,
        {
          totalCommitCount: commits.length,
          totalActualDurationMs: Number(
            commits.reduce((total, commit) => total + commit.actualDurationMs, 0).toFixed(2),
          ),
          validationOverlappingCommitCount: validationOverlappingCommits.length,
          validationOverlappingActualDurationMs: Number(
            validationOverlappingCommits
              .reduce((total, commit) => total + commit.actualDurationMs, 0)
              .toFixed(2),
          ),
          maxValidationOverlappingActualDurationMs: Number(
            Math.max(
              0,
              ...validationOverlappingCommits.map((commit) => commit.actualDurationMs),
            ).toFixed(2),
          ),
          validationOverlappingCommits,
          bodyReadOverlappingCommitCount: bodyReadOverlappingCommits.length,
          bodyReadOverlappingActualDurationMs: Number(
            bodyReadOverlappingCommits
              .reduce((total, commit) => total + commit.actualDurationMs, 0)
              .toFixed(2),
          ),
          maxBodyReadOverlappingActualDurationMs: Number(
            Math.max(
              0,
              ...bodyReadOverlappingCommits.map((commit) => commit.actualDurationMs),
            ).toFixed(2),
          ),
          bodyReadOverlappingCommits,
        },
      ];
    }),
  );

  return {
    validation: {
      startedAtMs: validation.startedAtMs,
      finishedAtMs: Number(validationEndMs.toFixed(2)),
      durationMs: validation.durationMs,
    },
    readinessQuery: queryTiming,
    bodyRead: {
      startedAtMs: bodyReadStartMs,
      finishedAtMs: bodyReadEndMs,
      durationMs: Number((bodyReadEndMs - bodyReadStartMs).toFixed(2)),
    },
    commitEventsDropped: renderProfile.commitEventsDropped,
    scopes,
  };
};

const measureRoute = async (route, sessions) => {
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    samples.push(await measureRouteSample(route, sessions));
  }

  const widgetIds = [
    ...new Set(samples.flatMap((sample) => Object.keys(sample.renderProfile.widgets))),
  ].sort();
  const scopedProfileIds = [
    ...new Set(samples.flatMap((sample) => Object.keys(sample.renderProfile.scopedProfiles))),
  ].sort();
  const appProfileIds = [
    ...new Set(samples.flatMap((sample) => Object.keys(sample.renderProfile.appProfiles))),
  ].sort();
  const readinessCorrelations = samples
    .map((sample) => correlateReadinessCommits(route.id, sample.renderProfile))
    .filter(Boolean);
  const readinessScopeIds = [
    ...new Set(readinessCorrelations.flatMap((sample) => Object.keys(sample.scopes))),
  ].sort();
  const readinessCorrelation =
    readinessCorrelations.length > 0
      ? {
          source:
            "React Profiler timestamps from Vite development mode; use for component attribution, not production timing",
          sampleCount: readinessCorrelations.length,
          validationDurationMs: rangeStats(
            readinessCorrelations.map((sample) => sample.validation.durationMs),
          ),
          bodyReadDurationMs: rangeStats(
            readinessCorrelations.map((sample) => sample.bodyRead.durationMs),
          ),
          scopes: Object.fromEntries(
            readinessScopeIds.map((scopeId) => [
              scopeId,
              {
                totalCommitCount: rangeStats(
                  readinessCorrelations.map((sample) => sample.scopes[scopeId].totalCommitCount),
                ),
                validationOverlappingCommitCount: rangeStats(
                  readinessCorrelations.map(
                    (sample) => sample.scopes[scopeId].validationOverlappingCommitCount,
                  ),
                ),
                validationOverlappingActualDurationMs: rangeStats(
                  readinessCorrelations.map(
                    (sample) => sample.scopes[scopeId].validationOverlappingActualDurationMs,
                  ),
                ),
                bodyReadOverlappingCommitCount: rangeStats(
                  readinessCorrelations.map(
                    (sample) => sample.scopes[scopeId].bodyReadOverlappingCommitCount,
                  ),
                ),
                totalActualDurationMs: rangeStats(
                  readinessCorrelations.map(
                    (sample) => sample.scopes[scopeId].totalActualDurationMs,
                  ),
                ),
                bodyReadOverlappingActualDurationMs: rangeStats(
                  readinessCorrelations.map(
                    (sample) => sample.scopes[scopeId].bodyReadOverlappingActualDurationMs,
                  ),
                ),
                maxBodyReadOverlappingActualDurationMs: rangeStats(
                  readinessCorrelations.map(
                    (sample) => sample.scopes[scopeId].maxBodyReadOverlappingActualDurationMs,
                  ),
                ),
              },
            ]),
          ),
        }
      : null;

  return {
    id: route.id,
    path: route.path,
    role: route.role,
    navigationCommits: median(samples.map((sample) => sample.navigationCommits)),
    sampleCount: samples.length,
    samples,
    readinessCorrelations,
    readinessCorrelation,
    renderProfile: {
      source: "React Profiler in Vite development mode; accumulated during the first second",
      root: aggregateMetrics(samples.map((sample) => sample.renderProfile.root)),
      appProfiles: Object.fromEntries(
        appProfileIds.map((id) => [
          id,
          aggregateMetrics(samples.map((sample) => sample.renderProfile.appProfiles[id] ?? null)),
        ]),
      ),
      route: aggregateMetrics(samples.map((sample) => sample.renderProfile.route)),
      widgets: Object.fromEntries(
        widgetIds.map((id) => [
          id,
          aggregateMetrics(samples.map((sample) => sample.renderProfile.widgets[id] ?? null)),
        ]),
      ),
      scopedProfiles: Object.fromEntries(
        scopedProfileIds.map((id) => [
          id,
          aggregateMetrics(
            samples.map((sample) => sample.renderProfile.scopedProfiles[id] ?? null),
          ),
        ]),
      ),
    },
  };
};

const compareBaseline = (measurements, baseline) => {
  const baselineById = new Map(baseline.routes.map((route) => [route.id, route.navigationCommits]));
  const comparisons = measurements.routes.map((route) => {
    const baselineCommits = baselineById.get(route.id);
    if (baselineCommits === undefined) throw new Error(`Baseline is missing route ${route.id}`);
    return {
      id: route.id,
      baselineCommits,
      currentCommits: route.navigationCommits,
      passed: route.navigationCommits <= baselineCommits,
    };
  });
  measurements.comparison = comparisons;
  if (comparisons.some((comparison) => !comparison.passed)) {
    throw new Error("Render commits increased in at least one critical view");
  }
};

const cleanup = async () => {
  await browser?.close();
  await apiRequest?.dispose();
  if (devServer && devServer.exitCode === null) devServer.kill("SIGTERM");
};

try {
  apiRequest = await playwrightRequest.newContext();
  if (!process.env.E2E_BASE_URL) {
    startDevServer();
    await waitForDevServer();
  }
  browser = await chromium.launch({ headless: true });

  const sessions = {};
  const measurements = {
    schemaVersion: 3,
    measuredAt: new Date().toISOString(),
    baseUrl,
    apiBase,
    nodeVersion: process.version,
    browser: { name: "Chromium", version: browser.version() },
    viewport,
    cpuThrottleRate,
    sampleCountPerRoute: sampleCount,
    viewportName,
    interaction: "direct route navigation in a fresh browser context per sample",
    timingLimit:
      "React Profiler timings come from Vite development mode with the recorded CDP CPU throttle; use only for component attribution, not production timing comparisons",
    routes: [],
  };

  for (const route of selectedRoutes) {
    measurements.routes.push(await measureRoute(route, sessions));
  }

  if (baselinePath) {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    compareBaseline(measurements, baseline);
  }

  const serialized = `${JSON.stringify(measurements, null, 2)}\n`;
  if (outputPath) {
    if (!isAbsolute(outputPath)) throw new Error("Output path must resolve to an absolute path");
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized);
  }
  process.stdout.write(serialized);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
