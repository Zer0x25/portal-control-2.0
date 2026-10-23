const fs = require("node:fs");
const path = require("node:path");

class StorybookVisualSummaryReporter {
  constructor() {
    this.changed = [];
  }

  onTestEnd(test, result) {
    if (result.status !== "passed") {
      this.changed.push(`${test.title} (${result.status})`);
    }
  }

  onEnd(result) {
    const summary = {
      version: 1,
      status: result.status === "passed" && this.changed.length === 0 ? "passed" : "failed",
      changed: this.changed,
    };
    fs.writeFileSync(
      path.resolve(__dirname, "../visual-regression-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
  }
}

module.exports = StorybookVisualSummaryReporter;
