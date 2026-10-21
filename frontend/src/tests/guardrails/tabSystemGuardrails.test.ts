import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T12 (AC7): un unico sistema de tabs.
 *
 * `components/ui/TabNav.tsx` es la unica implementacion de tabs del design
 * system (semantica APG: role="tablist"/"tab", aria-selected, roving
 * tabindex y navegacion por flechas). Las copias pegadas en GovernanceHub y
 * Configuration quedan prohibidas.
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

describe("Guardrail de sistema de tabs unico (spec 031 AC7)", () => {
  it("solo TabNav.tsx declara un tablist", () => {
    const files = getFilesRecursively(srcDir, [".tsx"]).filter(
      (file) => !file.includes(".spec.") && !file.includes(".test."),
    );
    const implementations = files.filter((file) =>
      readFileSync(file, "utf8").includes('role="tablist"'),
    );

    expect(implementations.map((file) => path.relative(frontendRoot, file))).toEqual([
      "src/components/ui/TabNav.tsx",
    ]);
  });

  it("las vistas migradas usan el TabNav compartido", () => {
    for (const relPath of [
      "src/features/governance/views/GovernanceHub.view.tsx",
      "src/features/configuration/views/Configuration.view.tsx",
    ]) {
      const content = readFileSync(path.join(frontendRoot, relPath), "utf8");
      expect(content).toContain("TabNav");
      expect(content).not.toContain('role="tablist"');
    }
  });
});
