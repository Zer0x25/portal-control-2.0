#!/usr/bin/env node
/**
 * Lint budget ratchet.
 *
 * ESLint warnings never fail `npm run lint` on their own, so they silently
 * accumulate. This script turns them into a ratchet: the warning count is
 * recorded in `lint-budget.json` and CI fails if the real count is HIGHER than
 * the recorded budget. The budget can therefore only go down, and any PR that
 * removes warnings makes room for new ones.
 *
 * Usage:
 *   node scripts/lint-budget.cjs             # check (fails if over budget)
 *   node scripts/lint-budget.cjs --update    # rewrite the budget to the current count
 *   node scripts/lint-budget.cjs --rules     # also print a per-rule breakdown
 *   node scripts/lint-budget.cjs --only backend
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const BUDGET_FILE = path.join(ROOT, "lint-budget.json");

/** Targets mirror the `lint` script in each package.json. */
const TARGETS = [
  { name: "backend", cwd: path.join(ROOT, "backend"), args: ["src/**/*.ts"] },
  { name: "frontend", cwd: path.join(ROOT, "frontend"), args: ["src"] },
];

const argv = process.argv.slice(2);
const UPDATE = argv.includes("--update");
const SHOW_RULES = argv.includes("--rules");
const onlyIndex = argv.indexOf("--only");
const only = onlyIndex === -1 ? null : argv[onlyIndex + 1];

function readBudget() {
  if (!fs.existsSync(BUDGET_FILE)) {
    return { version: 1, packages: {} };
  }
  return JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
}

/** Run eslint once and aggregate errors, warnings and per-rule counts. */
function runEslint(target) {
  const eslintBin = path.join(target.cwd, "node_modules", ".bin", "eslint");
  if (!fs.existsSync(eslintBin)) {
    throw new Error(
      `eslint not found for ${target.name}. Run "npm ci" in ${path.relative(ROOT, target.cwd)} first.`,
    );
  }

  const result = spawnSync(eslintBin, [...target.args, "-f", "json"], {
    cwd: target.cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) throw result.error;

  // ESLint exits 1 when there are errors; the JSON report is still printed then.
  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error(
      `eslint produced no report for ${target.name} (exit ${result.status}):\n${result.stderr || ""}`,
    );
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    throw new Error(
      `Could not parse eslint JSON for ${target.name}:\n${stdout.slice(0, 500)}`,
    );
  }

  const byRule = {};
  let errors = 0;
  let warnings = 0;

  for (const file of report) {
    for (const message of file.messages) {
      if (message.severity === 2) errors += 1;
      else warnings += 1;
      const rule = message.ruleId || "unknown";
      byRule[rule] = (byRule[rule] || 0) + 1;
    }
  }

  return { errors, warnings, byRule };
}

function main() {
  const targets = only ? TARGETS.filter((t) => t.name === only) : TARGETS;
  if (targets.length === 0) {
    console.error(
      `Unknown package "${only}". Expected one of: ${TARGETS.map((t) => t.name).join(", ")}`,
    );
    process.exit(2);
  }

  const budget = readBudget();
  let failed = false;
  const results = {};

  for (const target of targets) {
    const stats = runEslint(target);
    results[target.name] = stats;
    const allowed = budget.packages?.[target.name]?.warnings ?? stats.warnings;

    const delta = stats.warnings - allowed;
    const trend =
      delta > 0
        ? `over budget by ${delta}`
        : delta < 0
          ? `under budget by ${-delta}`
          : "at budget";

    console.log(
      `\n[${target.name}] errors: ${stats.errors}  warnings: ${stats.warnings} (budget ${allowed}) — ${trend}`,
    );

    if (SHOW_RULES) {
      for (const [rule, count] of Object.entries(stats.byRule).sort(
        (a, b) => b[1] - a[1],
      )) {
        console.log(`    ${String(count).padStart(4)}  ${rule}`);
      }
    }

    if (stats.errors > 0) {
      console.error(
        `[${target.name}] FAIL: ${stats.errors} lint error(s) must be fixed immediately.`,
      );
      failed = true;
    }
    if (delta > 0) {
      console.error(
        `[${target.name}] FAIL: warnings grew by ${delta}. Fix the new warnings, or remove them ` +
          `before raising the budget in lint-budget.json deliberately.`,
      );
      failed = true;
    }

    if (UPDATE) {
      budget.packages = budget.packages || {};
      budget.packages[target.name] = {
        warnings: stats.warnings,
        errors: stats.errors,
      };
    }
  }

  if (UPDATE) {
    budget.version = 1;
    fs.writeFileSync(
      BUDGET_FILE,
      `${JSON.stringify(budget, null, 2)}\n`,
      "utf8",
    );
    console.log(`\nUpdated ${path.relative(ROOT, BUDGET_FILE)}`);
  }

  if (failed) process.exit(1);

  const total = Object.values(results).reduce((sum, r) => sum + r.warnings, 0);
  console.log(`\nLint budget OK — ${total} warning(s) remaining.`);
}

try {
  main();
} catch (error) {
  console.error(`[lint-budget] ${error.message}`);
  process.exit(2);
}
