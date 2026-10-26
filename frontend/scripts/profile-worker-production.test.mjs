import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateApiRequestSamples,
  aggregateProfileSummaries,
  aggregateLongTaskTraces,
  assertPrivacySafe,
  createApiRequestCollector,
  correlateCpuProfileWithTrace,
  matchOpenApiRouteTemplate,
  resolveProfiledAssetDirectory,
  resolveProfileRoute,
  sanitizeSourcePath,
  summarizeCpuProfile,
  summarizeLongTaskTrace,
} from "./profile-worker-production.mjs";

test("resolves an externally built source-map directory or the default dist path", () => {
  assert.equal(
    resolveProfiledAssetDirectory("/tmp/staging-assets", "/workspace/frontend"),
    "/tmp/staging-assets",
  );
  assert.equal(
    resolveProfiledAssetDirectory(undefined, "/workspace/frontend"),
    "/workspace/frontend/dist/assets",
  );
});

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

test("maps an API path to a method-matched OpenAPI template", () => {
  const paths = {
    "/api/records/{id}": { get: {}, delete: {} },
    "/api/records/{id}/resolve-anomaly": { post: {} },
    "/api/records/search": { get: {} },
  };

  assert.equal(
    matchOpenApiRouteTemplate("/api/records/EMP-SECRET-9/resolve-anomaly", "POST", paths),
    "/api/records/{id}/resolve-anomaly",
  );
  assert.equal(
    matchOpenApiRouteTemplate("/api/records/search", "GET", paths),
    "/api/records/search",
  );
  assert.equal(matchOpenApiRouteTemplate("/api/records/1/resolve-anomaly", "GET", paths), null);
});

test("correlates sanitized API requests with task starts and initiator source maps", () => {
  const paths = {
    "/api/records/{id}/resolve-anomaly": { post: {} },
  };
  const collector = createApiRequestCollector({
    apiOrigin: "http://127.0.0.1:8080",
    apiPathPrefix: "/api",
    openApiPaths: paths,
    resolveFrame: () => ({
      sourcePath: "src/hooks/queries/useTimeRecordsQuery.ts",
      functionName: "useTimeRecordsQuery",
      sourceLine: 82,
      mapped: true,
    }),
  });
  const sensitiveUrl =
    "http://127.0.0.1:8080/api/records/EMP-SECRET-9/resolve-anomaly?token=secret";
  collector.onRequestWillBeSent({
    requestId: "cdp-request-private-id",
    timestamp: 10.02,
    request: {
      url: sensitiveUrl,
      method: "POST",
      headers: { Authorization: "Bearer secret-token" },
      postData: "private request body",
    },
    initiator: {
      type: "script",
      stack: {
        callFrames: [
          {
            url: "http://127.0.0.1:8080/assets/app.js?session=private",
            functionName: "query",
            lineNumber: 7,
            columnNumber: 4,
          },
        ],
      },
    },
  });
  collector.onResponseReceived({
    requestId: "cdp-request-private-id",
    timestamp: 10.04,
    response: {
      status: 200,
      url: sensitiveUrl,
      headers: { "Set-Cookie": "private" },
      fromServiceWorker: false,
      fromDiskCache: false,
      fromPrefetchCache: false,
      timing: { requestTime: 10.02, receiveHeadersEnd: 20 },
    },
  });
  collector.onLoadingFinished({
    requestId: "cdp-request-private-id",
    timestamp: 10.06,
    encodedDataLength: 120,
  });

  const result = collector.summarize([
    { name: "thread_name", ph: "M", pid: 4, tid: 8, args: { name: "CrRendererMain" } },
    { name: "RunTask", ph: "X", pid: 4, tid: 8, ts: 10_000_000, dur: 70_000 },
  ]);

  assert.equal(result.requestCount, 1);
  assert.deepEqual(result.requests[0], {
    endpoint: "/api/records/{id}/resolve-anomaly",
    method: "POST",
    completion: "completed",
    status: 200,
    timingStatus: "ordered",
    timingIssues: [],
    responseSource: "network",
    responseTimingStatus: "valid",
    requestStartOffsetMs: 20,
    timeToHeadersMs: 20,
    totalDurationMs: 40,
    bytesReceived: 120,
    startedDuringLongTask: {
      ordinal: 1,
      startOffsetMs: 0,
      durationMs: 70,
    },
    initiatorType: "script",
    initiatorFrames: [
      {
        sourcePath: "src/hooks/queries/useTimeRecordsQuery.ts",
        functionName: "useTimeRecordsQuery",
        sourceLine: 82,
        mapped: true,
      },
    ],
  });
  assertPrivacySafe(result);
  assert.doesNotMatch(
    JSON.stringify(result),
    /EMP-SECRET|secret|private|cdp-request|127\.0\.0\.1|https?:\/\//,
  );
});

