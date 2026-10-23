#!/usr/bin/env node
/**
 * Design System Compliance & Drift Auditor
 *
 * Scans frontend source files for design system deviations:
 * - Raw palette colors (slate/gray/zinc/neutral/stone) instead of semantic tokens
 * - Raw palette colors across the full Tailwind palette and all color prefixes
 * - Arbitrary HEX values (e.g. bg-[#...])
 * - Outlier radii (rounded-3xl, rounded-4xl)
 * - Raw <button> HTML elements without primitives
 *
 * Enforces:
 * 1. Zero drift in Certified Files (core primitives & layout)
 * 2. Monotonic Ratchet on Total Drift Issues via design-system-budget.json
 * 3. Monotonic Ratchet on raw palette usage (global + certified subset),
 *    initialized to the real measured count (spec 031 T7 / AC3)
 *
 * Usage:
 *   node scripts/audit-design-system.cjs            # check & report
 *   node scripts/audit-design-system.cjs --detail   # show line-by-line issues
 *   node scripts/audit-design-system.cjs --update   # lower budget to current count
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const BUDGET_FILE = path.join(ROOT, "design-system-budget.json");
const CERTIFIED_FILE = path.join(ROOT, "design-system-certified.json");
const TOKENS_FILE = path.join(ROOT, "tokens.json");
const VISUAL_SUMMARY_FILE = path.join(ROOT, "visual-regression-summary.json");

/**
 * Archivos certificados (fuente unica: design-system-certified.json).
 * El guardrail de tests (src/tests/guardrails/designSystemGuardrails.test.ts)
 * lee la misma lista para evitar drift entre script y test.
 */
const CERTIFIED_FILES = (() => {
  if (!fs.existsSync(CERTIFIED_FILE)) {
    throw new Error(
      `Falta ${CERTIFIED_FILE}: la lista de archivos certificados es la fuente unica del audit.`,
    );
  }
  const parsed = JSON.parse(fs.readFileSync(CERTIFIED_FILE, "utf8"));
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error(`${CERTIFIED_FILE} debe contener un array "files" no vacio.`);
  }
  return parsed.files;
})();

const DESIGN_TOKENS = (() => {
  if (!fs.existsSync(TOKENS_FILE)) {
    throw new Error(`Falta ${TOKENS_FILE}: el catálogo de tokens es la fuente de verdad.`);
  }
  const parsed = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
  if (!Array.isArray(parsed.tokens) || parsed.tokens.length === 0) {
    throw new Error(`${TOKENS_FILE} debe contener un array "tokens" no vacío.`);
  }
  return parsed.tokens;
})();

/**
 * Scope estricto: el que ya se auditaba (budget 0, cero tolerancia en
 * archivos certificados). Se mantiene igual para no romper el gate actual.
 */
const STRICT_PALETTE_REGEX =
  /\b(?:bg|text|border|ring|divide)-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/[0-9]+)?\b/g;

/**
 * Scope extendido (spec 031 T7 / AC3): paleta completa de Tailwind sobre
 * todos los prefijos de color. Governed by a monotonic ratchet initialized
 * to the real measured count.
 */
const PALETTE_FAMILIES = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
].join("|");
const PALETTE_PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "divide",
  "from",
  "via",
  "to",
  "fill",
  "stroke",
  "decoration",
  "shadow",
].join("|");
const PALETTE_TONES = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
].join("|");
const RAW_PALETTE_REGEX = new RegExp(
  `\\b(?:${PALETTE_PREFIXES})-(?:${PALETTE_FAMILIES})-(?:${PALETTE_TONES})(?:/[0-9]+)?\\b`,
  "g",
);

