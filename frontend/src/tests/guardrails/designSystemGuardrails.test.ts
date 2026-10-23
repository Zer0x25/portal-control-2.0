import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

/**
 * Colecta recursivamente archivos con extensiones dadas
 */
function getFilesRecursively(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  if (!readdirSync) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = statSync(fullPath);
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

/**
 * Lista de archivos certificados (fuente unica compartida con el audit
 * script: frontend/design-system-certified.json).
 */
function readCertifiedFiles(): string[] {
  const certifiedPath = path.join(frontendRoot, "design-system-certified.json");
  expect(
    existsSync(certifiedPath),
    "design-system-certified.json must exist (fuente unica de archivos certificados)",
  ).toBe(true);
  const parsed = JSON.parse(readFileSync(certifiedPath, "utf8"));
  return parsed.files as string[];
}

describe("Design System & UI Governance Guardrails", () => {
  it("prevents arbitrary hex color utility classes in core UI components, layouts, and features", () => {
    const allScannedFiles = [
      ...getFilesRecursively(path.join(srcDir, "components/ui"), [".tsx"]),
      ...getFilesRecursively(path.join(srcDir, "components/layout"), [".tsx"]),
      ...getFilesRecursively(path.join(srcDir, "features"), [".tsx"]),
    ];

    const arbitraryHexRegex = /(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/;

    const violations: { file: string; match: string }[] = [];

    for (const file of allScannedFiles) {
      const content = readFileSync(file, "utf8");
      const match = content.match(arbitraryHexRegex);
      if (match) {
        violations.push({
          file: path.relative(frontendRoot, file),
          match: match[0],
        });
      }
    }

    expect(
      violations,
      `Found arbitrary HEX classes in UI files. Use semantic tokens (bg-token-*, text-token-*):\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  it("prevents arbitrary inline styles in audited views unless dynamic", () => {
    const viewFiles = getFilesRecursively(path.join(srcDir, "features"), [".view.tsx"]);
    const violations: string[] = [];

    // Busca patrones sospechosos de style={{ color: '...', backgroundColor: '...' }}
    const hardcodedColorStyleRegex =
      /style=\{\{[^}]*(?:color|backgroundColor|borderColor)\s*:\s*["'][^"']+["'][^}]*\}\}/i;

    for (const file of viewFiles) {
      const content = readFileSync(file, "utf8");
      if (hardcodedColorStyleRegex.test(content)) {
        violations.push(path.relative(frontendRoot, file));
      }
    }

    expect(
      violations,
      `Found hardcoded colors in inline styles. Use Tailwind token classes:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("prevents outlier radius classes (rounded-3xl, rounded-4xl) in desktop tables and list containers", () => {
    const desktopListFiles = [
      ...getFilesRecursively(path.join(srcDir, "features"), [".tsx"]).filter((f) =>
        f.includes("ListDesktop.tsx"),
      ),
      path.join(srcDir, "components/ui/ReportTable.tsx"),
    ];

    const outlierRadiusRegex = /rounded-(?:3xl|4xl)/;
    const violations: { file: string; match: string }[] = [];

    for (const file of desktopListFiles) {
      const content = readFileSync(file, "utf8");
      const match = content.match(outlierRadiusRegex);
      if (match) {
        violations.push({
          file: path.relative(frontendRoot, file),
          match: match[0],
        });
      }
    }

    expect(
      violations,
      `Found outlier border-radius in desktop table containers. Use standard rounded-lg/rounded-md:\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  it("enforces listTokens to consume semantic design tokens", () => {
    const listTokensPath = path.join(
      srcDir,
      "features/theoretical-shifts/components/listTokens.ts",
    );
    const content = readFileSync(listTokensPath, "utf8");

    expect(content).toContain("token-border-subtle");
    expect(content).toContain("token-surface-hover");
    expect(content).toContain("token-text-primary");
    expect(content).toContain("token-text-secondary");
    expect(content).not.toContain("text-gray-900 dark:text-gray-100");
  });

  it("verifies index.css exports official semantic tokens", () => {
    const indexCssPath = path.join(srcDir, "index.css");
    const indexCss = readFileSync(indexCssPath, "utf8");

    const requiredTokens = [
      "--color-token-surface-app",
      "--color-token-surface-card",
      "--color-token-surface-header",
      "--color-token-border-technical",
      "--color-token-text-primary",
      "--color-token-text-secondary",
      "--color-token-status-success",
      "--color-token-status-error",
      "--color-token-status-warning",
      "--color-token-status-info",
      "--color-token-accent-brand",
    ];

    for (const token of requiredTokens) {
      expect(indexCss).toContain(token);
    }
  });

  it("enforces zero design drift in certified primitives and layouts", () => {
    const budgetPath = path.join(frontendRoot, "design-system-budget.json");
    expect(existsSync(budgetPath), "design-system-budget.json must exist").toBe(true);

    // Fuente unica de la lista certificada (la misma que usa el audit script).
    const certifiedFiles = readCertifiedFiles();

    const rawPaletteRegex =
      /\b(?:bg|text|border|ring|divide)-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/[0-9]+)?\b/g;

    const certifiedViolations: { file: string; match: string }[] = [];
    const missingFiles: string[] = [];

    for (const relPath of certifiedFiles) {
      const fullPath = path.join(frontendRoot, relPath);
      if (!existsSync(fullPath)) {
        missingFiles.push(relPath);
        continue;
      }
      const content = readFileSync(fullPath, "utf8");
      const matches = content.match(rawPaletteRegex);
      if (matches) {
        certifiedViolations.push({ file: relPath, match: matches.join(", ") });
      }
    }

    expect(
      missingFiles,
      `Certified files listed in design-system-certified.json do not exist:\n${missingFiles.join("\n")}`,
    ).toEqual([]);

    expect(
      certifiedViolations,
      `Found raw palette colors in certified primitives/layouts:\n${JSON.stringify(certifiedViolations, null, 2)}`,
    ).toEqual([]);
  });

  it("requires a Storybook story for every certified design-system entry", () => {
    const certifiedFiles = readCertifiedFiles();
    const missingStories: string[] = [];
    const invalidStories: string[] = [];

    for (const relPath of certifiedFiles) {
      const storyPath = path.join(frontendRoot, relPath.replace(/\.tsx?$/, ".stories.tsx"));
      if (!existsSync(storyPath)) {
        missingStories.push(path.relative(frontendRoot, storyPath));
        continue;
      }

      const story = readFileSync(storyPath, "utf8");
      if (
        !story.includes('from "@storybook/react-vite"') ||
        !/export\s+default\s+meta\s*;/.test(story) ||
        !/export\s+const\s+Default\s*:/.test(story)
      ) {
        invalidStories.push(path.relative(frontendRoot, storyPath));
      }
    }

    expect(
      missingStories,
      `Certified entries without stories:\n${missingStories.join("\n")}`,
    ).toEqual([]);
    expect(
      invalidStories,
      `Stories missing typed metadata or a named story:\n${invalidStories.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps Storybook runtime imports out of production source", () => {
    const scannedFiles = getFilesRecursively(srcDir, [".tsx", ".ts"]).filter(
      (file) =>
        !file.includes(".test.") &&
        !file.includes(".spec.") &&
        !file.includes(".stories.") &&
        !file.includes(".d.ts"),
    );
    const runtimeImport = /(?:from\s*["']@storybook\/|import\s*\(\s*["']@storybook\/)/;
    const violations = scannedFiles
      .filter((file) => runtimeImport.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(frontendRoot, file));

    expect(
      violations,
      `Production source imports Storybook runtime:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  /**
   * Spec 031 T8 (AC3): el ratchet del palette crudo completo.
   *
   * El budget vive en design-system-budget.json y es monotono decreciente:
   * - El conteo real nunca puede superar el budget (crecer = CI rojo).
   * - Reducir el drift no obliga a tocar el budget (solo a mejorarlo).
   * - El budget del subconjunto certificado nunca supera al global.
   */
  it("mantiene el ratchet monotono del palette crudo completo", () => {
    const budgetPath = path.join(frontendRoot, "design-system-budget.json");
    const budget = JSON.parse(readFileSync(budgetPath, "utf8"));

    expect(
      typeof budget.paletteIssuesBudget,
      "design-system-budget.json debe declarar paletteIssuesBudget",
    ).toBe("number");
    expect(
      typeof budget.certifiedPaletteBudget,
      "design-system-budget.json debe declarar certifiedPaletteBudget",
    ).toBe("number");

    const scannedFiles = getFilesRecursively(srcDir, [".tsx", ".ts"]).filter(
      (file) => !file.includes(".test.") && !file.includes(".d.ts"),
    );
    const certifiedFiles = new Set(readCertifiedFiles());

    const fullPaletteRegex = new RegExp(
      "\\b(?:bg|text|border|ring|divide|from|via|to|fill|stroke|decoration|shadow)-" +
        "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-" +
        "(?:50|100|200|300|400|500|600|700|800|900|950)(?:/[0-9]+)?\\b",
      "g",
    );

    let paletteUsages = 0;
    let certifiedPaletteUsages = 0;

    for (const file of scannedFiles) {
      const content = readFileSync(file, "utf8");
      const matches = content.match(fullPaletteRegex);
      if (!matches) continue;
      paletteUsages += matches.length;
      const relPath = path.relative(frontendRoot, file).split(path.sep).join("/");
      if (certifiedFiles.has(relPath)) {
        certifiedPaletteUsages += matches.length;
      }
    }

    expect(
      paletteUsages,
      `Raw palette usages (${paletteUsages}) exceed the ratchet budget (${budget.paletteIssuesBudget}). Migrate to semantic tokens.`,
    ).toBeLessThanOrEqual(budget.paletteIssuesBudget);

    expect(
      certifiedPaletteUsages,
      `Raw palette usages in certified files (${certifiedPaletteUsages}) exceed the ratchet budget (${budget.certifiedPaletteBudget}).`,
    ).toBeLessThanOrEqual(budget.certifiedPaletteBudget);

    expect(budget.certifiedPaletteBudget).toBeLessThanOrEqual(budget.paletteIssuesBudget);
  });
});
