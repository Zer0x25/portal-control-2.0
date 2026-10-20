import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T14 (AC9): un unico spinner.
 *
 * - La unica implementacion del arco giratorio es `components/ui/LoadingSpinner.tsx`
 *   (variantes xs/sm/md/lg/xl y tonos default/onAccent/subtle).
 * - Los overlays y el indicador de actividad en segundo plano reutilizan esa
 *   primitiva en vez de duplicar el markup.
 * - El `animate-spin` inline permitido fuera de la primitiva es el del estado
 *   `loading` de Button y la rotacion de iconos de refresco (patron heredado),
 *   que queda sujeto a un budget monotono decreciente.
 */

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

/** Archivos autorizados a contener `animate-spin` propio. */
const SPIN_ALLOWLIST = ["src/components/ui/LoadingSpinner.tsx", "src/components/ui/Button.tsx"];

/**
 * Rotaciones de icono de refresco heredadas (ArrowPathIcon, SyncStatus, etc.).
 * Budget monotono: solo puede decrecer.
 */
const LEGACY_SPIN_BUDGET = 17;

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

const relative = (file: string) => path.relative(frontendRoot, file).split(path.sep).join("/");

describe("Guardrail de spinner unico (spec 031 AC9)", () => {
  it("no existen spinners circulares crudos fuera de LoadingSpinner", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      if (SPIN_ALLOWLIST.includes(relative(file))) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (/animate-spin(?!-)/.test(line) && /rounded-full|border-t-/.test(line)) {
          offenders.push(`${relative(file)}:${index + 1}`);
        }
      });
    }
    expect(
      offenders,
      `Usa components/ui/LoadingSpinner.tsx en lugar de markup de spinner propio:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("el budget de animate-spin heredado solo puede decrecer", () => {
    let count = 0;
    for (const file of sourceFiles) {
      if (SPIN_ALLOWLIST.includes(relative(file))) continue;
      const matches = readFileSync(file, "utf8").match(/animate-spin(?!-)/g);
      count += matches ? matches.length : 0;
    }
    expect(
      count,
      ` animate-spin fuera de LoadingSpinner/Button (${count}) supera el budget (${LEGACY_SPIN_BUDGET}).`,
    ).toBeLessThanOrEqual(LEGACY_SPIN_BUDGET);
  });

  it("los componentes de carga comparten la primitiva LoadingSpinner", () => {
    for (const relPath of [
      "src/components/ui/LoadingOverlay.tsx",
      "src/components/ui/InitialSyncOverlay.tsx",
      "src/components/ui/BackgroundActivitySpinner.tsx",
    ]) {
      const content = readFileSync(path.join(frontendRoot, relPath), "utf8");
      expect(content, `${relPath} debe usar LoadingSpinner`).toContain("<LoadingSpinner");
    }
  });
});
