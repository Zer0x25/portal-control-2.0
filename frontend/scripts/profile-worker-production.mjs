import { spawn, spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { chromium, request as playwrightRequest } from "@playwright/test";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(frontendRoot, "..");
const assetDirectory = join(frontendRoot, "dist", "assets");
const stagingOrigin = process.env.E2E_BASE_URL || "http://127.0.0.1:8080";
const apiBase = (process.env.E2E_API_URL || `${stagingOrigin}/api`).replace(/\/$/, "");
const viewport = { width: 412, height: 823 };
const sampleCount = 3;
const cpuThrottleRate = 4;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
const defaultOutput = `../specs/079-worker-portal-noapp-cpu-stack-attribution/evidencia/worker-portal-noapp-cpu-${new Date().toISOString().slice(0, 10)}.json`;
const outputPath = resolve(frontendRoot, outputArg || defaultOutput);

const workerCredentials = {
  username: process.env.E2E_WORKER_USERNAME || "juan.perez",
  password: process.env.E2E_WORKER_PASSWORD || "123456",
};

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const roundMs = (value) => Number(value.toFixed(3));

export function sanitizeSourcePath(source) {
  if (typeof source !== "string" || source.length === 0) return "unmapped/unknown";
  let path = source.replace(/\\/g, "/").replace(/[?#].*$/, "");
  path = path.replace(/^[a-z]+:\/\/[^/]*/i, "").replace(/^[A-Za-z]:\//, "");
  const segments = path
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..");
  const srcIndex = segments.lastIndexOf("src");
  if (srcIndex >= 0) return segments.slice(srcIndex).join("/");
  const nodeModulesIndex = segments.lastIndexOf("node_modules");
  if (nodeModulesIndex >= 0) return segments.slice(nodeModulesIndex).join("/");
  return `mapped/${segments.slice(-4).join("/") || "unknown"}`;
}

async function findSourceMaps(directory, relativeDirectory = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = join(relativeDirectory, entry.name);
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await findSourceMaps(absolutePath, relativePath)));
    else if (entry.isFile() && entry.name.endsWith(".map")) result.push(relativePath);
  }
  return result;
}

function sanitizeFunctionName(name) {
  const safeName = String(name || "anonymous")
    .replace(/[^\w$<>. -]/g, "")
    .slice(0, 80);
  return safeName || "anonymous";
}

export function assertPrivacySafe(value, path = "profile") {
  if (typeof value === "string") {
    if (/https?:\/\/|[?#]/i.test(value)) {
      throw new Error(`Profile output contains an origin, query, or fragment at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPrivacySafe(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (/token|password|authorization|payload|credential/i.test(key)) {
        throw new Error(`Profile output contains a sensitive field at ${path}.${key}`);
      }
      assertPrivacySafe(item, `${path}.${key}`);
    }
  }
}

function frameKey(frame) {
  const location = Number.isInteger(frame.sourceLine) ? `@${frame.sourceLine}` : "";
  return `${frame.sourcePath}::${frame.functionName}${location}`;
}

function classifyFrame(frame) {
  if (frame.scriptName === "unknown.js") return "browser-native-or-unknown";
  if (frame.sourcePath.startsWith("node_modules/")) return "mapped-dependency";
  if (frame.sourcePath.startsWith("unmapped/") || frame.sourcePath.startsWith("mapped/unmapped/")) {
    return "unmapped-bundle";
  }
  return "other-mapped-source";
}

function nearestMappedContext(frames) {
  const parents = frames.slice(0, -1);
  const parent = [...parents].reverse().find((frame) => frame.mapped);
  if (parent) return parent;
  return frames.at(-1)?.mapped ? frames.at(-1) : null;
}

function scriptNameFromUrl(url) {
  try {
    return basename(new URL(url).pathname) || "unknown.js";
  } catch {
    return "unknown.js";
  }
}

export function summarizeCpuProfile(profile, resolveFrame) {
  if (!Array.isArray(profile.nodes) || !Array.isArray(profile.samples)) {
    throw new Error("CPUProfile is missing nodes or samples");
  }
  if (!Array.isArray(profile.timeDeltas) || profile.timeDeltas.length !== profile.samples.length) {
    throw new Error("CPUProfile timeDeltas do not match samples");
  }

  const nodesById = new Map(profile.nodes.map((node) => [node.id, node]));
  const parentById = new Map();
  for (const node of profile.nodes) {
    for (const childId of node.children ?? []) parentById.set(childId, node.id);
  }

  const stackCache = new Map();
  const resolvedFrameCache = new Map();
  const stackFor = (nodeId) => {
    if (stackCache.has(nodeId)) return stackCache.get(nodeId);
    const stack = [];
    let currentId = nodeId;
    while (currentId !== undefined && nodesById.has(currentId) && stack.length < 2048) {
      stack.push(nodesById.get(currentId));
      currentId = parentById.get(currentId);
    }
    const result = stack.reverse();
    stackCache.set(nodeId, result);
    return result;
  };
  const frameFor = (node) => {
    if (!resolvedFrameCache.has(node.id)) {
      const resolved = resolveFrame(node.callFrame);
      resolvedFrameCache.set(node.id, {
        sourcePath: sanitizeSourcePath(resolved?.sourcePath),
        functionName: sanitizeFunctionName(resolved?.functionName ?? node.callFrame?.functionName),
        sourceLine: Number.isInteger(resolved?.sourceLine) ? resolved.sourceLine : null,
        mapped: resolved?.mapped === true,
        scriptName: resolved?.scriptName || scriptNameFromUrl(node.callFrame?.url),
      });
    }
    return resolvedFrameCache.get(node.id);
  };

  let profileWindowMs = 0;
  let activeSampledMs = 0;
  let idleSampledMs = 0;
  let programSampledMs = 0;
  let reactCoreInclusiveSampledMs = 0;
  let reactCoreSelfSampledMs = 0;
  let reactCoreSourceMappedSampledMs = 0;
  let noAppFrameSampledMs = 0;
  const selfByKey = new Map();
  const appInclusiveByKey = new Map();
  const noAppLeafByKey = new Map();
  const noAppContextByKey = new Map();
  const noAppLeafCategorySampledMs = new Map();

  profile.samples.forEach((nodeId, index) => {
    const leaf = nodesById.get(nodeId);
    if (!leaf) throw new Error(`CPUProfile sample refers to missing node ${nodeId}`);
    const sampledMs = profile.timeDeltas[index] / 1000;
    profileWindowMs += sampledMs;

    const stack = stackFor(nodeId);
    const frames = stack.map(frameFor);
    const leafName = frames.at(-1).functionName.toLowerCase();
    if (leafName === "idle") {
      idleSampledMs += sampledMs;
      return;
    }
    if (leafName === "program" || leafName === "root") {
      programSampledMs += sampledMs;
      return;
    }
    activeSampledMs += sampledMs;

    const reactCoreFrames = frames.filter((frame) => /^react-core-.*\.js$/.test(frame.scriptName));
    if (reactCoreFrames.length > 0) {
      reactCoreInclusiveSampledMs += sampledMs;
      if (reactCoreFrames.every((frame) => frame.mapped)) {
        reactCoreSourceMappedSampledMs += sampledMs;
      }
    }

    const selfFrame = frames.at(-1);
    if (/^react-core-.*\.js$/.test(selfFrame.scriptName)) {
      reactCoreSelfSampledMs += sampledMs;
    }
    const selfKey = frameKey(selfFrame);
    const selfAggregate = selfByKey.get(selfKey) ?? {
      key: selfKey,
      sourcePath: selfFrame.sourcePath,
      functionName: selfFrame.functionName,
      ...(Number.isInteger(selfFrame.sourceLine) ? { sourceLine: selfFrame.sourceLine } : {}),
      sampledMs: 0,
      sampleCount: 0,
    };
    selfAggregate.sampledMs += sampledMs;
    selfAggregate.sampleCount += 1;
    selfByKey.set(selfKey, selfAggregate);

    const appFrame = [...frames].reverse().find((frame) => frame.sourcePath.startsWith("src/"));
    if (!appFrame) {
      noAppFrameSampledMs += sampledMs;
      const leafCategory = classifyFrame(selfFrame);
      noAppLeafCategorySampledMs.set(
        leafCategory,
        (noAppLeafCategorySampledMs.get(leafCategory) ?? 0) + sampledMs,
      );
      const leafKey = `${leafCategory}:${frameKey(selfFrame)}`;
      const leafAggregate = noAppLeafByKey.get(leafKey) ?? {
        key: leafKey,
        category: leafCategory,
        sourcePath: selfFrame.sourcePath,
        functionName: selfFrame.functionName,
        scriptName: selfFrame.scriptName,
        ...(Number.isInteger(selfFrame.sourceLine) ? { sourceLine: selfFrame.sourceLine } : {}),
        sampledMs: 0,
        sampleCount: 0,
      };
      leafAggregate.sampledMs += sampledMs;
      leafAggregate.sampleCount += 1;
      noAppLeafByKey.set(leafKey, leafAggregate);

      const contextFrame = nearestMappedContext(frames);
      const contextCategory = contextFrame ? classifyFrame(contextFrame) : "unresolved-context";
      const contextKey = contextFrame
        ? `${contextCategory}:${frameKey(contextFrame)}`
        : contextCategory;
      const contextAggregate = noAppContextByKey.get(contextKey) ?? {
        key: contextKey,
        category: contextCategory,
        sourcePath: contextFrame?.sourcePath ?? contextCategory,
        functionName: contextFrame?.functionName ?? contextCategory,
        ...(contextFrame?.scriptName ? { scriptName: contextFrame.scriptName } : {}),
        ...(Number.isInteger(contextFrame?.sourceLine)
          ? { sourceLine: contextFrame.sourceLine }
          : {}),
        sampledMs: 0,
        sampleCount: 0,
      };
      contextAggregate.sampledMs += sampledMs;
      contextAggregate.sampleCount += 1;
      noAppContextByKey.set(contextKey, contextAggregate);
      return;
    }
    const appKey = frameKey(appFrame);
    const appAggregate = appInclusiveByKey.get(appKey) ?? {
      key: appKey,
      sourcePath: appFrame.sourcePath,
      functionName: appFrame.functionName,
      ...(Number.isInteger(appFrame.sourceLine) ? { sourceLine: appFrame.sourceLine } : {}),
      sampledMs: 0,
    };
    appAggregate.sampledMs += sampledMs;
    appInclusiveByKey.set(appKey, appAggregate);
  });

  const sortedFrames = (items) =>
    [...items.values()]
      .map((frame) => ({ ...frame, sampledMs: roundMs(frame.sampledMs) }))
      .sort((left, right) => right.sampledMs - left.sampledMs || left.key.localeCompare(right.key));

  return {
    sampleCount: profile.samples.length,
    profileWindowMs: roundMs(profileWindowMs),
    activeSampledMs: roundMs(activeSampledMs),
    idleSampledMs: roundMs(idleSampledMs),
    programSampledMs: roundMs(programSampledMs),
    reactCoreInclusiveSampledMs: roundMs(reactCoreInclusiveSampledMs),
    reactCoreSelfSampledMs: roundMs(reactCoreSelfSampledMs),
    reactCoreSourceMappedSampledMs: roundMs(reactCoreSourceMappedSampledMs),
    reactCoreSourceMapCoverage:
      reactCoreInclusiveSampledMs === 0
        ? 0
        : Number((reactCoreSourceMappedSampledMs / reactCoreInclusiveSampledMs).toFixed(4)),
    noAppFrameSampledMs: roundMs(noAppFrameSampledMs),
    noAppLeafCategorySampledMs: Object.fromEntries(
      [...noAppLeafCategorySampledMs.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([category, sampledMs]) => [category, roundMs(sampledMs)]),
    ),
    appInclusiveFrames: sortedFrames(appInclusiveByKey),
    selfFrames: sortedFrames(selfByKey),
    noAppLeafFrames: sortedFrames(noAppLeafByKey),
    noAppContextFrames: sortedFrames(noAppContextByKey),
  };
}

export function aggregateProfileSummaries(samples) {
  if (samples.length === 0) throw new Error("At least one CPU profile summary is required");
  const appFrameKeys = new Map();
  const noAppContextFrameKeys = new Map();
  const noAppLeafCategories = new Set();
  for (const sample of samples) {
    for (const frame of sample.appInclusiveFrames) appFrameKeys.set(frame.key, frame);
    for (const frame of sample.noAppContextFrames ?? []) {
      noAppContextFrameKeys.set(frame.key, frame);
    }
    for (const category of Object.keys(sample.noAppLeafCategorySampledMs ?? {})) {
      noAppLeafCategories.add(category);
    }
  }

  const appFrameMedians = [...appFrameKeys.entries()]
    .map(([key, frame]) => {
      const observed = samples.map(
        (sample) => sample.appInclusiveFrames.find((entry) => entry.key === key)?.sampledMs ?? 0,
      );
      return {
        key,
        sourcePath: frame.sourcePath,
        functionName: frame.functionName,
        ...(Number.isInteger(frame.sourceLine) ? { sourceLine: frame.sourceLine } : {}),
        medianSampledMs: roundMs(median(observed)),
        observedSamples: observed.filter((value) => value > 0).length,
      };
    })
    .sort(
      (left, right) =>
        right.medianSampledMs - left.medianSampledMs || left.key.localeCompare(right.key),
    );

  const noAppContextFrameMedians = [...noAppContextFrameKeys.entries()]
    .map(([key, frame]) => {
      const observed = samples.map(
        (sample) => sample.noAppContextFrames?.find((entry) => entry.key === key)?.sampledMs ?? 0,
      );
      return {
        key,
        category: frame.category,
        sourcePath: frame.sourcePath,
        functionName: frame.functionName,
        ...(frame.scriptName ? { scriptName: frame.scriptName } : {}),
        ...(Number.isInteger(frame.sourceLine) ? { sourceLine: frame.sourceLine } : {}),
        medianSampledMs: roundMs(median(observed)),
        observedSamples: observed.filter((value) => value > 0).length,
      };
    })
    .sort(
      (left, right) =>
        right.medianSampledMs - left.medianSampledMs || left.key.localeCompare(right.key),
    );

  const noAppLeafCategoryMedians = [...noAppLeafCategories]
    .map((category) => {
      const observed = samples.map((sample) => sample.noAppLeafCategorySampledMs?.[category] ?? 0);
      return {
        category,
        medianSampledMs: roundMs(median(observed)),
        observedSamples: observed.filter((value) => value > 0).length,
      };
    })
    .sort(
      (left, right) =>
        right.medianSampledMs - left.medianSampledMs || left.category.localeCompare(right.category),
    );

  return {
    sampleCount: samples.length,
    medianProfileWindowMs: roundMs(median(samples.map((sample) => sample.profileWindowMs))),
    medianActiveSampledMs: roundMs(median(samples.map((sample) => sample.activeSampledMs))),
    medianIdleSampledMs: roundMs(median(samples.map((sample) => sample.idleSampledMs))),
    medianProgramSampledMs: roundMs(median(samples.map((sample) => sample.programSampledMs))),
    medianReactCoreInclusiveSampledMs: roundMs(
      median(samples.map((sample) => sample.reactCoreInclusiveSampledMs)),
    ),
    medianReactCoreSelfSampledMs: roundMs(
      median(samples.map((sample) => sample.reactCoreSelfSampledMs)),
    ),
    medianReactCoreSourceMapCoverage: Number(
      median(samples.map((sample) => sample.reactCoreSourceMapCoverage)).toFixed(4),
    ),
    medianNoAppFrameSampledMs: roundMs(median(samples.map((sample) => sample.noAppFrameSampledMs))),
    appFrameMedians,
    repeatedAppCandidates: appFrameMedians.filter((frame) => frame.observedSamples >= 2),
    noAppLeafCategoryMedians,
    noAppContextFrameMedians,
    repeatedNoAppContextCandidates: noAppContextFrameMedians.filter(
      (frame) => frame.observedSamples >= 2 && frame.category !== "unresolved-context",
    ),
  };
}

async function runNpm(args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("npm", args, { cwd: frontendRoot, env: process.env, stdio: "inherit" });
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`npm ${args.join(" ")} exited with ${code ?? signal}`));
    });
  });
}

function gitValue(args) {
  return spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).stdout.trim();
}

function dockerValue(args) {
  const result = spawnSync("docker", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function stagingFrontendImageId() {
  const containerId = dockerValue([
    "compose",
    "--env-file",
    ".env.staging",
    "-f",
    "compose.staging.yaml",
    "ps",
    "-q",
    "frontend",
  ]);
  if (!containerId) throw new Error("Local staging frontend container is not running");
  const imageId = dockerValue(["inspect", "--format={{.Image}}", containerId]);
  if (!imageId) throw new Error("Could not read the active staging frontend image ID");
  return imageId;
}

async function assertProfiledAssetsMatchStaging() {
  const scripts = (await readdir(assetDirectory)).filter((file) => file.endsWith(".js"));
  if (scripts.length === 0) throw new Error("Profiled production build contains no scripts");
  for (const file of scripts) {
    const localBundle = (await readFile(join(assetDirectory, file), "utf8")).replace(
      /\n?\/\/[#@]\s*sourceMappingURL=[^\r\n]*\s*$/,
      "",
    );
    const response = await fetch(`${stagingOrigin}/assets/${file}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(
        `Staging is missing profiled JavaScript asset ${file} (HTTP ${response.status})`,
      );
    }
    const stagingBundle = await response.text();
    if (localBundle !== stagingBundle) {
      throw new Error(`Local source map does not match the active staging asset ${file}`);
    }
  }
  return scripts.length;
}

async function loadSourceMaps() {
  const files = (await readdir(assetDirectory)).filter((file) => file.endsWith(".js.map"));
  if (files.length === 0)
    throw new Error("Profiled production build has no JavaScript source maps");
  const maps = new Map();
  for (const file of files) {
    const contents = JSON.parse(await readFile(join(assetDirectory, file), "utf8"));
    maps.set(file.slice(0, -4), new TraceMap(contents));
  }
  return maps;
}

function resolveMappedFrame(callFrame, maps) {
  const scriptName = scriptNameFromUrl(callFrame.url);
  const map = maps.get(scriptName);
  if (!map) {
    return {
      sourcePath: `unmapped/${scriptName}`,
      functionName: callFrame.functionName,
      sourceLine: null,
      mapped: false,
      scriptName,
    };
  }

  const original = originalPositionFor(map, {
    line: Math.max(1, (callFrame.lineNumber ?? 0) + 1),
    column: Math.max(0, callFrame.columnNumber ?? 0),
  });
  if (!original.source) {
    return {
      sourcePath: `unmapped/${scriptName}`,
      functionName: callFrame.functionName,
      sourceLine: null,
      mapped: false,
      scriptName,
    };
  }
  return {
    sourcePath: sanitizeSourcePath(original.source),
    functionName: original.name || callFrame.functionName,
    sourceLine: original.line ?? null,
    mapped: true,
    scriptName,
  };
}

async function loginWorker(request) {
  const response = await request.post(`${apiBase}/auth/login`, { data: workerCredentials });
  if (!response.ok()) throw new Error(`Worker login failed with HTTP ${response.status()}`);
  const body = await response.json();
  if (!body.token || body.role !== "Usuario" || body.mustChangePassword === true) {
    throw new Error("Worker test session is missing or requires a password-change flow");
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
}

async function captureSample(browser, session, maps) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1.75,
    serviceWorkers: "block",
  });
  await context.addInitScript(({ token, user }) => {
    sessionStorage.setItem("authToken", token);
    sessionStorage.setItem("currentUser", JSON.stringify(user));
  }, session);

  let cdp;
  let profileStarted = false;
  try {
    const page = await context.newPage();
    let apiResponseFailures = 0;
    let websocketOpenCount = 0;
    let websocketErrorCount = 0;
    let websocketReceivedFrameCount = 0;
    page.on("response", (response) => {
      try {
        if (new URL(response.url()).pathname.startsWith("/api/") && response.status() >= 400) {
          apiResponseFailures += 1;
        }
      } catch {
        // Ignore non-HTTP resources without retaining their URLs.
      }
    });
    page.on("websocket", (socket) => {
      websocketOpenCount += 1;
      socket.on("socketerror", () => {
        websocketErrorCount += 1;
      });
      socket.on("framereceived", () => {
        websocketReceivedFrameCount += 1;
      });
    });
    cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottleRate });
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
    await cdp.send("Profiler.start");
    profileStarted = true;
    const startedAt = Date.now();

    await page.goto(`${stagingOrigin}/#/worker-portal`, { waitUntil: "domcontentloaded" });
    await page
      .locator('#root [data-testid="server-clock"]')
      .waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1000);
    const profileResponse = await cdp.send("Profiler.stop");
    profileStarted = false;
    const summary = summarizeCpuProfile(profileResponse.profile, (frame) =>
      resolveMappedFrame(frame, maps),
    );

    return {
      wallWindowMs: Date.now() - startedAt,
      clockVisible: true,
      apiResponseFailures,
      websocketOpenCount,
      websocketErrorCount,
      websocketReceivedFrameCount,
      ...summary,
      appInclusiveFrames: summary.appInclusiveFrames.slice(0, 20),
      selfFrames: summary.selfFrames.slice(0, 30),
      noAppLeafFrames: summary.noAppLeafFrames.slice(0, 30),
      noAppContextFrames: summary.noAppContextFrames.slice(0, 30),
    };
  } finally {
    if (profileStarted && cdp) {
      try {
        await cdp.send("Profiler.stop");
      } catch {
        // The context is closed below even if Chrome already stopped profiling.
      }
    }
    await cdp?.detach();
    await context.close();
  }
}

