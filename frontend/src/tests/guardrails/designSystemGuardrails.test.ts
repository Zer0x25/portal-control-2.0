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

    const certifiedFiles = [
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

    const rawPaletteRegex =
      /\b(?:bg|text|border|ring|divide)-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/[0-9]+)?\b/g;

    const certifiedViolations: { file: string; match: string }[] = [];

    for (const relPath of certifiedFiles) {
      const fullPath = path.join(frontendRoot, relPath);
      const content = readFileSync(fullPath, "utf8");
      const matches = content.match(rawPaletteRegex);
      if (matches) {
        certifiedViolations.push({ file: relPath, match: matches.join(", ") });
      }
    }

    expect(
      certifiedViolations,
      `Found raw palette colors in certified primitives/layouts:\n${JSON.stringify(certifiedViolations, null, 2)}`,
    ).toEqual([]);
  });
});