test("keeps unknown routes generic and excludes requests outside local API", () => {
  const collector = createApiRequestCollector({
    apiOrigin: "http://127.0.0.1:8080",
    apiPathPrefix: "/api",
    openApiPaths: { "/api/health/ready": { get: {} } },
    resolveFrame: () => null,
  });
  collector.onRequestWillBeSent({
    requestId: "unknown-api",
    timestamp: 3,
    request: {
      url: "http://127.0.0.1:8080/api/private-user-name/lookup?secret=value",
      method: "GET",
    },
  });
  collector.onRequestWillBeSent({
    requestId: "external-request",
    timestamp: 3.001,
    request: { url: "https://example.test/api/users/secret", method: "GET" },
  });

  const result = collector.summarize([]);

  assert.equal(result.requestCount, 1);
  assert.equal(result.requests[0].endpoint, "unmatched-api-route");
  assert.equal(result.requests[0].completion, "incomplete");
  assert.equal(result.requests[0].requestStartOffsetMs, null);
  assertPrivacySafe(result);
  assert.doesNotMatch(JSON.stringify(result), /private-user-name|secret|example\.test|https?:\/\//);
});

test("uses response timing and independently validates total duration", () => {
  const collector = createApiRequestCollector({
    apiOrigin: "http://127.0.0.1:8080",
    apiPathPrefix: "/api",
    openApiPaths: { "/api/health/ready": { get: {} } },
    resolveFrame: (frame) => ({
      sourcePath: "src/hooks/useHealth.ts",
      functionName: frame.functionName,
      sourceLine: 12,
      mapped: true,
    }),
  });
  collector.onRequestWillBeSent({
    requestId: "out-of-order-id",
    timestamp: 7,
    request: { url: "http://127.0.0.1:8080/api/health/ready", method: "GET" },
    initiator: {
      type: "script",
      stack: {
        callFrames: [
          { functionName: "native-frame" },
          {
            functionName: "loadHealth",
            url: "https://bundle.invalid/assets/index.js",
            lineNumber: 10,
            columnNumber: 4,
          },
        ],
      },
    },
  });
  collector.onResponseReceived({
    requestId: "out-of-order-id",
    timestamp: 7.2,
    response: {
      status: 200,
      fromServiceWorker: false,
      fromDiskCache: false,
      fromPrefetchCache: false,
      timing: { requestTime: 7.001, receiveHeadersEnd: 29 },
    },
  });
  collector.onLoadingFinished({
    requestId: "out-of-order-id",
    timestamp: 7.1,
    encodedDataLength: 32,
  });

  const result = collector.summarize([]);

  assert.equal(result.requests[0].timingStatus, "out-of-order");
  assert.deepEqual(result.requests[0].timingIssues, ["response-after-completion"]);
  assert.equal(result.requests[0].responseSource, "network");
  assert.equal(result.requests[0].responseTimingStatus, "valid");
  assert.equal(result.requests[0].timeToHeadersMs, 30);
  assert.equal(result.requests[0].totalDurationMs, 100);
  assert.deepEqual(result.timingStatusCounts, { "out-of-order": 1 });
  assert.deepEqual(result.timingIssueCounts, { "response-after-completion": 1 });
  assert.deepEqual(result.requests[0].initiatorFrames, [
    {
      sourcePath: "src/hooks/useHealth.ts",
      functionName: "loadHealth",
      sourceLine: 12,
      mapped: true,
    },
  ]);
  assertPrivacySafe(result);
  assert.doesNotMatch(JSON.stringify(result), /out-of-order-id|bundle\.invalid|https?:\/\//);
});

test("classifies every invalid CDP timestamp relation without serializing timestamps", () => {
  const collector = createApiRequestCollector({
    apiOrigin: "http://127.0.0.1:8080",
    apiPathPrefix: "/api",
    openApiPaths: {
      "/api/configs/{key}": { get: {} },
      "/api/health/ready": { get: {} },
      "/api/users/{id}": { get: {} },
    },
    resolveFrame: () => null,
  });
  const start = (requestId, timestamp, url) =>
    collector.onRequestWillBeSent({
      requestId,
      timestamp,
      request: { url: `http://127.0.0.1:8080${url}`, method: "GET" },
    });

  start("private-response-before-start", 10, "/api/health/ready");
  collector.onResponseReceived({
    requestId: "private-response-before-start",
    timestamp: 9.9,
    response: { status: 200 },
  });
  collector.onLoadingFinished({
    requestId: "private-response-before-start",
    timestamp: 10.1,
    encodedDataLength: 8,
  });

  start("private-completion-before-start", 20, "/api/users/employee-42");
  collector.onLoadingFinished({
    requestId: "private-completion-before-start",
    timestamp: 19.9,
    encodedDataLength: 9,
  });

  start("private-response-after-completion", 30, "/api/configs/secret-key");
  collector.onResponseReceived({
    requestId: "private-response-after-completion",
    timestamp: 30.2,
    response: { status: 200 },
  });
  collector.onLoadingFinished({
    requestId: "private-response-after-completion",
    timestamp: 30.1,
    encodedDataLength: 10,
  });

  const result = collector.summarize([]);

  assert.deepEqual(result.timingIssueCounts, {
    "completion-before-start": 1,
    "response-after-completion": 1,
    "response-before-start": 1,
  });
  assert.deepEqual(
    Object.fromEntries(result.requests.map((request) => [request.endpoint, request.timingIssues])),
    {
      "/api/configs/{key}": ["response-after-completion"],
      "/api/health/ready": ["response-before-start"],
      "/api/users/{id}": ["completion-before-start"],
    },
  );
  assert.ok(result.requests.every((request) => request.timingStatus === "out-of-order"));
  assert.ok(result.requests.every((request) => request.timeToHeadersMs === null));
  assert.equal(
    result.requests.find((request) => request.endpoint === "/api/health/ready").totalDurationMs,
    100,
  );
  assert.equal(
    result.requests.find((request) => request.endpoint === "/api/users/{id}").totalDurationMs,
    null,
  );
  assert.equal(
    result.requests.find((request) => request.endpoint === "/api/configs/{key}").totalDurationMs,
    100,
  );
  assert.equal(
    aggregateApiRequestSamples([{ requests: result.requests }]).endpointSummaries.find(
      (endpoint) => endpoint.endpoint === "/api/configs/{key}",
    ).timingIssueCounts["response-after-completion"],
    1,
  );
  assertPrivacySafe(result);
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-|employee-42|secret-key|timestamp|startAtUs|responseAtUs|finishedAtUs|10\.1|19\.9|30\.2|https?:\/\//,
  );
});

test("validates response resource timing, response source, and endpoint summaries", () => {
  const routeTemplates = [
    "/api/health/ready",
    "/api/users/{id}",
    "/api/configs/{key}",
    "/api/shifts/patterns",
    "/api/leaves",
    "/api/records",
    "/api/holidays",
    "/api/audit-logs",
  ];
  const collector = createApiRequestCollector({
    apiOrigin: "http://127.0.0.1:8080",
    apiPathPrefix: "/api",
    openApiPaths: Object.fromEntries(routeTemplates.map((route) => [route, { get: {} }])),
    resolveFrame: () => null,
  });
  const cases = [
    {
      route: "/api/health/ready",
      path: "/api/health/ready",
      start: 10,
      finish: 10.03,
      flags: { fromServiceWorker: false, fromDiskCache: false, fromPrefetchCache: false },
      timing: { requestTime: 10.001, receiveHeadersEnd: 19 },
      expected: { source: "network", status: "valid", headers: 20, total: 30 },
    },
    {
      route: "/api/users/{id}",
      path: "/api/users/private-id",
      start: 20,
      finish: 20.02,
      flags: { fromDiskCache: true },
      timing: { requestTime: 20, receiveHeadersEnd: 5 },
      expected: { source: "disk-cache", status: "valid", headers: 5, total: 20 },
    },
    {
      route: "/api/configs/{key}",
      path: "/api/configs/private-key",
      start: 30,
      finish: 30.01,
      flags: { fromPrefetchCache: true },
      timing: { requestTime: 30.001, receiveHeadersEnd: 1 },
      expected: { source: "prefetch-cache", status: "valid", headers: 2, total: 10 },
    },
    {
      route: "/api/shifts/patterns",
      path: "/api/shifts/patterns",
      start: 40,
      finish: 40.01,
      flags: { fromServiceWorker: true },
      timing: undefined,
      expected: { source: "service-worker", status: "missing", headers: null, total: 10 },
    },
    {
      route: "/api/leaves",
      path: "/api/leaves",
      start: 50,
      finish: 50.02,
      flags: {},
      timing: { requestTime: 50.002, receiveHeadersEnd: 10 },
      expected: { source: "unknown", status: "valid", headers: 12, total: 20 },
    },
    {
      route: "/api/records",
      path: "/api/records",
      start: 60,
      finish: 60.02,
      flags: { fromServiceWorker: false, fromDiskCache: false, fromPrefetchCache: false },
      timing: { requestTime: 60, receiveHeadersEnd: null },
      expected: { source: "network", status: "invalid-fields", headers: null, total: 20 },
    },
    {
      route: "/api/holidays",
      path: "/api/holidays",
      start: 70,
      finish: 70.02,
      flags: { fromServiceWorker: false, fromDiskCache: false, fromPrefetchCache: false },
      timing: { requestTime: 69.99, receiveHeadersEnd: 1 },
      expected: { source: "network", status: "headers-before-start", headers: null, total: 20 },
    },
    {
      route: "/api/audit-logs",
      path: "/api/audit-logs",
      start: 80,
      finish: 80.025,
      flags: { fromServiceWorker: false, fromDiskCache: false, fromPrefetchCache: false },
      timing: { requestTime: 80.02, receiveHeadersEnd: 10 },
      expected: { source: "network", status: "headers-after-completion", headers: null, total: 25 },
    },
  ];

  cases.forEach((item, index) => {
    const requestId = `private-timing-${index}`;
    collector.onRequestWillBeSent({
      requestId,
      timestamp: item.start,
      request: { url: `http://127.0.0.1:8080${item.path}`, method: "GET" },
    });
    collector.onResponseReceived({
      requestId,
      timestamp: item.start + 0.005,
      response: {
        status: 200,
        ...item.flags,
        ...(item.timing ? { timing: item.timing } : {}),
      },
    });
    collector.onLoadingFinished({
      requestId,
      timestamp: item.finish,
      encodedDataLength: 16,
    });
  });

  const result = collector.summarize([]);
  const byRoute = new Map(result.requests.map((request) => [request.endpoint, request]));
  for (const item of cases) {
    const request = byRoute.get(item.route);
    assert.equal(request.responseSource, item.expected.source, item.route);
    assert.equal(request.responseTimingStatus, item.expected.status, item.route);
    assert.equal(request.timeToHeadersMs, item.expected.headers, item.route);
    assert.equal(request.totalDurationMs, item.expected.total, item.route);
  }

  const endpointSummaries = aggregateApiRequestSamples([{ requests: result.requests }])
    .endpointSummaries;
  assert.deepEqual(
    endpointSummaries.find((endpoint) => endpoint.endpoint === "/api/shifts/patterns")
      .responseSourceCounts,
    { "service-worker": 1 },
  );
  assert.deepEqual(
    endpointSummaries.find((endpoint) => endpoint.endpoint === "/api/records")
      .responseTimingStatusCounts,
    { "invalid-fields": 1 },
  );
  assertPrivacySafe(result);
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-|private-id|private-key|requestTime|receiveHeadersEnd|http:\/\/|https?:\/\//,
  );
});