async function assertNoSourceMapsRemain() {
  const leftovers = await findSourceMaps(join(frontendRoot, "dist"));
  if (leftovers.length > 0) {
    throw new Error(`Normal frontend dist still contains source maps: ${leftovers.join(", ")}`);
  }
}

async function main() {
  let profiledBuildAttempted = false;
  let stagingImageBefore;
  let runError;
  try {
    if (
      new URL(stagingOrigin).origin !== "http://127.0.0.1:8080" ||
      new URL(apiBase).origin !== "http://127.0.0.1:8080"
    ) {
      throw new Error("CPU attribution is restricted to local staging at 127.0.0.1:8080");
    }
    stagingImageBefore = stagingFrontendImageId();
    const health = await fetch(`${apiBase}/health/ready`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`Staging API readiness returned HTTP ${health.status}`);

    profiledBuildAttempted = true;
    await runNpm(["run", "build:profiled"]);
    const maps = await loadSourceMaps();
    const comparedScriptAssets = await assertProfiledAssetsMatchStaging();

    const request = await playwrightRequest.newContext();
    const browser = await chromium.launch({ headless: true });
    try {
      const session = await loginWorker(request);
      const samples = [];
      for (let index = 0; index < sampleCount; index += 1) {
        samples.push(await captureSample(browser, session, maps));
      }

      const report = {
        schemaVersion: 2,
        capturedAt: new Date().toISOString(),
        source: {
          commit: gitValue(["rev-parse", "HEAD"]),
          workingTreeDirty: gitValue(["status", "--porcelain"]).length > 0,
        },
        runtime: {
          nodeVersion: process.version,
          browser: "Chromium",
          browserVersion: browser.version(),
          viewport,
          deviceScaleFactor: 1.75,
          cpuThrottleRate,
          samplingIntervalUs: 1000,
        },
        target: {
          routeId: "worker-portal",
          profile: "active-staging-production-bundle",
          stagingFrontendImageId: stagingImageBefore,
          sourceMapAssetsMatched: true,
          comparedScriptAssets,
        },
        samples,
        summary: aggregateProfileSummaries(samples),
        interpretation: {
          performanceComparison: false,
          recommendationRule:
            "An unattributed context is a candidate only when its closest mapped frame appears in at least two samples; native or unknown leaf frames remain separate from that context.",
        },
      };
      assertPrivacySafe(report);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      process.stdout.write(`CPU profile saved: ${outputPath}\n`);
    } finally {
      await browser.close();
      await request.dispose();
    }
  } catch (error) {
    runError = error;
  } finally {
    if (profiledBuildAttempted) {
      try {
        await runNpm(["run", "build"]);
        await assertNoSourceMapsRemain();
        const stagingImageAfter = stagingFrontendImageId();
        if (stagingImageAfter !== stagingImageBefore) {
          throw new Error("Active staging frontend image changed during CPU attribution");
        }
      } catch (restoreError) {
        runError = new AggregateError(
          [runError, restoreError].filter(Boolean),
          "Profile run or normal frontend build restoration failed",
        );
      }
    }
  }
  if (runError) throw runError;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
