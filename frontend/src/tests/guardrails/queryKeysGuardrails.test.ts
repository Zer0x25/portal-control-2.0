import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { PERSISTED_QUERY_ROOTS, SENSITIVE_QUERY_ROOTS } from "../../lib/queryCache";
import { QUERY_ROOTS } from "../../lib/queryKeys";

/**
 * Spec 034, T25 (AC8): **toda** raíz de query usada en el código está
 * clasificada.
 *
 * - La clasificación es una **allowlist positiva** (`PERSISTED_QUERY_ROOTS` /
 *   `SENSITIVE_QUERY_ROOTS`): una raíz nueva queda fuera de la persistencia
 *   hasta que se declare de forma explícita.
 * - Las claves no se escriben como arrays literales: se toman de la tabla
 *   canónica `src/lib/queryKeys.ts`. Este guardrail lo verifica con el
 *   **AST** (no regex) para que un literal disfrazado no se escape.
 */

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");

const listFiles = (dir: string, predicate: (file: string) => boolean): string[] => {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, predicate));
    else if (predicate(entry.name)) out.push(full);
  }
  return out;
};

const parse = (filePath: string): ts.SourceFile =>
  ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

const walk = (node: ts.Node, visit: (node: ts.Node) => void): void => {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
};

const relative = (file: string): string =>
  path.relative(FRONTEND_ROOT, file).split(path.sep).join("/");

/** Ficheros de produccion (sin tests ni la propia tabla canonica). */
const productionFiles = (): string[] =>
  listFiles(SRC_ROOT, (name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .filter((file) => !relative(file).startsWith("src/tests/"))
    .filter((file) => relative(file) !== "src/lib/queryKeys.ts")
    .sort();

/** Metodos del cliente de queries que reciben una clave. */
const QUERY_KEY_METHODS = new Set([
  "invalidateQueries",
  "setQueryData",
  "removeQueries",
  "getQueryData",
  "resetQueries",
  "setQueriesData",
  "prefetchQuery",
  "fetchQuery",
  "ensureQueryData",
]);

/** Raices escritas como array literal en una posicion de clave de query. */
const literalQueryRoots = (sourceFile: ts.SourceFile): string[] => {
  const roots: string[] = [];

  const collect = (node: ts.Node): void => {
    if (ts.isArrayLiteralExpression(node) && node.elements.length > 0) {
      const first = node.elements[0];
      if (ts.isStringLiteral(first)) roots.push(first.text);
    }
  };

  walk(sourceFile, (node) => {
    // `queryKey: ["foo", ...]`
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "queryKey" &&
      node.initializer
    ) {
      collect(node.initializer);
      return;
    }

    // `queryClient.invalidateQueries({ queryKey: [...] })` y
    // `queryClient.setQueryData([...], value)`
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (QUERY_KEY_METHODS.has(method) && node.arguments.length > 0) {
        collect(node.arguments[0]);
      }
    }
  });

  return roots;
};

describe("Guardrail de claves de query (spec 034 T25, AC8)", () => {
  it("toda raiz de la tabla canonica esta clasificada", () => {
    const unclassified = QUERY_ROOTS.filter(
      (root) => !PERSISTED_QUERY_ROOTS.includes(root) && !SENSITIVE_QUERY_ROOTS.includes(root),
    );

    expect(
      unclassified,
      "Declara la raiz en PERSISTED_QUERY_ROOTS o SENSITIVE_QUERY_ROOTS: " +
        unclassified.join(", "),
    ).toEqual([]);
  });

  it("el codigo no escribe claves literales: usa la tabla canonica", () => {
    const offenders: string[] = [];
    for (const file of productionFiles()) {
      const sourceFile = parse(file);
      const roots = literalQueryRoots(sourceFile);
      if (roots.length > 0) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(sourceFile.getStart());
        offenders.push(`${relative(file)} (${roots.join(", ")}) linea ${line + 1}`);
      }
    }

    expect(
      offenders,
      "Las claves de query salen de `src/lib/queryKeys.ts`. Offenders: " + offenders.join("; "),
    ).toEqual([]);
  });

  it("las raices retiradas (`calendar`, `reports`) no se usan", () => {
    const retired = ["calendar", "reports"];
    const used = retired.filter((root) => QUERY_ROOTS.includes(root));
    expect(used).toEqual([]);
    expect(PERSISTED_QUERY_ROOTS).not.toContain("calendar");
    expect(PERSISTED_QUERY_ROOTS).not.toContain("reports");
  });

  it("la allowlist y la lista sensible no se solapan", () => {
    const overlap = PERSISTED_QUERY_ROOTS.filter((root) => SENSITIVE_QUERY_ROOTS.includes(root));
    expect(overlap).toEqual([]);
  });
});