test("splits redirects and reports incomplete or failed API requests without raw error data", () => {
  const collector = createApiRequestCollector({
    apiOrigin: "http://127.0.0.1:8080",
    apiPathPrefix: "/api",
    openApiPaths: { "/api/users/{id}": { get: {} } },
    resolveFrame: () => null,
  });
  collector.onRequestWillBeSent({
    requestId: "redirect-id",
    timestamp: 5,
    request: { url: "http://127.0.0.1:8080/api/users/secret-id?x=secret", method: "GET" },
  });
  collector.onRequestWillBeSent({
    requestId: "redirect-id",
    timestamp: 5.01,
    request: { url: "http://127.0.0.1:8080/api/users/secret-id?x=secret", method: "GET" },
    redirectResponse: { status: 302, url: "private-url", headers: { Location: "secret" } },
  });
  collector.onResponseReceived({
    requestId: "redirect-id",
    timestamp: 5.03,
    response: { status: 200 },
  });
  collector.onLoadingFinished({ requestId: "redirect-id", timestamp: 5.04, encodedDataLength: 24 });
  collector.onRequestWillBeSent({
    requestId: "incomplete-id",
    timestamp: 5.05,
    request: { url: "http://127.0.0.1:8080/api/users/2", method: "GET" },
  });
  collector.onLoadingFailed({
    requestId: "incomplete-id",
    timestamp: 5.06,
    canceled: true,
    errorText: "https://private.invalid/?token=secret",
  });

  const result = collector.summarize([]);

  assert.equal(result.requestCount, 3);
  assert.deepEqual(
    result.requests.map(({ completion, status, timingStatus, totalDurationMs }) => ({
      completion,
      status,
      timingStatus,
      totalDurationMs,
    })),
    [
      { completion: "redirected", status: 302, timingStatus: "ordered", totalDurationMs: 10 },
      { completion: "completed", status: 200, timingStatus: "ordered", totalDurationMs: 30 },
      {
        completion: "failed",
        status: null,
        timingStatus: "response-unavailable",
        totalDurationMs: 10,
      },
    ],
  );
  assert.equal(result.failedCount, 1);
  assertPrivacySafe(result);
  assert.doesNotMatch(
    JSON.stringify(result),
    /redirect-id|incomplete-id|secret|private|https?:\/\//,
  );
});

