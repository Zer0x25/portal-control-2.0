import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateProfileSummaries,
  aggregateLongTaskTraces,
  assertPrivacySafe,
  correlateCpuProfileWithTrace,
  resolveProfileRoute,
  sanitizeSourcePath,
  summarizeCpuProfile,
  summarizeLongTaskTrace,
} from "./profile-worker-production.mjs";

test("allows only known authenticated production profile routes", () => {
  const timeControl = resolveProfileRoute("time-control");
  assert.equal(timeControl.path, "/time-control");
  assert.equal(timeControl.currentPath, "/time-control");
  assert.equal(timeControl.expectedRole, "Administrador");

  const workerPortal = resolveProfileRoute("worker-portal");
  assert.equal(workerPortal.path, "/worker-portal");
  assert.equal(workerPortal.expectedRole, "Usuario");
  assert.throws(() => resolveProfileRoute("dashboard"), /Unsupported production profile route/);
});

const mappedFrames = {
  reactWork: {
    sourcePath: "node_modules/react-dom/cjs/react-dom.production.js",
    functionName: "workLoop",
    mapped: true,
  },
  workerPortal: {
    sourcePath: "src/features/worker-portal/WorkerPortal.tsx",
    functionName: "WorkerPortal",
    sourceLine: 42,
    mapped: true,
  },
  scheduler: {
    sourcePath: "node_modules/scheduler/cjs/scheduler.production.js",
    functionName: "performWorkUntilDeadline",
    mapped: true,
  },
};

const cpuProfile = {
  nodes: [
    { id: 1, callFrame: { functionName: "(root)", url: "" }, children: [2, 5, 6] },
    {
      id: 2,
      callFrame: {
        functionName: "r",
        url: "http://127.0.0.1:4173/assets/react-core-test.js",
        lineNumber: 0,
        columnNumber: 1,
      },
      children: [3, 4],
    },
    {
      id: 3,
      callFrame: {
        functionName: "WorkerPortal",
        url: "http://127.0.0.1:4173/assets/index-test.js",
        lineNumber: 0,
        columnNumber: 2,
      },
    },
    {
      id: 4,
      callFrame: {
        functionName: "s",
        url: "http://127.0.0.1:4173/assets/react-core-test.js",
        lineNumber: 0,
        columnNumber: 3,
      },
    },
    { id: 5, callFrame: { functionName: "(idle)", url: "" } },
    { id: 6, callFrame: { functionName: "(program)", url: "" } },
  ],
  samples: [3, 4, 3, 5, 6],
  timeDeltas: [1000, 2000, 3000, 4000, 5000],
};

const resolveFrame = (frame) => {
  if (frame.url.endsWith("index-test.js")) return mappedFrames.workerPortal;
  if (frame.columnNumber === 3) return mappedFrames.scheduler;
  if (frame.url.endsWith("react-core-test.js")) return mappedFrames.reactWork;
  return null;
};

test("summarizes sample deltas and attributes inclusive time to the nearest app frame", () => {
  const result = summarizeCpuProfile(cpuProfile, resolveFrame);

  assert.equal(result.profileWindowMs, 15);
  assert.equal(result.idleSampledMs, 4);
  assert.equal(result.programSampledMs, 5);
  assert.equal(result.activeSampledMs, 6);
  assert.equal(result.reactCoreInclusiveSampledMs, 6);
  assert.equal(result.reactCoreSelfSampledMs, 2);
  assert.equal(result.reactCoreSourceMappedSampledMs, 6);
  assert.equal(result.reactCoreSourceMapCoverage, 1);
  assert.equal(result.noAppFrameSampledMs, 2);
  assert.deepEqual(result.appInclusiveFrames, [
    {
      key: "src/features/worker-portal/WorkerPortal.tsx::WorkerPortal@42",
      sourcePath: "src/features/worker-portal/WorkerPortal.tsx",
      functionName: "WorkerPortal",
      sourceLine: 42,
      sampledMs: 4,
    },
  ]);
  assert.deepEqual(
    result.selfFrames.map(({ sourcePath, functionName, sampledMs }) => ({
      sourcePath,
      functionName,
      sampledMs,
    })),
    [
      {
        sourcePath: "src/features/worker-portal/WorkerPortal.tsx",
        functionName: "WorkerPortal",
        sampledMs: 4,
      },
      {
        sourcePath: "node_modules/scheduler/cjs/scheduler.production.js",
        functionName: "performWorkUntilDeadline",
        sampledMs: 2,
      },
    ],
  );
});

