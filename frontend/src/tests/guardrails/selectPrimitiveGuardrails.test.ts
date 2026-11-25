import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Guardrail de desplegables (select).
 *
 * Los `<select>` crudos con `appearance-none` se habían multiplicado con
 * clases ad-hoc: unos sin chevron (KPIs, reportes), otros con `rounded-xl`,
 * otros con `bg-token-surface-stripe` y alturas de 38.5 px. La primitiva
 * canónica es `FilterSelect`; este guardrail congela la lista de archivos
 * autorizados a renderizar un `<select>` nativo.
 */

const SRC_DIR = path.resolve(__dirname, "../../../src");

/** Único lugar autorizado para renderizar un `<select>` nativo. */
const SELECT_OWNER_WHITELIST: readonly string[] = [
  "components/ui/FilterSelect.tsx",
  "components/ui/Select.tsx",
];

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests") return [];
      return listSourceFiles(fullPath);
    }
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec|stories)\.ts?x?$/.test(entry.name)
      ? [fullPath]
      : [];
  });

describe("Select Guardrails", () => {
  it("prohíbe <select> nativo fuera de las primitivas canónicas", () => {
    const offenders = listSourceFiles(SRC_DIR)
      .filter((fullPath) => {
        const relPath = path.relative(SRC_DIR, fullPath).split(path.sep).join("/");
        if (SELECT_OWNER_WHITELIST.includes(relPath)) return false;
        return /<select\b/.test(readFileSync(fullPath, "utf8"));
      })
      .map((fullPath) => path.relative(SRC_DIR, fullPath).split(path.sep).join("/"));

    expect(
      offenders,
      `Select nativo fuera de FilterSelect/Select. Usa FilterSelect de src/components/ui/FilterSelect.tsx:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("mantiene la altura táctil mínima de 44 px en FilterSelect", () => {
    const source = readFileSync(path.join(SRC_DIR, "components/ui/FilterSelect.tsx"), "utf8");

    expect(source).toContain("h-[44px]");
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("appearance-none");
    expect(source).toContain("rounded-md");
  });

  /**
   * El popup nativo de `<option>` no resuelve tokens semánticos: sin
   * `color-scheme` y sin fondo opaco explícito, el modo oscuro pintaba
   * texto claro sobre el blanco por defecto del sistema.
   */
  it("declara color-scheme por tema y superficie opaca para <option>", () => {
    const css = readFileSync(path.join(SRC_DIR, "index.css"), "utf8");

    expect(css).toMatch(/:root\s*\{[^}]*color-scheme:\s*light/s);
    expect(css).toMatch(/\.dark\s*\{[^}]*color-scheme:\s*dark/s);
    expect(css).toMatch(
      /select\s*>\s*option[^{]*\{[^}]*background-color:\s*var\(--color-token-surface-card\)/s,
    );
    expect(css).toMatch(
      /select\s*>\s*option[^{]*\{[^}]*color:\s*var\(--color-token-text-primary\)/s,
    );
  });
});
