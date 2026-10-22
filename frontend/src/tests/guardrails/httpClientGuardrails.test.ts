import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { ApiHttpError, request as apiRequest } from "../../services/apiClient";

/**
 * Spec 034, T24 (AC9): el trafico HTTP del frontend pasa por **un solo**
 * cliente (`src/services/apiClient.ts`).
 *
 * El guardrail usa el **AST de TypeScript** (no regex): `fetch` puede
 * aparecer como texto en un comentario o en un string sin ser una llamada.
 *
 * Dos invariantes:
 * - (a) Cero `fetch(` / `XMLHttpRequest` / `axios` fuera del cliente, con una
 *   whitelist **explícita y congelada** (presupuesto 0).
 * - (b) Todo service que expone operaciones de red usa el cliente y
 *   **propaga** el error: si el `catch` envuelve una llamada HTTP, debe
 *   re-lanzar o devolver un valor de negocio explicito (nunca tragarse el
 *   error en silencio), y el error del cliente lleva `status` numérico.
 */

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");

/* -------------------------------------------------------------------------- */
/* Whitelist congelada                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Ficheros autorizados a hablar HTTP por su cuenta.
 *
 * Es una lista **explícita y congelada**: anadir una entrada es una decision
 * consciente (no un "cero y bajando"). Ningun fichero de `src/` fuera de esta
 * lista puede hacer red.
 */
export const HTTP_CLIENT_WHITELIST: readonly string[] = [
  // El cliente unico: es el unico que habla HTTP con el backend.
  "src/services/apiClient.ts",
  // API **externa** (Open-Meteo): no es el backend del portal.
  "src/hooks/useWeather.ts",
  // Asset estático del manual de usuario (`/ManualRelojControl.md`), cargado por su hook.
  "src/hooks/useUserManual.ts",
] as const;

/* -------------------------------------------------------------------------- */
/* Utilidades de analisis                                                      */
/* -------------------------------------------------------------------------- */

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

/** Ficheros de produccion (sin los tests). */
const productionFiles = (): string[] =>
  listFiles(SRC_ROOT, (name) => name.endsWith(".ts") || name.endsWith(".tsx")).filter(
    (file) => !relative(file).startsWith("src/tests/"),
  );

/** Servicios de `src/services/` (sin el cliente, la base ni el almacen). */
const serviceFiles = (): string[] =>
  listFiles(path.join(SRC_ROOT, "services"), (name) => name.endsWith(".ts"))
    .filter((file) => !file.endsWith(".spec.ts"))
    .filter((file) => {
      const rel = relative(file);
      return rel !== "src/services/apiClient.ts" && rel !== "src/services/apiBase.ts";
    })
    .sort();

/** `fetch(...)` | `axios(...)` / `axios.get(...)` | `new XMLHttpRequest()`. */
const isRawHttpUsage = (node: ts.Node): boolean => {
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
    return node.expression.text === "XMLHttpRequest";
  }
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return callee.text === "fetch" || callee.text === "axios";
  }
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return callee.expression.text === "axios";
  }
  return false;
};

/** Llamada al cliente HTTP del proyecto (`apiRequest(...)`, `apiClient.get(...)`). */
const isHttpClientCall = (node: ts.Node): boolean => {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === "apiRequest";
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return callee.expression.text === "apiClient";
  }
  return false;
};

const hasRawHttp = (sourceFile: ts.SourceFile): boolean => {
  let found = false;
  walk(sourceFile, (node) => {
    if (isRawHttpUsage(node)) found = true;
  });
  return found;
};

const importsHttpClient = (sourceFile: ts.SourceFile): boolean =>
  sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) return false;
    const specifier = statement.moduleSpecifier;
    if (!ts.isStringLiteral(specifier)) return false;
    if (!specifier.text.includes("apiClient")) return false;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) return false;
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      return bindings.elements.some((element) => !element.isTypeOnly);
    }
    return true;
  });

/**
 * `catch` que envuelve una llamada HTTP y que **no** relanza ni devuelve.
 *
 * Es el patron "tragar el error": el service devuelve un valor por defecto y
 * el llamante cree que la operacion fue correcta.
 */
const silentHttpCatches = (sourceFile: ts.SourceFile): string[] => {
  const offenders: string[] = [];
  walk(sourceFile, (node) => {
    if (!ts.isCatchClause(node)) return;
    const block = node.block;
    let wrapsHttp = false;
    walk(block, (child) => {
      if (isHttpClientCall(child)) wrapsHttp = true;
    });
    if (!wrapsHttp) return;

    let propagates = false;
    for (const statement of block.statements) {
      if (ts.isThrowStatement(statement) || ts.isReturnStatement(statement)) {
        propagates = true;
        break;
      }
    }
    if (!propagates) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      offenders.push(`linea ${line + 1}`);
    }
  });
  return offenders;
};

/* -------------------------------------------------------------------------- */
/* Invariantes                                                                 */
/* -------------------------------------------------------------------------- */

describe("Guardrail HTTP: un solo cliente (spec 034 T24, AC9)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(a) cero fetch/XMLHttpRequest/axios fuera de la whitelist (presupuesto 0)", () => {
    const offenders = productionFiles()
      .filter((file) => !HTTP_CLIENT_WHITELIST.includes(relative(file)))
      .filter((file) => hasRawHttp(parse(file)))
      .map(relative);

    expect(
      offenders,
      "El trafico HTTP debe pasar por `src/services/apiClient.ts`. Offenders: " +
        offenders.join(", "),
    ).toEqual([]);
  });

  it("(a) la whitelist sigue siendo la congelada (sin entradas nuevas)", () => {
    expect(HTTP_CLIENT_WHITELIST).toEqual([
      "src/services/apiClient.ts",
      "src/hooks/useWeather.ts",
      "src/hooks/useUserManual.ts",
    ]);
  });

  it("(b) todo service con operaciones de red usa el cliente HTTP", () => {
    const offenders = serviceFiles()
      .filter((file) => {
        const sourceFile = parse(file);
        let usesClient = false;
        walk(sourceFile, (node) => {
          if (isHttpClientCall(node)) usesClient = true;
        });
        return usesClient && !importsHttpClient(sourceFile);
      })
      .map(relative);

    expect(
      offenders,
      "Services que hablan red sin el cliente unico: " + offenders.join(", "),
    ).toEqual([]);
  });

  it("(b) ningun service se traga el error de una llamada HTTP", () => {
    const offenders: string[] = [];
    for (const file of serviceFiles()) {
      const silent = silentHttpCatches(parse(file));
      if (silent.length > 0) offenders.push(`${relative(file)} (${silent.join(", ")})`);
    }

    expect(
      offenders,
      "Un `catch` que envuelve una llamada HTTP debe relanzar o devolver un valor de negocio " +
        "explicito. Offenders: " +
        offenders.join("; "),
    ).toEqual([]);
  });

  it("(b) el error del cliente lleva `status` numerico", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "boom" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const error = await apiRequest({ method: "GET", url: "/api/users" as never }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiHttpError);
    expect(typeof (error as ApiHttpError).status).toBe("number");
    expect((error as ApiHttpError).status).toBe(400);
    expect((error as ApiHttpError).message).toBe("boom");
  });
});
