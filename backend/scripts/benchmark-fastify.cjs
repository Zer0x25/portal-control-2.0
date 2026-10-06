const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

function event(worker, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error("Benchmark worker timed out")), 60000);
    function finish(error, message) {
      clearTimeout(timer);
      worker.off("message", onMessage);
      worker.off("exit", onExit);
      error ? reject(error) : resolve(message);
    }
    function onMessage(message) {
      if (predicate(message)) finish(null, message);
    }
    function onExit(code) {
      finish(new Error(`Worker exited early (${code})`));
    }
    worker.on("message", onMessage);
    worker.once("exit", onExit);
  });
}
async function load(url, token, count, concurrency) {
  let next = 0;
  const durations = [];
  const start = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next++ < count) {
        const requestStart = performance.now();
        const response = await fetch(url, {
          headers: { authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        });
        const body = await response.json();
        if (response.status !== 200 || body.data?.length !== 50 || body.meta?.total !== 500)
          throw new Error(`Benchmark contract failed (${response.status})`);
        durations.push(performance.now() - requestStart);
      }
    }),
  );
  durations.sort((a, b) => a - b);
  return {
    requests: count,
    concurrency,
    httpElapsedMs: performance.now() - start,
    p50Ms: durations[Math.ceil(count * 0.5) - 1],
    p95Ms: durations[Math.ceil(count * 0.95) - 1],
    p99Ms: durations[Math.ceil(count * 0.99) - 1],
  };
}
async function measure(framework, round) {
  const worker = spawn(
    process.execPath,
    [require.resolve("tsx/cli"), path.join(__dirname, "benchmark-fastify-worker.ts"), framework],
    { env: process.env, stdio: ["ignore", "ignore", "inherit", "ipc"], shell: false },
  );
  try {
    const ready = await event(worker, (message) => message.ready);
    await load(ready.url, ready.token, 100, 16);
    let pending = event(worker, (message) => message.started);
    worker.send("start");
    await pending;
    const http = await load(ready.url, ready.token, 600, 16);
    pending = event(worker, (message) => message.metrics);
    worker.send("stop");
    const { metrics } = await pending;
    const result = {
      framework,
      round,
      node: ready.node,
      ...http,
      throughputRps: http.requests / (http.httpElapsedMs / 1000),
      ...metrics,
      cpuPercentOfOneCore: (metrics.cpuMs / metrics.measurementElapsedMs) * 100,
    };
    const exited = new Promise((resolve, reject) =>
      worker.once("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`Worker failed to close (${code})`)),
      ),
    );
    worker.send("close");
    await exited;
    console.log(JSON.stringify(result));
    return result;
  } finally {
    if (worker.exitCode === null) worker.kill("SIGTERM");
  }
}
async function main() {
  const runs = [];
  // Alternating order and a new server process for every run isolate CPU/RSS from the load generator.
  for (let round = 1; round <= 3; round++) {
    for (const framework of round % 2 ? ["express", "fastify"] : ["fastify", "express"])
      runs.push(await measure(framework, round));
  }
  const report = {
    timestamp: new Date().toISOString(),
    workload:
      "GET paginado autenticado: JWT + sesión + usuario + list/count Prisma; 500 filas, página de 50",
    database: "PostgreSQL 18.4 directo en Docker desechable; sin PgBouncer",
    host: { platform: process.platform, cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model },
    warmupRequests: 100,
    accessLogging: false,
    rssSamplingMs: 20,
    failures: 0,
    runs,
  };
  const output = path.resolve(__dirname, "../../specs/008-fastify-base-feriados/benchmark.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(`Benchmark report: ${output}`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
