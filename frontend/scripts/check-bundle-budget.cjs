#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { checkMeasurements, lowerBudgets, measureBuild } = require("./bundleBudgetPolicy.cjs");

const root = path.resolve(__dirname, "..");
const budgetPath = path.join(root, "performance-budget.json");
const distDirectory = path.join(root, "dist");

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function main() {
  const budget = JSON.parse(fs.readFileSync(budgetPath, "utf8"));
  const measurements = measureBuild(distDirectory);

  console.log(
    `[bundle-budget] react-core=${formatKiB(measurements.reactCoreBytes)}, charts=${formatKiB(measurements.chartsBytes)}, precache=${formatKiB(measurements.precacheBytes)} (${measurements.precacheEntries} entries)`,
  );

  if (process.argv.includes("--update")) {
    const reason = process.env.BUNDLE_BUDGET_UPDATE_REASON?.trim();
    if (!reason)
      throw new Error("Set BUNDLE_BUDGET_UPDATE_REASON to explain a monotonic budget reduction");
    const updated = lowerBudgets(measurements, budget, reason);
    fs.writeFileSync(budgetPath, `${JSON.stringify(updated, null, 2)}\n`);
    console.log("[bundle-budget] Lowered budgets to the measured sizes.");
    return;
  }

  const failures = checkMeasurements(measurements, budget.limits);
  if (failures.length > 0) throw new Error(failures.join("\n"));
  console.log("[bundle-budget] All limits passed.");
}

try {
  main();
} catch (error) {
  console.error(`[bundle-budget] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
