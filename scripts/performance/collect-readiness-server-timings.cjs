#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function parseArguments(args) {
  const values = {
    browserReport: null,
    container: "portal-control-staging-backend-1",
    since: "10m",
    output: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!["--browser-report", "--container", "--since", "--output"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    if (argument === "--browser-report") values.browserReport = value;
    if (argument === "--container") values.container = value;
    if (argument === "--since") values.since = value;
    if (argument === "--output") values.output = value;
    index += 1;
  }

  if (!values.browserReport) throw new Error("--browser-report is required");
  if (!/^[a-z0-9_.-]+$/i.test(values.container)) {
    throw new Error("--container contains unsupported characters");
  }
  if (!/^\d+[smh]$/.test(values.since)) {
    throw new Error("--since must be a duration such as 5m, 30s or 1h");
  }
  return values;
}

function parseServerReadinessTimings(logText) {
  const startedAtByRequestId = new Map();
  const results = [];
  for (const line of logText.split(/\r?\n/)) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }

    if (record.msg === "incoming request" && record.req?.method === "GET") {
      const pathname = String(record.req.url ?? "").split("?", 1)[0];
      if (pathname === "/api/health/ready" && record.reqId && Number.isFinite(record.time)) {
        startedAtByRequestId.set(record.reqId, record.time);
      }
    }

    if (record.msg !== "request completed" || !startedAtByRequestId.has(record.reqId)) continue;
    if (!Number.isFinite(record.time) || !Number.isFinite(record.responseTime) || record.responseTime < 0 || !Number.isInteger(record.res?.statusCode)) {
      throw new Error("Incomplete Fastify readiness completion log");
    }
    results.push({
      startedAtEpochMs: startedAtByRequestId.get(record.reqId),
      completedAtEpochMs: record.time,
      statusCode: record.res.statusCode,
      responseTimeMs: Number(record.responseTime.toFixed(2)),
    });
  }
  return results;
}

function collectSamples(browserReport, serverTimings) {
  if (!Array.isArray(browserReport.samples) || browserReport.samples.length !== 3) {
    throw new Error("Browser report must contain exactly three samples");
  }

  const usedServerTimings = new Set();
  const results = browserReport.samples.map((sample, index) => {
    const sampleNumber = index + 1;
    const browserTimeOriginEpochMs = sample.browserTimeOriginEpochMs;
    const readiness = sample.readinessBreakdown;
    const markedRequest = Array.isArray(sample.apiRequests) ? sample.apiRequests.find((request) => request.path === "/api/health/ready" && request.statusCode === 200 && request.diagnosticProbeMatched === true) : null;
    if (!Number.isFinite(browserTimeOriginEpochMs) || !readiness || !Number.isFinite(readiness.browserFetchStartMs) || !Number.isFinite(readiness.browserResponseEndMs) || !markedRequest) {
      throw new Error(`Browser report is missing readiness timing for sample ${sampleNumber}`);
    }

    const browserFetchStartEpochMs = browserTimeOriginEpochMs + readiness.browserFetchStartMs;
    const browserResponseEndEpochMs = browserTimeOriginEpochMs + readiness.browserResponseEndMs;
    const candidates = serverTimings
      .map((timing, serverIndex) => ({
        ...timing,
        serverIndex,
        startDeltaMs: timing.startedAtEpochMs - browserFetchStartEpochMs,
        endDeltaMs: timing.completedAtEpochMs - browserResponseEndEpochMs,
      }))
      .filter((timing) => Math.abs(timing.startDeltaMs) <= 500 && Math.abs(timing.endDeltaMs) <= 500)
      .sort((left, right) => Math.abs(left.endDeltaMs) - Math.abs(right.endDeltaMs));

    if (candidates.length !== 1) {
      throw new Error(`Expected one Fastify log correlated by browser timing for sample ${sampleNumber}; found ${candidates.length}`);
    }
    const match = candidates[0];
    if (usedServerTimings.has(match.serverIndex)) {
      throw new Error(`Fastify log was assigned to more than one browser sample`);
    }
    if (match.statusCode !== 200) {
      throw new Error(`Fastify readiness returned HTTP ${match.statusCode} in sample ${sampleNumber}`);
    }
    usedServerTimings.add(match.serverIndex);
    return {
      sample: sampleNumber,
      statusCode: match.statusCode,
      fastifyResponseTimeMs: match.responseTimeMs,
      serverCompleteOffsetFromBrowserResponseEndMs: Number(match.endDeltaMs.toFixed(2)),
    };
  });
  return results;
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const browserReport = JSON.parse(fs.readFileSync(options.browserReport, "utf8"));
    const logText = execFileSync("docker", ["logs", "--since", options.since, options.container], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const report = {
      capturedAt: new Date().toISOString(),
      source: "Fastify request-completed logs correlated by browser Resource Timing",
      correlationToleranceMs: 500,
      samples: collectSamples(browserReport, parseServerReadinessTimings(logText)),
    };
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, serialized, "utf8");
      process.stdout.write(`Fastify timings saved for ${report.samples.length} samples.\n`);
    } else {
      process.stdout.write(serialized);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

main();
