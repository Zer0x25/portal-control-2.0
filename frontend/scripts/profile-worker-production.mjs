import { spawn, spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { chromium, request as playwrightRequest } from "@playwright/test";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(frontendRoot, "..");

export function resolveProfiledAssetDirectory(assetDirectoryArg, baseDirectory = frontendRoot) {
  return assetDirectoryArg
    ? resolve(baseDirectory, assetDirectoryArg)
    : join(baseDirectory, "dist", "assets");
}

const profiledAssetsArg = process.argv
  .find((arg) => arg.startsWith("--profiled-assets-dir="))
  ?.slice("--profiled-assets-dir=".length);
const assetDirectory = resolveProfiledAssetDirectory(profiledAssetsArg);
const stagingOrigin = process.env.E2E_BASE_URL || "http://127.0.0.1:8080";
const apiBase = (process.env.E2E_API_URL || `${stagingOrigin}/api`).replace(/\/$/, "");
const viewport = { width: 412, height: 823 };
const sampleCount = 3;
const cpuThrottleRate = 4;
const longTaskThresholdUs = 50_000;
const traceCategories = "devtools.timeline,disabled-by-default-devtools.timeline";
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
const routeArg = process.argv.find((arg) => arg.startsWith("--route="))?.slice(8);

export function resolveProfileRoute(routeId = "worker-portal") {
  const routes = {
    "worker-portal": {
      id: "worker-portal",
      path: "/worker-portal",
      currentPath: "/worker-portal",
      role: "worker",
      expectedRole: "Usuario",
      username: process.env.E2E_WORKER_USERNAME || "juan.perez",
      password: process.env.E2E_WORKER_PASSWORD || "123456",
    },
    "time-control": {
      id: "time-control",
      path: "/time-control",
      currentPath: "/time-control",
      role: "admin",
      expectedRole: "Administrador",
      username: process.env.E2E_ADMIN_USERNAME || "admin",
      password: process.env.E2E_ADMIN_PASSWORD || "999.666",
    },
  };
  const route = routes[routeId];
  if (!route) throw new Error(`Unsupported production profile route: ${routeId}`);
  return route;
}

const profileRoute = resolveProfileRoute(routeArg);
const defaultOutput =
  profileRoute.id === "time-control"
    ? `../specs/085-time-control-tbt-optimization/evidencia/time-control-production-cpu-${new Date().toISOString().slice(0, 10)}.json`
    : `../specs/079-worker-portal-noapp-cpu-stack-attribution/evidencia/worker-portal-noapp-cpu-${new Date().toISOString().slice(0, 10)}.json`;
const outputPath = resolve(frontendRoot, outputArg || defaultOutput);

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

async function assertProfiledAssetsMatchStaging(directory = assetDirectory) {
  const scripts = (await readdir(directory)).filter((file) => file.endsWith(".js"));
  if (scripts.length === 0) throw new Error("Profiled production build contains no scripts");
  for (const file of scripts) {
    const profiledBundle = (await readFile(join(directory, file), "utf8")).replace(
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
    if (profiledBundle !== stagingBundle) {
      throw new Error(`Profiled source map does not match the active staging asset ${file}`);
    }
  }
  return scripts.length;
}

async function loadSourceMaps(directory = assetDirectory) {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".js.map"));
  if (files.length === 0)
    throw new Error("Profiled production build has no JavaScript source maps");
  const maps = new Map();
  for (const file of files) {
    const contents = JSON.parse(await readFile(join(directory, file), "utf8"));
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

export function summarizeLongTaskTrace(
  traceEvents,
  resolveFrame,
  { dataLossOccurred = false } = {},
) {
  if (!Array.isArray(traceEvents)) throw new Error("Trace events must be an array");
  if (typeof resolveFrame !== "function") throw new Error("A source frame resolver is required");

  const rendererMainThreadIds = new Set(
    traceEvents
      .filter((event) => event.name === "thread_name" && event.args?.name === "CrRendererMain")
      .map((event) => `${event.pid}:${event.tid}`),
  );
  const taskEvents = traceEvents.filter(
    (event) =>
      event.name === "RunTask" &&
      event.ph === "X" &&
      rendererMainThreadIds.has(`${event.pid}:${event.tid}`) &&
      Number.isFinite(event.ts) &&
      Number.isFinite(event.dur) &&
      event.dur >= longTaskThresholdUs,
  );
  const firstTaskTimestampUs = taskEvents.reduce(
    (minimum, event) => Math.min(minimum, event.ts),
    Number.POSITIVE_INFINITY,
  );
  const scriptEventsByThread = new Map();
  for (const event of traceEvents) {
    if (
      !["FunctionCall", "EvaluateScript"].includes(event.name) ||
      event.ph !== "X" ||
      !Number.isFinite(event.ts) ||
      !Number.isFinite(event.dur) ||
      event.dur <= 0
    ) {
      continue;
    }
    const key = `${event.pid}:${event.tid}`;
    const entries = scriptEventsByThread.get(key) ?? [];
    entries.push(event);
    scriptEventsByThread.set(key, entries);
  }

  const tasks = taskEvents
    .map((task) => {
      const taskEndUs = task.ts + task.dur;
      const scriptCalls = (scriptEventsByThread.get(`${task.pid}:${task.tid}`) ?? [])
        .filter((event) => event.ts >= task.ts && event.ts + event.dur <= taskEndUs + 1)
        .map((event) => {
          const data = event.args?.data ?? {};
          const frame = resolveFrame({
            url: data.url,
            lineNumber: Number.isInteger(data.lineNumber) ? data.lineNumber : 0,
            columnNumber: Number.isInteger(data.columnNumber) ? data.columnNumber : 0,
            functionName: data.functionName,
          });
          return {
            eventKind: event.name,
            durationMs: roundMs(event.dur / 1000),
            sourcePath: frame?.sourcePath ?? "unmapped/unknown",
            functionName: sanitizeFunctionName(frame?.functionName ?? data.functionName),
            ...(Number.isInteger(frame?.sourceLine) ? { sourceLine: frame.sourceLine } : {}),
            mapped: frame?.mapped === true,
          };
        })
        .sort(
          (left, right) =>
            right.durationMs - left.durationMs ||
            left.sourcePath.localeCompare(right.sourcePath) ||
            left.functionName.localeCompare(right.functionName),
        );

      return {
        startOffsetMs: Number.isFinite(firstTaskTimestampUs)
          ? roundMs((task.ts - firstTaskTimestampUs) / 1000)
          : 0,
        durationMs: roundMs(task.dur / 1000),
        scriptCallCount: scriptCalls.length,
        topScriptCalls: scriptCalls.slice(0, 5),
      };
    })
    .sort((left, right) => left.startOffsetMs - right.startOffsetMs);

  return {
    rendererMainThreadStatus: rendererMainThreadIds.size > 0 ? "captured" : "unavailable",
    rendererMainThreadCount: rendererMainThreadIds.size,
    dataLossOccurred,
    minimumTaskDurationMs: longTaskThresholdUs / 1000,
    taskCount: tasks.length,
    tasks,
  };
}

export function correlateCpuProfileWithTrace(profile, traceEvents, resolveFrame) {
  if (!Array.isArray(profile.samples) || !Array.isArray(profile.timeDeltas)) {
    throw new Error("CPU profile is missing samples or time deltas");
  }
  if (profile.samples.length !== profile.timeDeltas.length) {
    throw new Error("CPU profile time deltas do not match samples");
  }
  if (!Number.isFinite(profile.startTime)) throw new Error("CPU profile start time is missing");

  const rendererMainThreadIds = new Set(
    traceEvents
      .filter((event) => event.name === "thread_name" && event.args?.name === "CrRendererMain")
      .map((event) => `${event.pid}:${event.tid}`),
  );
  const tasks = traceEvents
    .filter(
      (event) =>
        event.name === "RunTask" &&
        event.ph === "X" &&
        rendererMainThreadIds.has(`${event.pid}:${event.tid}`) &&
        Number.isFinite(event.ts) &&
        Number.isFinite(event.dur) &&
        event.dur >= longTaskThresholdUs,
    )
    .sort((left, right) => left.ts - right.ts);
  const firstTaskTimestampUs = tasks.reduce(
    (minimum, task) => Math.min(minimum, task.ts),
    Number.POSITIVE_INFINITY,
  );
  const nodesById = new Map(profile.nodes.map((node) => [node.id, node]));
  const parentById = new Map();
  for (const node of profile.nodes) {
    for (const childId of node.children ?? []) parentById.set(childId, node.id);
  }
  const mappedFramesById = new Map();
  const appSamplesByTask = tasks.map(() => new Map());
  const selfSamplesByTask = tasks.map(() => new Map());
  const profileMetricsByTask = tasks.map(() => ({ sampleCount: 0, sampledMs: 0 }));
  let sampleTimestampUs = profile.startTime;
  let matchedSampleCount = 0;
  let ignoredNonPositiveSampleDeltas = 0;

  for (let index = 0; index < profile.samples.length; index += 1) {
    const sampleDeltaUs = profile.timeDeltas[index];
    if (!Number.isFinite(sampleDeltaUs)) {
      throw new Error("CPU profile contains a non-finite time delta");
    }
    sampleTimestampUs += sampleDeltaUs;
    if (sampleDeltaUs <= 0) {
      ignoredNonPositiveSampleDeltas += 1;
      continue;
    }
    const taskIndex = tasks.findIndex(
      (task) => sampleTimestampUs >= task.ts && sampleTimestampUs < task.ts + task.dur,
    );
    if (taskIndex < 0) continue;
    matchedSampleCount += 1;
    profileMetricsByTask[taskIndex].sampleCount += 1;
    profileMetricsByTask[taskIndex].sampledMs += sampleDeltaUs / 1000;

    const stack = [];
    let nodeId = profile.samples[index];
    while (nodeId !== undefined && nodesById.has(nodeId) && stack.length < 2048) {
      const node = nodesById.get(nodeId);
      if (!mappedFramesById.has(node.id)) {
        mappedFramesById.set(node.id, resolveFrame(node.callFrame));
      }
      stack.push(mappedFramesById.get(node.id));
      nodeId = parentById.get(nodeId);
    }
    const selfFrame = stack[0];
    if (selfFrame) {
      const selfKey = `${selfFrame.sourcePath ?? "unmapped/unknown"}::${selfFrame.functionName ?? "anonymous"}@${selfFrame.sourceLine ?? "?"}`;
      const selfAggregate = selfSamplesByTask[taskIndex].get(selfKey) ?? {
        sourcePath: selfFrame.sourcePath ?? "unmapped/unknown",
        functionName: sanitizeFunctionName(selfFrame.functionName),
        ...(Number.isInteger(selfFrame.sourceLine) ? { sourceLine: selfFrame.sourceLine } : {}),
        mapped: selfFrame.mapped === true,
        sampledMs: 0,
        sampleCount: 0,
      };
      selfAggregate.sampledMs += sampleDeltaUs / 1000;
      selfAggregate.sampleCount += 1;
      selfSamplesByTask[taskIndex].set(selfKey, selfAggregate);
    }
    const appFrame = stack.find(
      (frame) => frame?.mapped === true && frame.sourcePath.startsWith("src/"),
    );
    if (!appFrame) continue;

    const key = `${appFrame.sourcePath}::${appFrame.functionName}@${appFrame.sourceLine ?? "?"}`;
    const aggregate = appSamplesByTask[taskIndex].get(key) ?? {
      sourcePath: appFrame.sourcePath,
      functionName: sanitizeFunctionName(appFrame.functionName),
      ...(Number.isInteger(appFrame.sourceLine) ? { sourceLine: appFrame.sourceLine } : {}),
      mapped: true,
      sampledMs: 0,
      sampleCount: 0,
    };
    aggregate.sampledMs += sampleDeltaUs / 1000;
    aggregate.sampleCount += 1;
    appSamplesByTask[taskIndex].set(key, aggregate);
  }

  return {
    clockAlignmentStatus: matchedSampleCount > 0 ? "matched" : "no-overlap",
    profileSampleCount: profile.samples.length,
    samplesInsideLongTasks: matchedSampleCount,
    ignoredNonPositiveSampleDeltas,
    tasks: tasks.map((task, index) => ({
      startOffsetMs: Number.isFinite(firstTaskTimestampUs)
        ? roundMs((task.ts - firstTaskTimestampUs) / 1000)
        : 0,
      durationMs: roundMs(task.dur / 1000),
      profileSampleCount: profileMetricsByTask[index].sampleCount,
      profileSampledMs: roundMs(profileMetricsByTask[index].sampledMs),
      selfFrames: [...selfSamplesByTask[index].values()]
        .map((frame) => ({ ...frame, sampledMs: roundMs(frame.sampledMs) }))
        .sort(
          (left, right) =>
            right.sampledMs - left.sampledMs || left.sourcePath.localeCompare(right.sourcePath),
        )
        .slice(0, 5),
      appFrames: [...appSamplesByTask[index].values()]
        .map((frame) => ({ ...frame, sampledMs: roundMs(frame.sampledMs) }))
        .sort(
          (left, right) =>
            right.sampledMs - left.sampledMs || left.sourcePath.localeCompare(right.sourcePath),
        ),
    })),
  };
}

export function aggregateLongTaskTraces(samples) {
  if (samples.length === 0) throw new Error("At least one long-task trace summary is required");

  const frameDurationsBySample = new Map();
  for (const [sampleIndex, sample] of samples.entries()) {
    const perSample = new Map();
    for (const task of sample.cpuProfileCorrelation?.tasks ?? sample.tasks ?? []) {
      for (const call of task.appFrames ?? task.topScriptCalls ?? []) {
        if (!call.mapped || !call.sourcePath.startsWith("src/")) continue;
        const key = `${call.sourcePath}::${call.functionName}@${call.sourceLine ?? "?"}`;
        const durationMs = call.sampledMs ?? call.durationMs ?? 0;
        perSample.set(key, Math.max(perSample.get(key) ?? 0, durationMs));
      }
    }
    for (const [key, durationMs] of perSample) {
      const durations = frameDurationsBySample.get(key) ?? [];
      durations.push({ sampleIndex, durationMs });
      frameDurationsBySample.set(key, durations);
    }
  }

  const appCandidates = [...frameDurationsBySample.entries()]
    .map(([key, durations]) => {
      const [sourceAndFunction, linePart] = key.split("@");
      const separator = sourceAndFunction.lastIndexOf("::");
      const observed = durations.map((entry) => entry.durationMs);
      return {
        sourcePath: sourceAndFunction.slice(0, separator),
        functionName: sourceAndFunction.slice(separator + 2),
        ...(linePart !== "?" ? { sourceLine: Number(linePart) } : {}),
        medianSampledMs: roundMs(median(observed)),
        observedSamples: new Set(durations.map((entry) => entry.sampleIndex)).size,
      };
    })
    .sort(
      (left, right) =>
        right.medianSampledMs - left.medianSampledMs ||
        left.sourcePath.localeCompare(right.sourcePath),
    );

  return {
    sampleCount: samples.length,
    samplesWithRendererMainThread: samples.filter(
      (sample) => sample.rendererMainThreadStatus === "captured",
    ).length,
    medianTaskCount: median(samples.map((sample) => sample.taskCount ?? sample.tasks?.length ?? 0)),
    samplesWithCpuProfileOverlap: samples.filter(
      (sample) => sample.cpuProfileCorrelation?.clockAlignmentStatus === "matched",
    ).length,
    repeatedAppCandidates: appCandidates.filter((candidate) => candidate.observedSamples >= 2),
  };
}

function openApiPathMatches(template, pathname) {
  const expression = template
    .split("/")
    .map((segment) =>
      /^\{[^/]+\}$/.test(segment) ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return new RegExp(`^${expression}$`).test(pathname);
}

export function matchOpenApiRouteTemplate(pathname, method, openApiPaths) {
  if (typeof pathname !== "string" || typeof method !== "string" || !openApiPaths) return null;
  const normalizedMethod = method.toLowerCase();
  return (
    Object.entries(openApiPaths)
      .filter(
        ([, operations]) =>
          operations &&
          typeof operations === "object" &&
          Object.hasOwn(operations, normalizedMethod),
      )
      .sort(([left], [right]) => {
        const parameterCount = (path) => (path.match(/\{[^/]+\}/g) ?? []).length;
        return parameterCount(left) - parameterCount(right) || left.localeCompare(right);
      })
      .find(([template]) => openApiPathMatches(template, pathname))?.[0] ?? null
  );
}

function safeInitiatorFrames(initiator, resolveFrame) {
  const frames = [];
  let stack = initiator?.stack;
  while (stack && frames.length < 5) {
    for (const callFrame of stack.callFrames ?? []) {
      if (frames.length >= 5) break;
      if (typeof callFrame.url !== "string") continue;
      let resolved;
      try {
        resolved = resolveFrame({
          url: callFrame.url,
          lineNumber: Number.isInteger(callFrame.lineNumber) ? callFrame.lineNumber : 0,
          columnNumber: Number.isInteger(callFrame.columnNumber) ? callFrame.columnNumber : 0,
          functionName: callFrame.functionName,
        });
      } catch {
        resolved = null;
      }
      const sourcePath = sanitizeSourcePath(resolved?.sourcePath);
      const functionName = sanitizeFunctionName(resolved?.functionName ?? callFrame.functionName);
      const sourceLine = Number.isInteger(resolved?.sourceLine) ? resolved.sourceLine : null;
      const key = `${sourcePath}::${functionName}@${sourceLine ?? "?"}`;
      if (frames.some((frame) => frame.key === key)) continue;
      frames.push({
        key,
        sourcePath,
        functionName,
        ...(sourceLine !== null ? { sourceLine } : {}),
        mapped: resolved?.mapped === true,
      });
    }
    stack = stack.parent;
  }
  return frames.map(({ key: _key, ...frame }) => frame);
}

const networkTimeToUs = (timestamp) => (Number.isFinite(timestamp) ? timestamp * 1_000_000 : null);
const safeHttpMethod = (method) => {
  const upper = String(method ?? "").toUpperCase();
  return ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE"].includes(upper)
    ? upper
    : "OTHER";
};

export function createApiRequestCollector({
  apiOrigin,
  apiPathPrefix,
  openApiPaths,
  resolveFrame,
  maxRequests = 200,
}) {
  if (typeof apiOrigin !== "string" || typeof apiPathPrefix !== "string") {
    throw new Error("API origin and path prefix are required");
  }
  if (typeof resolveFrame !== "function") throw new Error("A source frame resolver is required");

  const activeRequests = new Map();
  const completedRequests = [];
  let capturedRequestCount = 0;
  let ignoredRequestCount = 0;

  const isApiPath = (pathname) =>
    pathname === apiPathPrefix || pathname.startsWith(`${apiPathPrefix.replace(/\/$/, "")}/`);
  const finishRedirect = (requestId, event) => {
    const previous = activeRequests.get(requestId);
    if (!previous) return;
    const redirectedAtUs = networkTimeToUs(event.timestamp);
    previous.status = Number.isInteger(event.redirectResponse?.status)
      ? event.redirectResponse.status
      : null;
    previous.responseAtUs = redirectedAtUs;
    previous.finishedAtUs = redirectedAtUs;
    previous.completion = "redirected";
    completedRequests.push(previous);
    activeRequests.delete(requestId);
  };

  return {
    onRequestWillBeSent(event) {
      if (typeof event.requestId !== "string") {
        ignoredRequestCount += 1;
        return;
      }
      if (event.redirectResponse) finishRedirect(event.requestId, event);
      else if (activeRequests.has(event.requestId)) {
        const staleRequest = activeRequests.get(event.requestId);
        staleRequest.completion = "incomplete";
        completedRequests.push(staleRequest);
        activeRequests.delete(event.requestId);
      }

      const startAtUs = networkTimeToUs(event.timestamp);
      if (startAtUs === null || !event.request || typeof event.request.url !== "string") {
        ignoredRequestCount += 1;
        return;
      }
      let requestUrl;
      try {
        requestUrl = new URL(event.request.url);
      } catch {
        ignoredRequestCount += 1;
        return;
      }
      if (requestUrl.origin !== apiOrigin || !isApiPath(requestUrl.pathname)) return;
      if (capturedRequestCount >= maxRequests) {
        ignoredRequestCount += 1;
        return;
      }

      capturedRequestCount += 1;
      activeRequests.set(event.requestId, {
        endpoint:
          matchOpenApiRouteTemplate(requestUrl.pathname, event.request.method, openApiPaths) ??
          "unmatched-api-route",
        method: safeHttpMethod(event.request.method),
        startAtUs,
        responseAtUs: null,
        finishedAtUs: null,
        status: null,
        bytesReceived: null,
        completion: "incomplete",
        initiatorType: ["parser", "script", "preload", "other"].includes(event.initiator?.type)
          ? event.initiator.type
          : "unavailable",
        initiatorFrames: safeInitiatorFrames(event.initiator, resolveFrame),
      });
    },
    onResponseReceived(event) {
      const request = activeRequests.get(event.requestId);
      if (!request) return;
      const responseAtUs = networkTimeToUs(event.timestamp);
      if (responseAtUs !== null) request.responseAtUs = responseAtUs;
      if (Number.isInteger(event.response?.status)) request.status = event.response.status;
    },
    onLoadingFinished(event) {
      const request = activeRequests.get(event.requestId);
      if (!request) return;
      const finishedAtUs = networkTimeToUs(event.timestamp);
      if (finishedAtUs !== null) request.finishedAtUs = finishedAtUs;
      request.bytesReceived = Number.isFinite(event.encodedDataLength)
        ? Math.max(0, Math.round(event.encodedDataLength))
        : null;
      request.completion = "completed";
      completedRequests.push(request);
      activeRequests.delete(event.requestId);
    },
    onLoadingFailed(event) {
      const request = activeRequests.get(event.requestId);
      if (!request) return;
      const failedAtUs = networkTimeToUs(event.timestamp);
      if (failedAtUs !== null) request.finishedAtUs = failedAtUs;
      request.completion = "failed";
      request.canceled = event.canceled === true;
      completedRequests.push(request);
      activeRequests.delete(event.requestId);
    },
    summarize(traceEvents) {
      for (const request of activeRequests.values()) completedRequests.push(request);
      activeRequests.clear();

      const rendererMainThreadIds = new Set(
        traceEvents
          .filter((event) => event.name === "thread_name" && event.args?.name === "CrRendererMain")
          .map((event) => `${event.pid}:${event.tid}`),
      );
      const tasks = traceEvents
        .filter(
          (event) =>
            event.name === "RunTask" &&
            event.ph === "X" &&
            rendererMainThreadIds.has(`${event.pid}:${event.tid}`) &&
            Number.isFinite(event.ts) &&
            Number.isFinite(event.dur) &&
            event.dur >= longTaskThresholdUs,
        )
        .sort((left, right) => left.ts - right.ts);
      const firstTaskTimestampUs = tasks.reduce(
        (minimum, task) => Math.min(minimum, task.ts),
        Number.POSITIVE_INFINITY,
      );
      const requests = completedRequests
        .map((request) => {
          const startedDuringTaskIndex = tasks.findIndex(
            (task) => request.startAtUs >= task.ts && request.startAtUs < task.ts + task.dur,
          );
          const eventTimesOrdered =
            (request.responseAtUs === null || request.responseAtUs >= request.startAtUs) &&
            (request.finishedAtUs === null || request.finishedAtUs >= request.startAtUs) &&
            (request.responseAtUs === null ||
              request.finishedAtUs === null ||
              request.responseAtUs <= request.finishedAtUs);
          const safeElapsed = (endAtUs) =>
            Number.isFinite(endAtUs) && endAtUs >= request.startAtUs
              ? roundMs((endAtUs - request.startAtUs) / 1000)
              : null;
          const timingStatus = !eventTimesOrdered
            ? "out-of-order"
            : request.finishedAtUs === null
              ? "incomplete"
              : request.responseAtUs === null
                ? "response-unavailable"
                : "ordered";
          return {
            endpoint: request.endpoint,
            method: request.method,
            completion: request.completion,
            status: request.status,
            timingStatus,
            requestStartOffsetMs: Number.isFinite(firstTaskTimestampUs)
              ? roundMs((request.startAtUs - firstTaskTimestampUs) / 1000)
              : null,
            timeToHeadersMs: eventTimesOrdered ? safeElapsed(request.responseAtUs) : null,
            totalDurationMs: eventTimesOrdered ? safeElapsed(request.finishedAtUs) : null,
            bytesReceived: request.bytesReceived,
            ...(request.completion === "failed" ? { canceled: request.canceled === true } : {}),
            startedDuringLongTask:
              startedDuringTaskIndex >= 0
                ? {
                    ordinal: startedDuringTaskIndex + 1,
                    startOffsetMs: roundMs(
                      (tasks[startedDuringTaskIndex].ts - firstTaskTimestampUs) / 1000,
                    ),
                    durationMs: roundMs(tasks[startedDuringTaskIndex].dur / 1000),
                  }
                : null,
            initiatorType: request.initiatorType,
            initiatorFrames: request.initiatorFrames,
          };
        })
        .sort(
          (left, right) =>
            (left.requestStartOffsetMs ?? Number.POSITIVE_INFINITY) -
              (right.requestStartOffsetMs ?? Number.POSITIVE_INFINITY) ||
            left.endpoint.localeCompare(right.endpoint),
        );
      const completionCounts = Object.fromEntries(
        ["completed", "failed", "incomplete", "redirected"].map((completion) => [
          `${completion}Count`,
          requests.filter((request) => request.completion === completion).length,
        ]),
      );
      const timingStatusCounts = Object.fromEntries(
        [...new Set(requests.map((request) => request.timingStatus))].map((timingStatus) => [
          timingStatus,
          requests.filter((request) => request.timingStatus === timingStatus).length,
        ]),
      );

      return {
        requestCount: requests.length,
        ...completionCounts,
        timingStatusCounts,
        ignoredRequestCount,
        requestStartsInsideLongTask: requests.filter((request) => request.startedDuringLongTask)
          .length,
        requests,
      };
    },
  };
}

export function aggregateApiRequestSamples(samples) {
  if (samples.length === 0) throw new Error("At least one API request sample is required");
  const groups = new Map();
  samples.forEach((sample, sampleIndex) => {
    for (const request of sample.requests ?? []) {
      const key = `${request.endpoint}::${request.method}`;
      const group = groups.get(key) ?? {
        endpoint: request.endpoint,
        method: request.method,
        requestCount: 0,
        observedSampleIndices: new Set(),
        completedCount: 0,
        failedCount: 0,
        totalDurations: [],
        headerDurations: [],
        responseBytes: [],
        longTaskSampleIndices: new Set(),
        timingStatusCounts: new Map(),
        initiators: new Map(),
      };
      group.requestCount += 1;
      group.observedSampleIndices.add(sampleIndex);
      group.timingStatusCounts.set(
        request.timingStatus ?? "unavailable",
        (group.timingStatusCounts.get(request.timingStatus ?? "unavailable") ?? 0) + 1,
      );
      if (request.completion === "completed") group.completedCount += 1;
      if (request.completion === "failed") group.failedCount += 1;
      if (Number.isFinite(request.totalDurationMs))
        group.totalDurations.push(request.totalDurationMs);
      if (Number.isFinite(request.timeToHeadersMs))
        group.headerDurations.push(request.timeToHeadersMs);
      if (Number.isFinite(request.bytesReceived)) group.responseBytes.push(request.bytesReceived);
      if (request.startedDuringLongTask) group.longTaskSampleIndices.add(sampleIndex);
      for (const frame of request.initiatorFrames ?? []) {
        const initiatorKey = `${frame.sourcePath}::${frame.functionName}`;
        const initiator = group.initiators.get(initiatorKey) ?? {
          sourcePath: frame.sourcePath,
          functionName: frame.functionName,
          sampleIndices: new Set(),
        };
        initiator.sampleIndices.add(sampleIndex);
        group.initiators.set(initiatorKey, initiator);
      }
      groups.set(key, group);
    }
  });

  return {
    sampleCount: samples.length,
    endpointSummaries: [...groups.values()]
      .map((group) => ({
        endpoint: group.endpoint,
        method: group.method,
        requestCount: group.requestCount,
        observedSamples: group.observedSampleIndices.size,
        completedCount: group.completedCount,
        failedCount: group.failedCount,
        timingStatusCounts: Object.fromEntries(group.timingStatusCounts),
        medianTimeToHeadersMs:
          group.headerDurations.length > 0 ? roundMs(median(group.headerDurations)) : null,
        medianTotalDurationMs:
          group.totalDurations.length > 0 ? roundMs(median(group.totalDurations)) : null,
        medianBytesReceived:
          group.responseBytes.length > 0 ? roundMs(median(group.responseBytes)) : null,
        samplesStartedDuringLongTask: group.longTaskSampleIndices.size,
        repeatedInitiators: [...group.initiators.values()]
          .map((initiator) => ({
            sourcePath: initiator.sourcePath,
            functionName: initiator.functionName,
            observedSamples: initiator.sampleIndices.size,
          }))
          .filter((initiator) => initiator.observedSamples >= 2)
          .sort(
            (left, right) =>
              right.observedSamples - left.observedSamples ||
              left.sourcePath.localeCompare(right.sourcePath),
          ),
      }))
      .sort(
        (left, right) =>
          right.requestCount - left.requestCount || left.endpoint.localeCompare(right.endpoint),
      ),
  };
}

async function readTraceStream(cdp, stream) {
  const chunks = [];
  try {
    while (true) {
      const chunk = await cdp.send("IO.read", { handle: stream });
      chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf8"));
      if (chunk.eof) break;
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await cdp.send("IO.close", { handle: stream }).catch(() => {});
  }
}

async function stopTrace(cdp, tracingComplete) {
  await cdp.send("Tracing.end");
  const completed = await tracingComplete;
  if (!completed.stream) throw new Error("CDP trace did not return a readable stream");
  return {
    stream: completed.stream,
    dataLossOccurred: completed.dataLossOccurred === true,
  };
}

async function readTraceCapture(cdp, completed) {
  return {
    trace: await readTraceStream(cdp, completed.stream),
    dataLossOccurred: completed.dataLossOccurred,
  };
}

async function finishTrace(cdp, tracingComplete) {
  return readTraceCapture(cdp, await stopTrace(cdp, tracingComplete));
}

async function loginProfileRole(request, role) {
  const response = await request.post(`${apiBase}/auth/login`, {
    data: { username: role.username, password: role.password },
  });
  if (!response.ok()) throw new Error(`Profile login failed with HTTP ${response.status()}`);
  const body = await response.json();
  if (
    !body.token ||
    body.role !== role.expectedRole ||
    body.mustChangePassword === true ||
    typeof body.userId !== "string"
  ) {
    throw new Error(`Profile ${role.id} session is missing or requires password change`);
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

async function captureSample(browser, session, maps, route, apiPaths) {
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
  let tracingStarted = false;
  let tracingComplete;
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
    const apiRequestCollector = createApiRequestCollector({
      apiOrigin: new URL(apiBase).origin,
      apiPathPrefix: new URL(apiBase).pathname.replace(/\/$/, ""),
      openApiPaths: apiPaths,
      resolveFrame: (frame) => resolveMappedFrame(frame, maps),
    });
    cdp.on("Network.requestWillBeSent", apiRequestCollector.onRequestWillBeSent);
    cdp.on("Network.responseReceived", apiRequestCollector.onResponseReceived);
    cdp.on("Network.loadingFinished", apiRequestCollector.onLoadingFinished);
    cdp.on("Network.loadingFailed", apiRequestCollector.onLoadingFailed);
    await cdp.send("Network.enable");
    tracingComplete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
    await cdp.send("Tracing.start", {
      categories: traceCategories,
      transferMode: "ReturnAsStream",
      streamFormat: "json",
      streamCompression: "none",
    });
    tracingStarted = true;
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
    await cdp.send("Profiler.start");
    profileStarted = true;
    const startedAt = Date.now();

    await page.goto(`${stagingOrigin}/#${route.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      (expectedPath) =>
        document.querySelector('[data-testid="app-shell"]')?.getAttribute("data-current-path") ===
        expectedPath,
      route.currentPath,
      { timeout: 60_000 },
    );
    await page
      .locator('#root [data-testid="server-clock"]')
      .waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1000);
    const completedTrace = await stopTrace(cdp, tracingComplete);
    tracingStarted = false;
    const profileResponse = await cdp.send("Profiler.stop");
    profileStarted = false;
    const traceCapture = await readTraceCapture(cdp, completedTrace);
    const summary = summarizeCpuProfile(profileResponse.profile, (frame) =>
      resolveMappedFrame(frame, maps),
    );
    const longTaskTrace = summarizeLongTaskTrace(
      traceCapture.trace.traceEvents ?? [],
      (frame) => resolveMappedFrame(frame, maps),
      { dataLossOccurred: traceCapture.dataLossOccurred },
    );
    const apiRequests = apiRequestCollector.summarize(traceCapture.trace.traceEvents ?? []);
    longTaskTrace.cpuProfileCorrelation = correlateCpuProfileWithTrace(
      profileResponse.profile,
      traceCapture.trace.traceEvents ?? [],
      (frame) => resolveMappedFrame(frame, maps),
    );

    return {
      wallWindowMs: Date.now() - startedAt,
      clockVisible: true,
      apiResponseFailures,
      websocketOpenCount,
      websocketErrorCount,
      websocketReceivedFrameCount,
      longTaskTrace,
      apiRequests,
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
    if (tracingStarted && cdp) {
      try {
        const completedTrace = await stopTrace(cdp, tracingComplete);
        await readTraceCapture(cdp, completedTrace);
      } catch {
        // The context is closed below even if Chrome already stopped tracing.
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

    if (!profiledAssetsArg) {
      profiledBuildAttempted = true;
      await runNpm(["run", "build:profiled"]);
    }
    const maps = await loadSourceMaps(assetDirectory);
    const comparedScriptAssets = await assertProfiledAssetsMatchStaging(assetDirectory);
    const openApiPaths = JSON.parse(
      await readFile(join(repositoryRoot, "backend/docs/swagger.json"), "utf8"),
    ).paths;
    if (!openApiPaths || typeof openApiPaths !== "object") {
      throw new Error("OpenAPI path catalog is missing");
    }

    const request = await playwrightRequest.newContext();
    const browser = await chromium.launch({ headless: true });
    try {
      const session = await loginProfileRole(request, profileRoute);
      const samples = [];
      for (let index = 0; index < sampleCount; index += 1) {
        samples.push(await captureSample(browser, session, maps, profileRoute, openApiPaths));
      }

      const report = {
        schemaVersion: 4,
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
          profiledAssetsSource: profiledAssetsArg ? "provided" : "host-build",
        },
        target: {
          routeId: profileRoute.id,
          profile: "active-staging-production-bundle",
          stagingFrontendImageId: stagingImageBefore,
          sourceMapAssetsMatched: true,
          comparedScriptAssets,
        },
        samples,
        summary: {
          ...aggregateProfileSummaries(samples),
          longTaskTrace: aggregateLongTaskTraces(samples.map((sample) => sample.longTaskTrace)),
          apiRequests: aggregateApiRequestSamples(samples.map((sample) => sample.apiRequests)),
        },
        interpretation: {
          performanceComparison: false,
          recommendationRule:
            "An unattributed context is a candidate only when its closest mapped frame appears in at least two samples; native or unknown leaf frames remain separate from that context. A mapped application frame in at least two long-task traces is a candidate, but nested call durations are not additive, request latency is not CPU time, and CDP task durations are not Lighthouse TBT or field INP.",
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