const ARBITRARY_HEX_REGEX = /\b(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g;
const OUTLIER_RADIUS_REGEX = /\brounded-(?:3xl|4xl)\b/g;
const RAW_BUTTON_REGEX = /<button\b[^>]*className=/g;
const SAP_TOKEN_REGEX = /\bsap-[a-zA-Z0-9-]+\b/g;
const DYNAMIC_TOKEN_REGEX =
  /\b(?:bg|text|border|ring|divide|fill|stroke|from|via|to)-token-(?:chart|status)-\$\{[^}]+\}(?:\/[0-9]+)?(?=$|[\s"'`])/g;
const TOKEN_NAMES = DESIGN_TOKENS.map((token) => token.token).sort(
  (left, right) => right.length - left.length,
);
const TOKEN_CONSUMER_REGEX = new RegExp(
  `(${TOKEN_NAMES.map(escapeRegExp).join("|")})(?![a-zA-Z0-9-])`,
  "g",
);

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

function getAllSourceFiles(dir, extensions) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") {
        results = results.concat(getAllSourceFiles(fullPath, extensions));
      }
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      results.push(fullPath);
    }
  }
  return results;
}

function readBudget() {
  if (!fs.existsSync(BUDGET_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
  } catch {
    return null;
  }
}

function isTokenConsumer(relPath) {
  const sourcePath = path.relative(SRC_DIR, path.join(ROOT, relPath)).split(path.sep).join("/");
  return (
    !sourcePath.startsWith("features/design-system/") &&
    !sourcePath.endsWith(".stories.tsx") &&
    sourcePath !== "types/tokens.ts" &&
    !sourcePath.endsWith(".d.ts") &&
    !sourcePath.includes(".test.")
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countSapReferences(fileList) {
  const references = [];
  for (const file of fileList) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, lineIdx) => {
      SAP_TOKEN_REGEX.lastIndex = 0;
      let match;
      while ((match = SAP_TOKEN_REGEX.exec(line)) !== null) {
        references.push({
          file: path.relative(ROOT, file),
          line: lineIdx + 1,
          match: match[0],
        });
      }
    });
  }
  return references;
}

function readVisualRegressionSummary() {
  if (!fs.existsSync(VISUAL_SUMMARY_FILE)) return null;
  const summary = JSON.parse(fs.readFileSync(VISUAL_SUMMARY_FILE, "utf8"));
  if (
    summary.version !== 1 ||
    !["passed", "failed"].includes(summary.status) ||
    !Array.isArray(summary.changed) ||
    !summary.changed.every((change) => typeof change === "string")
  ) {
    throw new Error(
      `${VISUAL_SUMMARY_FILE} debe declarar version: 1, status passed|failed y changed[].`,
    );
  }
  return summary;
}

