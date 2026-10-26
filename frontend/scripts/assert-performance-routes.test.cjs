const assert = require("node:assert/strict");
const { test } = require("node:test");
const { assertPerformanceRoutes } = require("./assert-performance-routes.cjs");
const report = (hash, score) => ({
  finalUrl: "http://127.0.0.1:8080/",
  finalDisplayedUrl: `http://127.0.0.1:8080/#/${hash}`,
  categories: { performance: { score } },
  audits: {},
});
const options = {
  aggregationMethod: "optimistic",
  assertions: { "categories:performance": ["error", { minScore: 0.5 }] },
};
test("hash routes are independent so a fast route cannot mask a slow route", () => {
  const reports = [report("dashboard", 0.9), report("worker-portal", 0.2)];
  const result = assertPerformanceRoutes(reports, options);
  assert.equal(result.urlCount, 2);
  assert.equal(result.assertionCount, 2);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].url, /#\/worker-portal$/);
  assert.equal(reports[1].finalUrl, "http://127.0.0.1:8080/");
});
test("several samples of one hash remain grouped together", () => {
  const result = assertPerformanceRoutes(
    [report("dashboard", 0.9), report("dashboard", 0.8)],
    options,
  );
  assert.equal(result.urlCount, 1);
  assert.equal(result.assertionCount, 1);
  assert.deepEqual(result.failures, []);
});
