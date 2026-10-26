import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T16 (AC10): jerarquia tipografica.
 *
 * - 0 usos de `text-[7px]`, `text-[8px]` y `text-[9px]`: el tamano micro
 *   minimo es `text-xxs` (10px) o las utilidades `typo-ui-*`.
 * - `text-[10px]`/`text-[11px]` quedan bajo un budget monotono decreciente
 *   (solo puede bajar, nunca crecer).
 * - El shell (Header, Sidebar, items y Badge) usa `typo-ui-*` y ningun
 *   tamano arbitrario.
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

/** Budget monotono: conteo real de text-[10px]/text-[11px] tras T16. */
const MICRO_TEXT_BUDGET = 690;

/** Archivos del shell que deben usar solo `typo-ui-*` (sin text-[Npx]). */
const SHELL_FILES = [
  "src/components/layout/Header.view.tsx",
  "src/components/layout/Sidebar.view.tsx",
  "src/components/layout/SidebarNavItem.tsx",
  "src/components/ui/Badge.tsx",
];

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...getFilesRecursively(fullPath, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const sourceFiles = getFilesRecursively(srcDir, [".tsx"]).filter(
  (file) => !file.includes(".spec.") && !file.includes(".test."),
);

describe("Guardrail de jerarquia tipografica (spec 031 AC10)", () => {
  it("no quedan tamanos micro por debajo de 10px", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8");
      const matches = content.match(/text-\[(7|8|9)px\]/g);
      if (matches) {
        offenders.push(
          `${path.relative(frontendRoot, file)} (${matches.length}): usa text-xxs o typo-ui-*`,
        );
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("el budget de text-[10px]/text-[11px] solo puede decrecer", () => {
    let count = 0;
    for (const file of sourceFiles) {
      const matches = readFileSync(file, "utf8").match(/text-\[(10|11)px\]/g);
      count += matches ? matches.length : 0;
    }
    expect(
      count,
      `text-[10px]/text-[11px] (${count}) supera el budget (${MICRO_TEXT_BUDGET}). Migra a typo-ui-* o text-xxs.`,
    ).toBeLessThanOrEqual(MICRO_TEXT_BUDGET);
  });

  it("el shell usa las utilidades tipograficas del design system", () => {
    for (const relPath of SHELL_FILES) {
      const content = readFileSync(path.join(frontendRoot, relPath), "utf8");
      expect(content, `${relPath} no debe usar tamanos arbitrarios de texto`).not.toMatch(
        /text-\[\d+px\]/,
      );
      expect(content, `${relPath} debe adoptar typo-ui-*`).toMatch(/typo-ui-/);
    }
  });

  it("index.css define las utilidades tipograficas oficiales", () => {
    const indexCss = readFileSync(path.join(srcDir, "index.css"), "utf8");
    for (const utility of [
      "typo-ui-tab",
      "typo-ui-title",
      "typo-ui-label",
      "typo-ui-badge",
      "typo-ui-meta",
      "typo-ui-caption",
      "typo-list-header",
      "typo-list-primary",
      "typo-list-secondary",
      "typo-list-value",
      "typo-list-note",
      "typo-list-status",
      "text-xxs",
    ]) {
      expect(indexCss).toContain(`@utility ${utility}`);
    }
  });
});
