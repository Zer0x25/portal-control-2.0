const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { chromium } = require("@playwright/test");
const { assertPerformanceRoutes } = require("./assert-performance-routes.cjs");
const config = require("../.lighthouserc.json");
const routes = require("../performance-routes.json").filter((route) => route.lighthouse);
fs.mkdirSync(".lighthouseci", { recursive: true });
const identity = {
  capturedAt: new Date().toISOString(),
  harnessCommit: process.env.GITHUB_SHA,
  images: Object.fromEntries(
    ["backend", "frontend", "gateway"].map((s) => [s, process.env[`${s.toUpperCase()}_IMAGE`]]),
  ),
};
fs.writeFileSync(".lighthouseci/images.json", JSON.stringify(identity, null, 2));
const result = spawnSync(
  process.execPath,
  [
    require.resolve("@lhci/cli/src/cli.js"),
    "autorun",
    "--config=.lighthouserc.json",
    `--collect.chromePath=${chromium.executablePath()}`,
  ],
  { stdio: "inherit", env: process.env },
);
const reports = fs
  .readdirSync(".lighthouseci")
  .filter((f) => f.endsWith(".json"))
  .flatMap((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(".lighthouseci", file), "utf8"));
    return data.lighthouseVersion ? [data] : [];
  });
const expected = config.ci.collect.url;
const seen = reports.map((r) => r.finalDisplayedUrl);
const matched = reports.length === routes.length && expected.every((url) => seen.includes(url));
const assertions = assertPerformanceRoutes(reports, config.ci.assert);
const summary = {
  ...identity,
  routeCoverageMatched: matched,
  assertions,
  measurements: reports.map((r) => ({
    url: r.finalDisplayedUrl,
    score: r.categories.performance.score,
    lcp: r.audits["largest-contentful-paint"].numericValue,
    tbt: r.audits["total-blocking-time"].numericValue,
    cls: r.audits["cumulative-layout-shift"].numericValue,
  })),
};
fs.writeFileSync(".lighthouseci/summary.json", JSON.stringify(summary, null, 2));
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `Lighthouse manual: ${reports.length}/${routes.length} rutas; ${assertions.passedCount}/${assertions.assertionCount} aserciones.\n\n` +
      Object.entries(identity.images)
        .map(([s, ref]) => `- ${s}: \`${ref}\``)
        .join("\n") +
      "\n\n| Ruta | Score | LCP ms | TBT ms | CLS |\n| --- | ---: | ---: | ---: | ---: |\n" +
      summary.measurements
        .map(
          (m) =>
            `| ${m.url.split("#")[1]} | ${m.score} | ${Math.round(m.lcp)} | ${Math.round(m.tbt)} | ${m.cls} |`,
        )
        .join("\n") +
      "\n",
  );
if (result.status !== 0 || !matched || assertions.failures.length) process.exitCode = 1;
