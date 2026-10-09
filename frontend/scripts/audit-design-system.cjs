#!/usr/bin/env node
/**
 * Design System Compliance & Drift Auditor
 *
 * Scans frontend source files for design system deviations:
 * - Raw palette colors (slate/gray/zinc/neutral/stone) instead of semantic tokens
 * - Arbitrary HEX values (e.g. bg-[#...])
 * - Outlier radii (rounded-3xl, rounded-4xl)
 * - Raw <button> HTML elements without primitives
 *
 * Enforces:
 * 1. Zero drift in Certified Files (core primitives & layout)
 * 2. Monotonic Ratchet on Total Drift Issues via design-system-budget.json
 *
 * Usage:
 *   node scripts/audit-design-system.cjs            # check & report
 *   node scripts/audit-design-system.cjs --detail   # show line-by-line issues
 *   node scripts/audit-design-system.cjs --update   # update budget to current count
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const BUDGET_FILE = path.join(ROOT, "design-system-budget.json");

const CERTIFIED_FILES = [
  "src/components/ui/Button.tsx",
  "src/components/ui/Input.tsx",
  "src/components/ui/Card.tsx",
  "src/components/ui/Badge.tsx",
  "src/components/ui/Select.tsx",
  "src/components/ui/Checkbox.tsx",
  "src/components/ui/Switch.tsx",
  "src/components/ui/Textarea.tsx",
  "src/components/ui/EmptyState.tsx",
  "src/components/ui/Skeleton.tsx",
  "src/components/ui/LoadingSpinner.tsx",
  "src/components/ui/PaginationControls.tsx",
  "src/components/ui/PageHeader.tsx",
  "src/components/ui/KpiCard.tsx",
  "src/components/ui/MetricCard.tsx",
  "src/components/ui/CinematicModal.tsx",
  "src/components/ui/ConfirmationModal.tsx",
  "src/components/ui/SortableHeader.tsx",
  "src/components/ui/ReportTable.tsx",
  "src/components/ui/DesignSystemShowcaseModal.tsx",
  "src/components/layout/Header.view.tsx",
  "src/components/layout/Sidebar.view.tsx",
  "src/components/layout/SidebarNavItem.tsx",
  "src/components/layout/PersistentLayout.view.tsx",
  "src/components/layout/NotificationCenter.view.tsx",
  "src/features/theoretical-shifts/components/listTokens.ts",
];

const RAW_PALETTE_REGEX =
  /\b(?:bg|text|border|ring|divide)-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/[0-9]+)?\b/g;
const ARBITRARY_HEX_REGEX = /\b(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g;
const OUTLIER_RADIUS_REGEX = /\brounded-(?:3xl|4xl)\b/g;
const RAW_BUTTON_REGEX = /<button\b[^>]*className=/g;

function getFilesRecursively(dir, extensions) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== "tests") {
        results = results.concat(getFilesRecursively(fullPath, extensions));
      }
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function auditFile(filePath) {
  const relPath = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const issues = [];

  lines.forEach((line, lineIdx) => {
    const lineNum = lineIdx + 1;

    // 1. Raw palette colors
    let match;
    RAW_PALETTE_REGEX.lastIndex = 0;
    while ((match = RAW_PALETTE_REGEX.exec(line)) !== null) {
      issues.push({
        type: "raw-palette",
        match: match[0],
        line: lineNum,
      });
    }

    // 2. Arbitrary HEX
    ARBITRARY_HEX_REGEX.lastIndex = 0;
    while ((match = ARBITRARY_HEX_REGEX.exec(line)) !== null) {
      issues.push({
        type: "arbitrary-hex",
        match: match[0],
        line: lineNum,
      });
    }

    // 3. Outlier radius
    OUTLIER_RADIUS_REGEX.lastIndex = 0;
    while ((match = OUTLIER_RADIUS_REGEX.exec(line)) !== null) {
      issues.push({
        type: "outlier-radius",
        match: match[0],
        line: lineNum,
      });
    }

    // 4. Raw button
    RAW_BUTTON_REGEX.lastIndex = 0;
    if (RAW_BUTTON_REGEX.test(line) && !relPath.includes("components/ui/Button.tsx")) {
      issues.push({
        type: "raw-button",
        match: "<button ...>",
        line: lineNum,
      });
    }
  });

  return {
    relPath,
    isCertified: CERTIFIED_FILES.includes(relPath),
    issues,
  };
}

function runAudit() {
  const args = process.argv.slice(2);
  const detail = args.includes("--detail");
  const update = args.includes("--update");

  const files = getFilesRecursively(SRC_DIR, [".tsx", ".ts"]).filter(
    (f) => !f.includes(".test.") && !f.includes(".d.ts"),
  );

  const results = files.map(auditFile);

  const moduleGroups = {};
  let totalFiles = 0;
  let cleanFiles = 0;
  let totalIssues = 0;
  let certifiedViolations = 0;

  for (const res of results) {
    totalFiles++;
    const parts = res.relPath.split(path.sep);
    let moduleKey = "src";
    if (parts.length > 2) {
      if (parts[1] === "features") {
        moduleKey = `features/${parts[2]}`;
      } else if (parts[1] === "components") {
        moduleKey = `components/${parts[2]}`;
      } else {
        moduleKey = parts[1];
      }
    }

    if (!moduleGroups[moduleKey]) {
      moduleGroups[moduleKey] = { files: 0, clean: 0, issues: 0, details: [] };
    }

    const group = moduleGroups[moduleKey];
    group.files++;
    group.issues += res.issues.length;
    totalIssues += res.issues.length;

    if (res.issues.length === 0) {
      group.clean++;
      cleanFiles++;
    } else {
      group.details.push(res);
      if (res.isCertified) {
        certifiedViolations += res.issues.length;
      }
    }
  }

  console.log("\n==========================================================================");
  console.log("             PORTAL-CONTROL DESIGN SYSTEM AUDIT & DRIFT SCORECARD         ");
  console.log("==========================================================================\n");

  console.log(
    `Total Files Scanned: ${totalFiles} | Clean: ${cleanFiles} (${Math.round((cleanFiles / totalFiles) * 100)}%) | Total Drift Issues: ${totalIssues}\n`,
  );

  console.log("----------------------------------------------------------------------------------");
  console.log(
    "Module / Feature                  | Files | Clean | Drift Issues | Compliance Score",
  );
  console.log("----------------------------------------------------------------------------------");

  const sortedModules = Object.entries(moduleGroups).sort((a, b) => b[1].issues - a[1].issues);

  for (const [mod, data] of sortedModules) {
    const score = Math.round((data.clean / data.files) * 100);
    const modCol = mod.padEnd(33, " ");
    const filesCol = String(data.files).padStart(5, " ");
    const cleanCol = String(data.clean).padStart(5, " ");
    const issuesCol = String(data.issues).padStart(12, " ");
    const scoreCol = `${score}%`.padStart(15, " ");
    const badge = score === 100 ? " ✅" : score >= 70 ? " ⚠️" : " ❌";
    console.log(`${modCol} | ${filesCol} | ${cleanCol} | ${issuesCol} | ${scoreCol}${badge}`);
  }

  console.log(
    "----------------------------------------------------------------------------------\n",
  );

  // Budget comparison
  let budget = null;
  if (fs.existsSync(BUDGET_FILE)) {
    try {
      budget = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
    } catch {
      budget = null;
    }
  }

  if (update || !budget) {
    const newBudget = {
      version: 1,
      totalIssuesBudget: totalIssues,
      certifiedFilesCount: CERTIFIED_FILES.length,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(newBudget, null, 2) + "\n", "utf8");
    console.log(`[Budget] design-system-budget.json updated to ${totalIssues} drift issues.`);
  } else {
    console.log(
      `[Budget] Current issues: ${totalIssues} | Budget max allowed: ${budget.totalIssuesBudget}`,
    );
  }

  if (detail) {
    console.log("\nDETAILED DRIFT BREAKDOWN BY FILE:\n");
    for (const [mod, data] of sortedModules) {
      if (data.details.length === 0) continue;
      console.log(`\n📦 ${mod}:`);
      for (const res of data.details) {
        console.log(`  - ${res.relPath} (${res.issues.length} issues):`);
        const countByType = {};
        for (const issue of res.issues) {
          countByType[issue.type] = (countByType[issue.type] || 0) + 1;
        }
        for (const [type, count] of Object.entries(countByType)) {
          console.log(`      * ${type}: ${count}`);
        }
        const sample = res.issues.slice(0, 3);
        for (const s of sample) {
          console.log(`        L${s.line}: ${s.type} -> "${s.match}"`);
        }
        if (res.issues.length > 3) {
          console.log(`        ... y ${res.issues.length - 3} más`);
        }
      }
    }
  }

  let hasError = false;

  if (certifiedViolations > 0) {
    console.error(
      `\n🚨 REGRESSION DETECTED: Found ${certifiedViolations} violations in CERTIFIED primitives/layouts!`,
    );
    hasError = true;
  }

  if (budget && totalIssues > budget.totalIssuesBudget) {
    console.error(
      `\n🚨 BUDGET EXCEEDED: Drift issues (${totalIssues}) exceed allowed budget (${budget.totalIssuesBudget})!`,
    );
    hasError = true;
  }

  if (hasError) {
    process.exit(1);
  }

  console.log(
    "\nPara ver el desglose detallado ejecuta: npm run audit:design-system -- --detail\n",
  );
}

runAudit();
