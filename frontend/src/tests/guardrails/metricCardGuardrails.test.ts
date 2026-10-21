import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T13 (AC9): una sola primitiva de tarjeta de metrica.
 *
 * - `components/ui/MetricCard.tsx` es la unica primitiva (ficha y panel).
 * - `KpiCard.tsx` queda eliminado.
 * - El tono es un union type: no se permite parsing de strings de color en
 *   runtime ni el prop legacy `indicatorColor`.
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

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

describe("Guardrail de tarjeta de metrica unica (spec 031 AC9)", () => {
  it("KpiCard.tsx queda eliminado", () => {
    expect(
      existsSync(path.join(srcDir, "components/ui/KpiCard.tsx")),
      "KpiCard debe eliminarse: la primitiva unica es MetricCard.tsx",
    ).toBe(false);
  });

  it("no queda el prop legacy indicatorColor ni parsing de color en runtime", () => {
    const files = getFilesRecursively(srcDir, [".tsx", ".ts"]).filter(
      (file) => !file.includes(".spec.") && !file.includes(".test."),
    );
    const offenders = files
      .filter((file) => readFileSync(file, "utf8").includes("indicatorColor"))
      .map((file) => path.relative(frontendRoot, file));
    expect(offenders, `indicatorColor debe migrar a tone: ${offenders.join(", ")}`).toEqual([]);

    const metricCard = readFileSync(path.join(srcDir, "components/ui/MetricCard.tsx"), "utf8");
    expect(metricCard).not.toMatch(/\.split\("-"\)\[0\]/);
    expect(metricCard).toContain("export type MetricTone");
  });

  it("MetricCard expone las dos variantes (ficha y panel)", () => {
    const metricCard = readFileSync(path.join(srcDir, "components/ui/MetricCard.tsx"), "utf8");
    expect(metricCard).toContain('kind?: "metric"');
    expect(metricCard).toContain('kind: "panel"');
  });
});
