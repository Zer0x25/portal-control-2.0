import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, request as playwrightRequest } from "@playwright/test";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
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
const outputPath = outputArg ? resolve(frontendRoot, outputArg) : undefined;
const baselinePath = baselineArg ? resolve(frontendRoot, baselineArg) : undefined;
const sampleCount = samplesArg === undefined ? 3 : Number(samplesArg);

if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 10) {
  throw new Error("--samples must be an integer between 1 and 10");
}

const routes = [
  { id: "dashboard", path: "/#/dashboard", role: "admin" },
  { id: "planner", path: "/#/planning/monthly", role: "admin" },
  { id: "worker-portal", path: "/#/worker-portal", role: "worker" },
  { id: "logbook", path: "/#/logbook", role: "admin" },
  { id: "kiosk", path: "/#/kiosk", role: null },
];

const viewport = { width: 1440, height: 900 };

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
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
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
    await context.addInitScript(({ token, user }) => {
      sessionStorage.setItem("authToken", token);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      window.__portalRenderCounts = {};
      window.__portalRenderMetrics = {};
    }, session);
  } else {
    await context.addInitScript(() => {
      window.__portalRenderCounts = {};
      window.__portalRenderMetrics = {};
    });
  }

  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction((id) => (window.__portalRenderCounts?.[id] ?? 0) > 0, route.id, {
      timeout: 60_000,
    });
    await page.waitForTimeout(1_000);

    const commits = await page.evaluate((id) => window.__portalRenderCounts?.[id] ?? 0, route.id);
    const renderProfile = await page.evaluate((id) => {
      const metrics = window.__portalRenderMetrics ?? {};
      return {
        route: metrics[id] ?? null,
        widgets: Object.fromEntries(
          Object.entries(metrics).filter(([metricId]) => metricId.startsWith("widget:")),
        ),
      };
    }, route.id);

    return { navigationCommits: commits, renderProfile };
  } finally {
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

const measureRoute = async (route, sessions) => {
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    samples.push(await measureRouteSample(route, sessions));
  }

  const widgetIds = [
    ...new Set(samples.flatMap((sample) => Object.keys(sample.renderProfile.widgets))),
  ].sort();

  return {
    id: route.id,
    path: route.path,
    role: route.role,
    navigationCommits: median(samples.map((sample) => sample.navigationCommits)),
    sampleCount: samples.length,
    samples,
    renderProfile: {
      source: "React Profiler in Vite development mode; accumulated during the first second",
      route: aggregateMetrics(samples.map((sample) => sample.renderProfile.route)),
      widgets: Object.fromEntries(
        widgetIds.map((id) => [
          id,
          aggregateMetrics(samples.map((sample) => sample.renderProfile.widgets[id] ?? null)),
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
    schemaVersion: 2,
    measuredAt: new Date().toISOString(),
    baseUrl,
    apiBase,
    nodeVersion: process.version,
    browser: { name: "Chromium", version: browser.version() },
    viewport,
    sampleCountPerRoute: sampleCount,
    interaction: "direct route navigation in a fresh browser context per sample",
    timingLimit:
      "React Profiler timings come from Vite development mode; do not compare them to production Lighthouse or CPU profiles",
    routes: [],
  };

  for (const route of routes) {
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