function auditFile(filePath) {
  const relPath = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const issues = [];
  const sapUsages = [];
  const dynamicPatterns = [];
  const tokenUsages = [];

  if (isTokenConsumer(relPath)) {
    TOKEN_CONSUMER_REGEX.lastIndex = 0;
    let tokenMatch;
    while ((tokenMatch = TOKEN_CONSUMER_REGEX.exec(content)) !== null) {
      tokenUsages.push(tokenMatch[1]);
    }
  }

  lines.forEach((line, lineIdx) => {
    const lineNum = lineIdx + 1;
    DYNAMIC_TOKEN_REGEX.lastIndex = 0;
    let dynamicMatch;
    while ((dynamicMatch = DYNAMIC_TOKEN_REGEX.exec(line)) !== null) {
      dynamicPatterns.push({ pattern: dynamicMatch[0], file: relPath, line: lineNum });
    }

    SAP_TOKEN_REGEX.lastIndex = 0;
    let sapMatch;
    while ((sapMatch = SAP_TOKEN_REGEX.exec(line)) !== null) {
      sapUsages.push({ match: sapMatch[0], line: lineNum });
    }

    // 1. Raw palette colors (scope extendido: paleta completa + prefijos)
    let match;
    RAW_PALETTE_REGEX.lastIndex = 0;
    while ((match = RAW_PALETTE_REGEX.exec(line)) !== null) {
      issues.push({
        type: "raw-palette",
        match: match[0],
        line: lineNum,
      });
    }

    // 1b. Scope estricto (slate/gray family): budget en 0, cero tolerancia
    STRICT_PALETTE_REGEX.lastIndex = 0;
    while ((match = STRICT_PALETTE_REGEX.exec(line)) !== null) {
      issues.push({
        type: "raw-palette-strict",
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
    sapUsages,
    tokenUsages,
    dynamicPatterns,
  };
}

function summarizeTokenAudit(results) {
  const consumerCounts = new Map(DESIGN_TOKENS.map((token) => [token.token, 0]));
  const dynamicPatterns = new Map();

  for (const result of results) {
    for (const token of result.tokenUsages) {
      consumerCounts.set(token, consumerCounts.get(token) + 1);
    }
    for (const item of result.dynamicPatterns) {
      dynamicPatterns.set(`${item.pattern}|${item.file}|${item.line}`, item);
    }
  }

  const activeScales = new Set(
    DESIGN_TOKENS.filter(
      (token) => token.protectedScale && consumerCounts.get(token.token) > 0,
    ).map((token) => token.protectedScale),
  );
  const orphanTokens = DESIGN_TOKENS.filter((token) => consumerCounts.get(token.token) === 0).map(
    (token) => ({
      token: token.token,
      protectedScale: token.protectedScale ?? null,
      scaleActive: token.protectedScale ? activeScales.has(token.protectedScale) : false,
    }),
  );

  return { orphanTokens, dynamicPatterns: [...dynamicPatterns.values()] };
}

function runAudit() {
  const args = process.argv.slice(2);
  const detail = args.includes("--detail");
  const update = args.includes("--update");
  let budget = readBudget();

  const files = getFilesRecursively(SRC_DIR, [".tsx", ".ts"]).filter(
    (f) => !f.includes(".test.") && !f.includes(".d.ts") && !f.endsWith(".stories.tsx"),
  );

  const results = files.map(auditFile);
  const sapTokenUsages = results.reduce((count, result) => count + result.sapUsages.length, 0);
  const sapSupplementFiles = getAllSourceFiles(SRC_DIR, [".tsx", ".ts", ".css"]).filter(
    (file) =>
      file.includes(`${path.sep}tests${path.sep}`) ||
      file.includes(".test.") ||
      file.endsWith(".d.ts") ||
      file.endsWith(".css"),
  );
  const sapSourceReferences = results
    .flatMap((result) =>
      result.sapUsages.map((usage) => ({
        ...usage,
        file: result.relPath,
      })),
    )
    .concat(countSapReferences(sapSupplementFiles));
  const tokenAudit = summarizeTokenAudit(results);
  const orphanTokenCount = tokenAudit.orphanTokens.length;
  const visualSummary = readVisualRegressionSummary();

  // Una vez que el ratchet llega a cero, cualquier referencia en producción
  // se incorpora al drift estricto (budget total 0 y archivos certificados).
  if (budget?.sapTokenBudget === 0) {
    for (const result of results) {
      result.issues.push(...result.sapUsages.map((usage) => ({ ...usage, type: "sap-token" })));
    }
  }

  const moduleGroups = {};
  let totalFiles = 0;
  let cleanFiles = 0;
  let totalIssues = 0;
  let paletteIssues = 0;
  let certifiedViolations = 0;
  let certifiedPaletteIssues = 0;

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
      moduleGroups[moduleKey] = {
        files: 0,
        clean: 0,
        issues: 0,
        palette: 0,
        details: [],
      };
    }

    const group = moduleGroups[moduleKey];
    const fileStrictIssues = res.issues.filter((i) => i.type !== "raw-palette");
    const filePaletteIssues = res.issues.filter((i) => i.type === "raw-palette");

    group.files++;
    group.issues += fileStrictIssues.length;
    group.palette += filePaletteIssues.length;
    totalIssues += fileStrictIssues.length;
    paletteIssues += filePaletteIssues.length;

    if (res.issues.length === 0) {
      group.clean++;
      cleanFiles++;
    } else {
      group.details.push(res);
      if (res.isCertified) {
        certifiedViolations += fileStrictIssues.length;
        certifiedPaletteIssues += filePaletteIssues.length;
      }
    }
  }

  console.log("\n==========================================================================");
  console.log("             PORTAL-CONTROL DESIGN SYSTEM AUDIT & DRIFT SCORECARD         ");
  console.log("==========================================================================\n");

  console.log(
    `Total Files Scanned: ${totalFiles} | Clean: ${cleanFiles} (${Math.round((cleanFiles / totalFiles) * 100)}%) | Strict Drift Issues: ${totalIssues} | Raw Palette Usages: ${paletteIssues}\n`,
  );

  console.log("----------------------------------------------------------------------------------");
  console.log(
    "Module / Feature                  | Files | Clean | Strict Drift | Raw Palette | Compliance Score",
  );
  console.log("----------------------------------------------------------------------------------");

  const sortedModules = Object.entries(moduleGroups).sort(
    (a, b) => b[1].issues + b[1].palette - (a[1].issues + a[1].palette),
  );

  for (const [mod, data] of sortedModules) {
    const score = Math.round((data.clean / data.files) * 100);
    const modCol = mod.padEnd(33, " ");
    const filesCol = String(data.files).padStart(5, " ");
    const cleanCol = String(data.clean).padStart(5, " ");
    const issuesCol = String(data.issues).padStart(11, " ");
    const paletteCol = String(data.palette).padStart(11, " ");
    const scoreCol = `${score}%`.padStart(15, " ");
    const badge = score === 100 ? " ✅" : score >= 70 ? " ⚠️" : " ❌";
    console.log(
      `${modCol} | ${filesCol} | ${cleanCol} | ${issuesCol} | ${paletteCol} | ${scoreCol}${badge}`,
    );
  }

  console.log(
    "----------------------------------------------------------------------------------\n",
  );

  const reservedOrphans = tokenAudit.orphanTokens.filter(
    (token) => token.protectedScale && token.scaleActive,
  );
  console.log(
    `Semantic token consumers: ${DESIGN_TOKENS.length - orphanTokenCount}/${DESIGN_TOKENS.length} | Orphan tokens: ${orphanTokenCount} | Reserved scale members: ${reservedOrphans.length}`,
  );
  for (const token of tokenAudit.orphanTokens) {
    const classification = token.scaleActive
      ? `reserved member of active ${token.protectedScale} scale`
      : token.protectedScale
        ? `unused ${token.protectedScale} scale member`
        : "unclassified orphan";
    console.log(`  - ${token.token} (${classification})`);
  }
  if (tokenAudit.dynamicPatterns.length > 0) {
    console.log("Dynamic token classes (Tailwind cannot generate interpolated names):");
    for (const item of tokenAudit.dynamicPatterns) {
      console.log(`  - ${item.pattern} (${item.file}:${item.line})`);
    }
  }
  if (!visualSummary) {
    console.log("Visual regression evidence: skipped (visual-regression-summary.json is absent).");
  } else {
    console.log(
      `Visual regression evidence: ${visualSummary.status}; changed snapshots: ${visualSummary.changed.length}.`,
    );
    for (const change of visualSummary.changed) console.log(`  - ${change}`);
  }
  if (sapSourceReferences.length > 0) {
    console.log(
      `sap-* references in frontend/src (including tests): ${sapSourceReferences.length}`,
    );
  }
  console.log("");

  // Budget comparison
  if (update || !budget) {
    // Ratchet monotono: --update solo puede BAJAR el presupuesto.
    // Si el conteo actual supera el existente, el drift debe corregirse
    // (no se absorbe aumentando el budget).
    const nextStrict = budget ? Math.min(budget.totalIssuesBudget, totalIssues) : totalIssues;
    const nextPalette = budget
      ? Math.min(budget.paletteIssuesBudget ?? Number.POSITIVE_INFINITY, paletteIssues)
      : paletteIssues;
    const nextCertifiedPalette = budget
      ? Math.min(budget.certifiedPaletteBudget ?? Number.POSITIVE_INFINITY, certifiedPaletteIssues)
      : certifiedPaletteIssues;
    const nextSapTokenBudget = budget
      ? Math.min(budget.sapTokenBudget ?? sapTokenUsages, sapTokenUsages)
      : sapTokenUsages;
    const nextOrphanTokenBudget = budget
      ? Math.min(budget.orphanTokenBudget ?? orphanTokenCount, orphanTokenCount)
      : orphanTokenCount;

    const grew =
      (budget && totalIssues > budget.totalIssuesBudget) ||
      (budget && paletteIssues > (budget.paletteIssuesBudget ?? Number.POSITIVE_INFINITY)) ||
      (budget &&
        certifiedPaletteIssues > (budget.certifiedPaletteBudget ?? Number.POSITIVE_INFINITY)) ||
      (budget && sapTokenUsages > (budget.sapTokenBudget ?? Number.POSITIVE_INFINITY)) ||
      (budget && orphanTokenCount > (budget.orphanTokenBudget ?? Number.POSITIVE_INFINITY)) ||
      (budget?.sapTokenBudget === 0 && sapSourceReferences.length > 0);

    if (grew) {
      console.error(
        "\n🚨 BUDGET NO PUEDE AUMENTAR: el drift actual supera el presupuesto vigente.",
      );
      console.error("   Migra los usos a tokens semanticos y vuelve a correr el audit.");
      process.exit(1);
    }

    const newBudget = {
      version: 3,
      totalIssuesBudget: nextStrict,
      paletteIssuesBudget: nextPalette,
      certifiedPaletteBudget: nextCertifiedPalette,
      sapTokenBudget: nextSapTokenBudget,
      orphanTokenBudget: nextOrphanTokenBudget,
      certifiedFilesCount: CERTIFIED_FILES.length,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(newBudget, null, 2) + "\n", "utf8");
    console.log(
      `[Budget] design-system-budget.json actualizado: strict=${nextStrict}, palette=${nextPalette}, certifiedPalette=${nextCertifiedPalette}, sap=${nextSapTokenBudget}, orphan=${nextOrphanTokenBudget}.`,
    );
  } else {
    console.log(
      `[Budget] Strict issues: ${totalIssues} | Budget max allowed: ${budget.totalIssuesBudget}`,
    );
    console.log(
      `[Budget] Raw palette usages: ${paletteIssues} | Budget max allowed: ${budget.paletteIssuesBudget ?? "n/a"}`,
    );
    console.log(
      `[Budget] Raw palette in certified files: ${certifiedPaletteIssues} | Budget max allowed: ${budget.certifiedPaletteBudget ?? "n/a"}`,
    );
    console.log(
      `[Budget] sap-* production usages: ${sapTokenUsages} | Budget max allowed: ${budget.sapTokenBudget ?? "n/a"}`,
    );
    console.log(
      `[Budget] Orphan semantic tokens: ${orphanTokenCount} | Budget max allowed: ${budget.orphanTokenBudget ?? "n/a"}`,
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

  if (budget && paletteIssues > (budget.paletteIssuesBudget ?? Number.POSITIVE_INFINITY)) {
    console.error(
      `\n🚨 BUDGET EXCEEDED: Raw palette usages (${paletteIssues}) exceed allowed budget (${budget.paletteIssuesBudget})!`,
    );
    hasError = true;
  }

  if (
    budget &&
    certifiedPaletteIssues > (budget.certifiedPaletteBudget ?? Number.POSITIVE_INFINITY)
  ) {
    console.error(
      `\n🚨 BUDGET EXCEEDED: Raw palette in certified files (${certifiedPaletteIssues}) exceeds allowed budget (${budget.certifiedPaletteBudget})!`,
    );
    hasError = true;
  }

  if (budget && sapTokenUsages > (budget.sapTokenBudget ?? Number.POSITIVE_INFINITY)) {
    console.error(
      `\n🚨 BUDGET EXCEEDED: sap-* production usages (${sapTokenUsages}) exceed allowed budget (${budget.sapTokenBudget})!`,
    );
    hasError = true;
  }

  if (budget && orphanTokenCount > (budget.orphanTokenBudget ?? Number.POSITIVE_INFINITY)) {
    console.error(
      `\n🚨 BUDGET EXCEEDED: orphan semantic tokens (${orphanTokenCount}) exceed allowed budget (${budget.orphanTokenBudget})!`,
    );
    hasError = true;
  }

  if (budget?.sapTokenBudget === 0 && sapSourceReferences.length > 0) {
    console.error("\n🚨 sap-* ratchet is locked at zero; references remain in frontend/src:");
    for (const reference of sapSourceReferences) {
      console.error(`  ${reference.file}:${reference.line} ${reference.match}`);
    }
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
