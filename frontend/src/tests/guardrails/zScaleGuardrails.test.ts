import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T17 (AC11): escala z-index documentada y sin numeros magicos.
 *
 * - `src/constants/zScale.ts` define los 7 niveles unificados
 *   (base, sticky, dropdown, overlay, modal, max, toast).
 * - Ningun componente usa clases `z-<numero>`: todas pasan por `Z.<nivel>`.
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

const EXPECTED_LEVELS = ["base", "sticky", "dropdown", "overlay", "modal", "max", "toast"];

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

const sourceFiles = getFilesRecursively(srcDir, [".tsx", ".ts"]).filter(
  (file) => !file.includes(".spec.") && !file.includes(".test."),
);

describe("Guardrail de escala z-index (spec 031 AC11)", () => {
  it("la escala declara los 7 niveles unificados", () => {
    const zScale = readFileSync(path.join(srcDir, "constants/zScale.ts"), "utf8");
    for (const level of EXPECTED_LEVELS) {
      expect(zScale).toContain(`${level}:`);
    }
    expect(zScale).toContain("export const Z");
    expect(zScale).toContain("export type ZLevel");
  });

  it("no quedan clases z-<numero> en el codigo", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      if (file.endsWith(path.join("constants", "zScale.ts"))) continue;
      const content = readFileSync(file, "utf8");
      const matches = content.match(/\bz-\d+\b/g);
      if (matches) {
        offenders.push(`${path.relative(frontendRoot, file)}: ${[...new Set(matches)].join(", ")}`);
      }
    }
    expect(
      offenders,
      `Usa Z.<nivel> (src/constants/zScale.ts) en lugar de numeros magicos:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("los niveles de Z tienen valores unicos y ordenados", () => {
    const zScale = readFileSync(path.join(srcDir, "constants/zScale.ts"), "utf8");
    const values = [...zScale.matchAll(/:\s*"(z-\d+)"/g)].map((m) => Number(m[1].slice(2)));
    expect(values).toHaveLength(EXPECTED_LEVELS.length);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
