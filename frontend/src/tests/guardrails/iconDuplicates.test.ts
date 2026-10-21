import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T10 (AC6): el barrel de iconos no debe contener glifos duplicados.
 *
 * Cada archivo de `src/components/ui/icons/` define un icono. Si dos archivos
 * distintos definen exactamente el mismo trazo (viewBox + paths), son el mismo
 * icono duplicado: se fusiona en uno solo (CloseIcon/XMarkIcon fue el caso
 * documentado en el ADR-0022).
 *
 * La deteccion se hace por contenido, no por nombre, para que un duplicado
 * renombrado tambien se detecte.
 */

const ICONS_DIR = path.resolve(__dirname, "../../components/ui/icons");

function readIconFiles(): string[] {
  return readdirSync(ICONS_DIR)
    .filter((file) => file.endsWith(".tsx") && !file.includes(".spec."))
    .sort();
}

function glyphSignature(content: string): string | null {
  const viewBox = content.match(/viewBox="([^"]+)"/)?.[1];
  const paths = [...content.matchAll(/d="([^"]+)"/g)].map((match) => match[1].trim());
  if (!viewBox || paths.length === 0) return null;
  return `${viewBox}|${paths.join("~")}`;
}

describe("Guardrail de iconos duplicados (spec 031 AC6)", () => {
  it("no existen dos iconos con el mismo trazo en el barrel", () => {
    const files = readIconFiles();
    const bySignature = new Map<string, string[]>();

    for (const file of files) {
      const content = readFileSync(path.join(ICONS_DIR, file), "utf8");
      const signature = glyphSignature(content);
      if (!signature) continue;
      const group = bySignature.get(signature) ?? [];
      group.push(file);
      bySignature.set(signature, group);
    }

    const duplicates = [...bySignature.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([signature, group]) => ({
        files: group,
        glyph: signature.slice(0, 60),
      }));

    expect(
      duplicates,
      `Iconos duplicados: fusiona los glifos en un solo componente del barrel.\n${JSON.stringify(duplicates, null, 2)}`,
    ).toEqual([]);
  });

  it("el barrel exporta cada archivo sin duplicar simbolos", () => {
    const barrel = readFileSync(path.join(ICONS_DIR, "index.ts"), "utf8");
    const exports = [...barrel.matchAll(/export \* from "\.\/([A-Za-z0-9]+)"/g)].map(
      (match) => match[1],
    );

    expect(new Set(exports).size).toBe(exports.length);

    const files = readIconFiles().map((file) => file.replace(/\.tsx$/, ""));
    const missing = files.filter((file) => !exports.includes(file));
    expect(missing, `Archivos de icono sin exportar en el barrel: ${missing.join(", ")}`).toEqual(
      [],
    );
  });
});