test("aggregates module frame medians without summing nested inclusive time", () => {
  const one = summarizeCpuProfile(cpuProfile, resolveFrame);
  const two = {
    ...one,
    reactCoreSourceMapCoverage: 0.8,
    appInclusiveFrames: one.appInclusiveFrames.map((entry) => ({ ...entry, sampledMs: 8 })),
  };
  const result = aggregateProfileSummaries([one, two]);

  assert.equal(result.sampleCount, 2);
  assert.equal(result.medianIdleSampledMs, 4);
  assert.equal(result.medianProgramSampledMs, 5);
  assert.equal(result.medianReactCoreSourceMapCoverage, 0.9);
  assert.deepEqual(result.appFrameMedians, [
    {
      key: "src/features/worker-portal/WorkerPortal.tsx::WorkerPortal@42",
      sourcePath: "src/features/worker-portal/WorkerPortal.tsx",
      functionName: "WorkerPortal",
      sourceLine: 42,
      medianSampledMs: 6,
      observedSamples: 2,
    },
  ]);
});

test("classifies no-app leaves and attributes native samples to the nearest mapped context", () => {
  const profile = {
    nodes: [
      { id: 1, callFrame: { functionName: "(root)", url: "" }, children: [2, 4, 5] },
      {
        id: 2,
        callFrame: {
          functionName: "workLoop",
          url: "http://127.0.0.1:4173/assets/react-core-test.js",
          lineNumber: 0,
          columnNumber: 1,
        },
        children: [3],
      },
      { id: 3, callFrame: { functionName: "appendChild", url: "" } },
      { id: 4, callFrame: { functionName: "(idle)", url: "" } },
      { id: 5, callFrame: { functionName: "(program)", url: "" } },
    ],
    samples: [3, 2, 4, 5],
    timeDeltas: [6000, 2000, 1000, 1000],
  };
  const result = summarizeCpuProfile(profile, (frame) =>
    frame.url.endsWith("react-core-test.js") ? mappedFrames.reactWork : null,
  );

  assert.equal(result.noAppFrameSampledMs, 8);
  assert.deepEqual(result.noAppLeafCategorySampledMs, {
    "browser-native-or-unknown": 6,
    "mapped-dependency": 2,
  });
  assert.equal(result.noAppLeafFrames[0].functionName, "appendChild");
  assert.equal(result.noAppLeafFrames[0].category, "browser-native-or-unknown");
  assert.equal(result.noAppContextFrames[0].functionName, "workLoop");
  assert.equal(result.noAppContextFrames[0].sampledMs, 8);

  const aggregate = aggregateProfileSummaries([result, result]);
  assert.deepEqual(aggregate.noAppLeafCategoryMedians, [
    { category: "browser-native-or-unknown", medianSampledMs: 6, observedSamples: 2 },
    { category: "mapped-dependency", medianSampledMs: 2, observedSamples: 2 },
  ]);
  assert.equal(aggregate.repeatedNoAppContextCandidates[0].functionName, "workLoop");
  assert.equal(aggregate.repeatedNoAppContextCandidates[0].observedSamples, 2);
});

test("rejects profile output containing origins, query strings, or fragments", () => {
  assert.doesNotThrow(() => assertPrivacySafe({ sourcePath: "src/App.tsx" }));
  assert.throws(() => assertPrivacySafe({ sourcePath: "http://localhost/assets/app.js" }));
  assert.throws(() => assertPrivacySafe({ sourcePath: "src/App.tsx?token=x" }));
  assert.throws(() => assertPrivacySafe({ sourcePath: "src/App.tsx#worker" }));
  assert.throws(() => assertPrivacySafe({ authToken: "never-serialize" }));
});

test("normalizes source-map sources to repository-relative module paths", () => {
  assert.equal(
    sanitizeSourcePath("http://localhost:4173/src/features/worker/WorkerPortal.tsx?import#source"),
    "src/features/worker/WorkerPortal.tsx",
  );
  assert.equal(
    sanitizeSourcePath("../../node_modules/react-dom/cjs/react-dom.production.js"),
    "node_modules/react-dom/cjs/react-dom.production.js",
  );
});

test("summarizes renderer long tasks and maps nested JavaScript calls", () => {
  const traceEvents = [
    { name: "thread_name", ph: "M", pid: 10, tid: 20, args: { name: "CrRendererMain" } },
    { name: "thread_name", ph: "M", pid: 10, tid: 21, args: { name: "DedicatedWorker" } },
    { name: "RunTask", ph: "X", pid: 10, tid: 20, ts: 1000, dur: 200000 },
    {
      name: "FunctionCall",
      cat: "devtools.timeline",
      ph: "X",
      pid: 10,
      tid: 20,
      ts: 1010,
      dur: 150000,
      args: {
        data: {
          functionName: "renderRows",
          url: "http://localhost/assets/app.js?secret=ignored",
          lineNumber: 3,
          columnNumber: 12,
        },
      },
    },
    { name: "RunTask", ph: "X", pid: 10, tid: 21, ts: 1000, dur: 250000 },
    { name: "RunTask", ph: "X", pid: 10, tid: 20, ts: 300000, dur: 49000 },
  ];
  const resolveFrame = () => ({
    sourcePath: "src/features/time-control/TimeControlTable.tsx",
    functionName: "renderRows",
    sourceLine: 44,
    mapped: true,
  });

  const result = summarizeLongTaskTrace(traceEvents, resolveFrame);

  assert.equal(result.rendererMainThreadStatus, "captured");
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].durationMs, 200);
  assert.equal(result.tasks[0].scriptCallCount, 1);
  assert.deepEqual(result.tasks[0].topScriptCalls[0], {
    eventKind: "FunctionCall",
    durationMs: 150,
    sourcePath: "src/features/time-control/TimeControlTable.tsx",
    functionName: "renderRows",
    sourceLine: 44,
    mapped: true,
  });
  assertPrivacySafe(result);
  assert.doesNotMatch(JSON.stringify(result), /localhost|secret|https?:\/\//);
});

