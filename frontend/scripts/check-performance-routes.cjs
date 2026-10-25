const stagingUrl = "http://127.0.0.1:8080";
const routes = require("../performance-routes.json");
const standardConfig = require("../.lighthouserc.json");
const coldConfig = require("../.lighthouserc-dashboard-cold.json");
const priorityColdConfig = require("../.lighthouserc-priority-cold.json");
const timeControlColdConfig = require("../.lighthouserc-time-control-cold.json");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ids = new Set();
const paths = new Set();
for (const route of routes) {
  assert(route.id && !ids.has(route.id), `Missing or duplicate route id: ${route.id}`);
  assert(route.path?.startsWith("/#/"), `Invalid HashRouter path for ${route.id}`);
  assert(!paths.has(route.path), `Duplicate performance route path: ${route.path}`);
  assert([null, "admin", "worker"].includes(route.role), `Unsupported role for ${route.id}`);
  assert(
    ["shell", "kiosk", "login"].includes(route.readiness),
    `Unsupported readiness selector for ${route.id}`,
  );
  assert(
    typeof route.family === "string" && route.family.length > 0,
    `Missing family for ${route.id}`,
  );
  assert(
    typeof route.lighthouse === "boolean",
    `Route ${route.id} must declare Lighthouse coverage`,
  );
  if (!route.lighthouse) {
    assert(
      typeof route.lighthouseSkipReason === "string" && route.lighthouseSkipReason.length > 0,
      `Route ${route.id} requires a reason for skipping Lighthouse`,
    );
  }
  ids.add(route.id);
  paths.add(route.path);
}

const expectedUrls = routes
  .filter((route) => route.lighthouse)
  .map((route) => new URL(route.path, stagingUrl).toString());
assert(
  JSON.stringify(expectedUrls) === JSON.stringify(standardConfig.ci.collect.url),
  "Lighthouse URLs must match frontend/performance-routes.json in the same order",
);

const dashboardUrl = expectedUrls.find((url) => url.endsWith("/#/dashboard"));
assert(dashboardUrl, "Dashboard is missing from the route catalog");
assert(
  JSON.stringify(coldConfig.ci.collect.url) === JSON.stringify([dashboardUrl]),
  "The cold Lighthouse profile must target only Dashboard",
);

const priorityRouteIds = ["worker-portal", "time-control"];
const priorityRoutes = priorityRouteIds.map((id) => {
  const route = routes.find((candidate) => candidate.id === id);
  assert(route?.lighthouse, `Cold priority route ${id} must remain Lighthouse eligible`);
  assert(route.role !== null, `Cold priority route ${id} must seed an authenticated role`);
  return route;
});
const priorityUrls = priorityRoutes.map((route) => new URL(route.path, stagingUrl).toString());
assert(
  JSON.stringify(priorityColdConfig.ci.collect.url) === JSON.stringify(priorityUrls),
  "Cold priority Lighthouse URLs must match Worker Portal and Time Control in the route catalog",
);
assert(
  priorityColdConfig.ci.collect.numberOfRuns === 3,
  "Cold priority Lighthouse profile must collect three runs per route",
);
const timeControlRoute = routes.find((route) => route.id === "time-control");
assert(timeControlRoute?.lighthouse, "Time Control must remain Lighthouse eligible");
assert(
  JSON.stringify(timeControlColdConfig.ci.collect.url) ===
    JSON.stringify([new URL(timeControlRoute.path, stagingUrl).toString()]),
  "Focused cold Lighthouse profile must target only Time Control",
);
assert(
  timeControlColdConfig.ci.collect.numberOfRuns === 5,
  "Focused Time Control Lighthouse profile must collect five runs",
);
assert(
  timeControlColdConfig.ci.collect.puppeteerScript === "scripts/lhci-puppeteer.cjs",
  "Focused Time Control Lighthouse profile must use the authenticated route setup",
);

process.stdout.write(
  `[PERF] Route catalog valid: ${routes.length} routes across ${new Set(routes.map((route) => route.family)).size} families.\n`,
);
