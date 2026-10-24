const assert = require("node:assert/strict");
const test = require("node:test");
const { assertColdPriorityRouteCoverage } = require("./run-performance-battery.cjs");

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