test("aggregates request latency and task coincidence per endpoint and sample", () => {
  const result = aggregateApiRequestSamples([
    {
      requests: [
        {
          endpoint: "/api/health/ready",
          method: "GET",
          completion: "completed",
          timingStatus: "ordered",
        timingIssues: [],
        responseSource: "network",
        responseTimingStatus: "valid",
          timeToHeadersMs: 2,
          totalDurationMs: 4,
          bytesReceived: 95,
          startedDuringLongTask: { ordinal: 1 },
          initiatorFrames: [
            { sourcePath: "src/store/slices/syncSlice.ts", functionName: "validateInstanceId" },
          ],
        },
      ],
    },
    {
      requests: [
        {
          endpoint: "/api/health/ready",
          method: "GET",
          completion: "completed",
          timingStatus: "ordered",
        timingIssues: [],
        responseSource: "network",
        responseTimingStatus: "valid",
          timeToHeadersMs: 6,
          totalDurationMs: 8,
          bytesReceived: 95,
          startedDuringLongTask: null,
          initiatorFrames: [
            { sourcePath: "src/store/slices/syncSlice.ts", functionName: "validateInstanceId" },
          ],
        },
      ],
    },
    { requests: [] },
  ]);

  assert.deepEqual(result, {
    sampleCount: 3,
    endpointSummaries: [
      {
        endpoint: "/api/health/ready",
        method: "GET",
        requestCount: 2,
        observedSamples: 2,
        completedCount: 2,
        failedCount: 0,
        timingStatusCounts: { ordered: 2 },
        timingIssueCounts: {},
        responseSourceCounts: { network: 2 },
        responseTimingStatusCounts: { valid: 2 },
        medianTimeToHeadersMs: 4,
        medianTotalDurationMs: 6,
        medianBytesReceived: 95,
        samplesStartedDuringLongTask: 1,
        repeatedInitiators: [
          {
            sourcePath: "src/store/slices/syncSlice.ts",
            functionName: "validateInstanceId",
            observedSamples: 2,
          },
        ],
      },
    ],
  });
});
