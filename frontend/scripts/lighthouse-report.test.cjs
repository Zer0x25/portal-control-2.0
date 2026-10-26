const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeLighthouseReport } = require("./lighthouse-report.cjs");

test("normalizes Lighthouse trace, simulated metrics, network and render-blocking evidence", () => {
  const report = {
    requestedUrl: "http://127.0.0.1:8080/#/dashboard",
    finalDisplayedUrl: "http://127.0.0.1:8080/#/dashboard",
    lighthouseVersion: "13.3.0",
    userAgent: "Chromium",
    configSettings: {
      formFactor: "mobile",
      throttlingMethod: "simulate",
      throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
      screenEmulation: { width: 412, height: 823 },
    },
    categories: { performance: { score: 0.92 } },
    audits: {
      "resource-summary": {
        details: {
          items: [
            { resourceType: "total", requestCount: 3, transferSize: 48000 },
            { resourceType: "script", requestCount: 2, transferSize: 41000 },
          ],
        },
      },
      "network-requests": {
        details: {
          items: [
            {
              url: "http://127.0.0.1:8080/api/dashboard?period=2026",
              resourceType: "Fetch",
              networkRequestTime: 12.25,
              networkEndTime: 34.5,
              transferSize: 700,
              statusCode: 200,
            },
            {
              url: "http://127.0.0.1:8080/assets/app.js",
              resourceType: "Script",
              networkRequestTime: 10,
              networkEndTime: 20,
              transferSize: 40000,
              resourceSize: 90000,
            },
          ],
        },
      },
      metrics: {
        details: {
          items: [
            {
              observedFirstContentfulPaint: 90.4,
              observedLargestContentfulPaint: 91.2,
              observedSpeedIndex: 103,
              observedDomContentLoaded: 112,
            },
          ],
        },
      },
      "first-contentful-paint": { numericValue: 2460.3832 },
      "largest-contentful-paint": { numericValue: 2555.0748 },
      "total-blocking-time": { numericValue: 140 },
      "cumulative-layout-shift": { numericValue: 0.0002 },
      "speed-index": { numericValue: 2787 },
      "bootup-time": {
        numericValue: 812.019,
        details: {
          items: [
            {
              url: "http://127.0.0.1:8080/assets/app.js",
              total: 90.4,
              scripting: 80.2,
              scriptParseCompile: 10.2,
            },
          ],
        },
      },
      "long-tasks": {
        details: {
          items: [
            { url: "http://127.0.0.1:8080/assets/app.js?private=x", startTime: 180, duration: 157 },
          ],
        },
      },
      "lcp-phases-insight": {
        details: {
          items: [
            {
              type: "table",
              items: [
                { phase: "timeToFirstByte", duration: 2.356 },
                { phase: "elementRenderDelay", duration: 101.976 },
              ],
            },
          ],
        },
      },
      "network-dependency-tree-insight": { details: { longestChain: { duration: 562 } } },
      "unused-javascript": { details: { overallSavingsBytes: 32280 } },
      "render-blocking-insight": {
        metricSavings: { FCP: 450, LCP: 450 },
        details: {
          items: [
            {
              url: "http://127.0.0.1:8080/assets/app.css",
              totalBytes: 36077,
              wastedMs: 900,
            },
          ],
        },
      },
    },
  };

  const sample = normalizeLighthouseReport(report, "cold");

  assert.equal(sample.routeId, "dashboard");
  assert.equal(sample.routeMatched, true);
  assert.equal(sample.lighthouseSettings.throttlingMethod, "simulate");
  assert.equal(sample.metrics.fcpMs, 2460.38);
  assert.equal(sample.metrics.lcpMs, 2555.07);
  assert.equal(sample.observed.fcpMs, 90.4);
  assert.equal(sample.observed.lcpMs, 91.2);
  assert.equal(sample.observed.lcpPhasesMs.elementRenderDelay, 101.98);
  assert.deepEqual(sample.network.apiRequests, [
    { path: "/api/dashboard", statusCode: 200, durationMs: 22.25, transferBytes: 700 },
  ]);
  assert.deepEqual(sample.network.largestTransfers[0], {
    path: "/assets/app.js",
    resourceType: "Script",
    transferBytes: 40000,
    resourceBytes: 90000,
  });
  assert.equal(sample.mainThread.bootupCostMs, 812.02);
  assert.equal(sample.mainThread.longTasks[0].path, "/assets/app.js");
  assert.equal(sample.mainThread.longTasks[0].durationMs, 157);
  assert.equal(sample.opportunities.unusedJavaScriptBytes, 32280);
  assert.deepEqual(sample.opportunities.renderBlockingMetricSavingsMs, { FCP: 450, LCP: 450 });
  assert.equal(sample.opportunities.renderBlockingResources[0].path, "/assets/app.css");
});

test("leaves missing trace evidence null and does not persist URL query strings", () => {
  const sample = normalizeLighthouseReport(
    {
      requestedUrl: "http://127.0.0.1:8080/#/dashboard",
      finalDisplayedUrl: "http://127.0.0.1:8080/#/dashboard",
      audits: {
        "network-requests": {
          details: {
            items: [
              {
                url: "http://127.0.0.1:8080/api/users?token=private",
                resourceType: "Fetch",
                networkRequestTime: 0,
                networkEndTime: 12,
                transferSize: 100,
              },
            ],
          },
        },
      },
    },
    "cold",
  );

  assert.equal(sample.observed.fcpMs, null);
  assert.equal(sample.mainThread.bootupCostMs, null);
  assert.deepEqual(sample.network.apiRequests[0], {
    path: "/api/users",
    statusCode: null,
    durationMs: 12,
    transferBytes: 100,
  });
});
