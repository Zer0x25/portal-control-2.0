const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertColdPriorityRouteCoverage,
  buildPerformanceEnvironment,
} = require("./run-performance-battery.cjs");

const reportsFor = (routeId, routeMatched = true) =>
  Array.from({ length: 3 }, () => ({ routeId, routeMatched }));

test("cold priority Lighthouse stage accepts three matched samples per route", () => {
  assert.doesNotThrow(() =>
    assertColdPriorityRouteCoverage([
      ...reportsFor("worker-portal"),
      ...reportsFor("time-control"),
    ]),
  );
});

test("cold priority Lighthouse stage rejects missing, redirected, or unrelated samples", () => {
  assert.throws(
    () =>
      assertColdPriorityRouteCoverage([
        ...reportsFor("worker-portal"),
        reportsFor("time-control")[0],
      ]),
    /expected three matched samples/i,
  );
  assert.throws(
    () =>
      assertColdPriorityRouteCoverage([
        ...reportsFor("worker-portal"),
        ...reportsFor("time-control", false),
      ]),
    /did not match: time-control/i,
  );
  assert.throws(
    () =>
      assertColdPriorityRouteCoverage([
        ...reportsFor("worker-portal"),
        ...reportsFor("time-control"),
        ...reportsFor("dashboard"),
      ]),
    /Unexpected route/i,
  );
});

test("performance battery requires the current clocking options endpoint", () => {
  const env = buildPerformanceEnvironment({
    PERFORMANCE_REQUIRE_CLOCKING_OPTIONS_ENDPOINT: "0",
    PERFORMANCE_DIAGNOSTIC_RUN_ID: "safe-run-id",
  });

  assert.equal(env.PERFORMANCE_REQUIRE_CLOCKING_OPTIONS_ENDPOINT, "1");
  assert.equal(env.E2E_BASE_URL, "http://127.0.0.1:8080");
  assert.equal(env.E2E_API_URL, "http://127.0.0.1:8080/api");
  assert.equal(env.PERFORMANCE_DIAGNOSTIC_RUN_ID, "safe-run-id");
});
