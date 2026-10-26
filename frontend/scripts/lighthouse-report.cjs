const performanceRoutes = require("../performance-routes.json");

const roundMs = (value) => (Number.isFinite(value) ? Math.round(value * 100) / 100 : null);

const getItems = (audit) => audit?.details?.items ?? [];

const resourcePath = (value) => {
  if (value === "Unattributable") return value;
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
};

const routePathFor = (value) => {
  const parsed = new URL(value);
  return `${parsed.pathname}${parsed.hash}`;
};

const normalizeLighthouseReport = (report, profile) => {
  const requestedPath = routePathFor(report.requestedUrl);
  const finalPath = routePathFor(report.finalDisplayedUrl);
  const route = performanceRoutes.find((candidate) => candidate.path === requestedPath);
  const audits = report.audits ?? {};
  const resourceRows = getItems(audits["resource-summary"]);
  const totalResources = resourceRows.find((row) => row.resourceType === "total") ?? {};
  const scriptResources =
    resourceRows.find((row) => String(row.resourceType).toLowerCase() === "script") ?? {};
  const requestRows = getItems(audits["network-requests"]);
  const metrics = getItems(audits.metrics)[0] ?? {};
  const lcpPhases = getItems(audits["lcp-phases-insight"]).flatMap(
    (phaseGroup) => phaseGroup.items ?? [],
  );
  const lcpPhaseDurations = Object.fromEntries(
    lcpPhases.map(({ phase, duration }) => [phase, roundMs(duration)]),
  );
  const apiRequests = requestRows
    .filter((request) => {
      if (!request.url || !["Fetch", "XHR"].includes(request.resourceType)) return false;
      return resourcePath(request.url)?.startsWith("/api/") ?? false;
    })
    .map((request) => ({
      path: resourcePath(request.url),
      statusCode: request.statusCode ?? null,
      durationMs: roundMs(request.networkEndTime - request.networkRequestTime),
      transferBytes: request.transferSize ?? null,
    }));
  const largestTransfers = requestRows
    .filter((request) => request.url && Number.isFinite(request.transferSize))
    .sort((left, right) => right.transferSize - left.transferSize)
    .slice(0, 10)
    .map((request) => ({
      path: resourcePath(request.url),
      resourceType: request.resourceType ?? null,
      transferBytes: request.transferSize,
      resourceBytes: request.resourceSize ?? null,
    }));
  const scriptCpu = getItems(audits["bootup-time"])
    .slice(0, 5)
    .map((script) => ({
      path: resourcePath(script.url),
      totalCpuMs: roundMs(script.total),
      scriptingMs: roundMs(script.scripting),
      parseCompileMs: roundMs(script.scriptParseCompile),
    }));
  const longTasks = getItems(audits["long-tasks"])
    .slice(0, 5)
    .map((task) => ({
      path: resourcePath(task.url),
      startMs: roundMs(task.startTime),
      durationMs: roundMs(task.duration),
    }));
  const renderBlockingAudit = audits["render-blocking-insight"];

  return {
    routeId: route?.id ?? null,
    family: route?.family ?? null,
    role: route?.role ?? "anonymous",
    profile,
    requestedPath,
    finalPath,
    routeMatched: requestedPath === finalPath,
    lighthouseVersion: report.lighthouseVersion,
    userAgent: report.userAgent,
    lighthouseSettings: {
      formFactor: report.configSettings?.formFactor ?? null,
      throttlingMethod: report.configSettings?.throttlingMethod ?? null,
      throttling: report.configSettings?.throttling
        ? {
            rttMs: report.configSettings.throttling.rttMs ?? null,
            throughputKbps: report.configSettings.throttling.throughputKbps ?? null,
            cpuSlowdownMultiplier: report.configSettings.throttling.cpuSlowdownMultiplier ?? null,
          }
        : null,
      screenEmulation: report.configSettings?.screenEmulation
        ? {
            width: report.configSettings.screenEmulation.width ?? null,
            height: report.configSettings.screenEmulation.height ?? null,
          }
        : null,
    },
    metrics: {
      performanceScore: report.categories?.performance?.score ?? null,
      fcpMs: roundMs(audits["first-contentful-paint"]?.numericValue),
      lcpMs: roundMs(audits["largest-contentful-paint"]?.numericValue),
      tbtMs: roundMs(audits["total-blocking-time"]?.numericValue),
      cls: roundMs(audits["cumulative-layout-shift"]?.numericValue),
      speedIndexMs: roundMs(audits["speed-index"]?.numericValue),
      totalTransferBytes:
        totalResources.transferSize ?? audits["total-byte-weight"]?.numericValue ?? null,
      scriptTransferBytes: scriptResources.transferSize ?? null,
      requestCount: totalResources.requestCount ?? requestRows.length,
    },
    observed: {
      fcpMs: roundMs(metrics.observedFirstContentfulPaint),
      lcpMs: roundMs(metrics.observedLargestContentfulPaint),
      speedIndexMs: roundMs(metrics.observedSpeedIndex),
      domContentLoadedMs: roundMs(metrics.observedDomContentLoaded),
      lcpPhasesMs: lcpPhaseDurations,
    },
    network: {
      longestDependencyChainMs: roundMs(
        audits["network-dependency-tree-insight"]?.details?.longestChain?.duration,
      ),
      apiRequests,
      largestTransfers,
    },
    mainThread: {
      bootupCostMs: roundMs(audits["bootup-time"]?.numericValue),
      scriptCpu,
      longTasks,
    },
    opportunities: {
      unusedJavaScriptBytes: audits["unused-javascript"]?.details?.overallSavingsBytes ?? null,
      renderBlockingMetricSavingsMs: renderBlockingAudit?.metricSavings ?? null,
      renderBlockingResources: getItems(renderBlockingAudit).map((resource) => ({
        path: resourcePath(resource.url),
        transferBytes: resource.totalBytes ?? null,
        estimatedSavingsMs: roundMs(resource.wastedMs),
      })),
    },
  };
};

module.exports = { normalizeLighthouseReport };