test("aggregates repeated app frames by sample rather than nested task time", () => {
  const frame = {
    eventKind: "FunctionCall",
    durationMs: 80,
    sourcePath: "src/features/time-control/TimeControlTable.tsx",
    functionName: "renderRows",
    sourceLine: 44,
    mapped: true,
  };
  const result = aggregateLongTaskTraces([
    { rendererMainThreadStatus: "captured", tasks: [{ topScriptCalls: [frame] }] },
    {
      rendererMainThreadStatus: "captured",
      tasks: [{ topScriptCalls: [{ ...frame, durationMs: 100 }] }],
    },
    { rendererMainThreadStatus: "captured", tasks: [{ topScriptCalls: [] }] },
  ]);

  assert.equal(result.sampleCount, 3);
  assert.deepEqual(result.repeatedAppCandidates, [
    {
      sourcePath: "src/features/time-control/TimeControlTable.tsx",
      functionName: "renderRows",
      sourceLine: 44,
      medianSampledMs: 90,
      observedSamples: 2,
    },
  ]);
});

test("keeps unmapped trace calls explicit without retaining their URL", () => {
  const result = summarizeLongTaskTrace(
    [
      { name: "thread_name", ph: "M", pid: 4, tid: 9, args: { name: "CrRendererMain" } },
      { name: "RunTask", ph: "X", pid: 4, tid: 9, ts: 100, dur: 60000 },
      {
        name: "EvaluateScript",
        ph: "X",
        pid: 4,
        tid: 9,
        ts: 110,
        dur: 55000,
        args: { data: { url: "http://127.0.0.1:8080/assets/private.js?key=secret" } },
      },
    ],
    () => ({
      sourcePath: "unmapped/private.js",
      functionName: "anonymous",
      mapped: false,
    }),
  );

  assert.equal(result.tasks[0].topScriptCalls[0].mapped, false);
  assert.equal(result.tasks[0].topScriptCalls[0].sourcePath, "unmapped/private.js");
  assert.doesNotMatch(JSON.stringify(result), /127\.0\.0\.1|secret|https?:\/\//);
  assertPrivacySafe(result);
});

test("aligns CPU samples to renderer tasks and retains nearest application frames", () => {
  const profile = {
    startTime: 1000,
    endTime: 101000,
    nodes: [
      { id: 1, callFrame: { functionName: "(root)", url: "" }, children: [2] },
      {
        id: 2,
        callFrame: {
          functionName: "r",
          url: "http://127.0.0.1/assets/time-control.js",
          lineNumber: 2,
          columnNumber: 8,
        },
      },
    ],
    samples: [2, 2, 2, 2],
    timeDeltas: [20000, -5000, 20000, 20000],
  };
  const traceEvents = [
    { name: "thread_name", ph: "M", pid: 1, tid: 7, args: { name: "CrRendererMain" } },
    { name: "RunTask", ph: "X", pid: 1, tid: 7, ts: 10000, dur: 70000 },
  ];
  const resolveFrame = () => ({
    sourcePath: "src/features/time-control/TimeControlTable.tsx",
    functionName: "renderRows",
    sourceLine: 88,
    mapped: true,
  });

  const result = correlateCpuProfileWithTrace(profile, traceEvents, resolveFrame);

  assert.equal(result.clockAlignmentStatus, "matched");
  assert.equal(result.samplesInsideLongTasks, 3);
  assert.equal(result.ignoredNonPositiveSampleDeltas, 1);
  assert.equal(result.tasks[0].profileSampledMs, 60);
  assert.equal(result.tasks[0].appFrames[0].sampledMs, 60);
  assert.equal(result.tasks[0].appFrames[0].functionName, "renderRows");
  assert.equal(result.tasks[0].selfFrames[0].functionName, "renderRows");
  assert.equal(result.tasks[0].selfFrames[0].sampledMs, 60);
  assert.ok(
    result.tasks.every((task) =>
      [...task.appFrames, ...task.selfFrames].every((frame) => frame.sampledMs >= 0),
    ),
  );
  assertPrivacySafe(result);
  assert.doesNotMatch(JSON.stringify(result), /127\.0\.0\.1|https?:\/\//);
});
