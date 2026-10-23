const { getAllAssertionResults } = require("@lhci/utils/src/assertions.js");

// Lighthouse finalUrl omits the fragment; use the verified displayed URL as
// the grouping key so HashRouter routes cannot mask one another's budgets.
function assertPerformanceRoutes(reports, options) {
  const routedReports = reports.map((report) => ({
    ...report,
    finalUrl: report.finalDisplayedUrl || report.finalUrl,
  }));
  const results = getAllAssertionResults(
    { ...options, includePassedAssertions: true },
    routedReports,
  );
  return {
    urlCount: new Set(routedReports.map((report) => report.finalUrl)).size,
    assertionCount: results.length,
    passedCount: results.filter((result) => result.passed).length,
    failures: results.filter((result) => !result.passed),
  };
}

module.exports = { assertPerformanceRoutes };
