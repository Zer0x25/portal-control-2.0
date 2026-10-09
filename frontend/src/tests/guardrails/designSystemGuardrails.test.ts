import { readFileSync, readdirSync, statSync } from "node:fs";
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
  it("prevents arbitrary hex color utility classes in core UI components and views", () => {
    const viewAndUiFiles = [
      ...getFilesRecursively(path.join(srcDir, "components/ui"), [".tsx"]),
      ...getFilesRecursively(path.join(srcDir, "features"), [".view.tsx"]),
    ];

    const arbitraryHexRegex = /(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/;

    const violations: { file: string; match: string }[] = [];

    for (const file of viewAndUiFiles) {
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
});
