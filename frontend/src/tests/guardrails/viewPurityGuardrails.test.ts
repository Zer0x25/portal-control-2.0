import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { ESLint } from "eslint";

/**
 * Spec 033 T3-T5 (AC1, AC2, AC3, AC6, AC11): la frontera de capas es
 * **enforceable**, no declarativa.
 *
 * Este guardrail usa el **AST de TypeScript** (no expresiones regulares): un
 * regex no distingue `useRef<number | null>(null)` de una llamada simple, y
 * esa diferencia cambia el conteo de vistas y componentes con hooks.
 *
 * Los budgets están **congelados en constantes exportadas**: el test falla si
 * el conteo actual **supera** el budget y bajar el budget nunca exige editar
 * el test (se acepta `conteo_actual <= budget`).
 *
 * Alcance del escaneo de la capa de componentes:
 * `src/features/**\/components/**` y `src/components/ui/**`, excluyendo los
 * `*.view.tsx` (budget propio) y los `*.container.tsx` (invariantes propios).
 */

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");

/* -------------------------------------------------------------------------- */
/* Budgets congelados (spec 033 AC2/AC3)                                      */
/* -------------------------------------------------------------------------- */

/** Vistas (`*.view.tsx`) que llaman a un hook. Baseline medido: 5 -> 1 tras T7. */
export const VIEW_HOOK_BUDGET = 1;

/** Componentes de la capa de componentes que llaman a un hook **con estado**. */
export const HOOKED_COMPONENT_BUDGET = 90;

/** Componentes con hooks, >150 líneas y sin container/view gemelo. */
export const LARGE_HOOKED_COMPONENT_BUDGET = 54;

/** Componentes que importan `services/` **por valor** (los `import type` valen). */
export const SERVICE_IMPORT_BUDGET = 8;

/** Llamadas a `fetch` crudo dentro de la capa de componentes. */
export const RAW_FETCH_BUDGET = 3;

/** `queryClient.invalidateQueries` inline (debe vivir en un hook de mutación). */
export const INLINE_CACHE_INVALIDATION_BUDGET = 1;

/** Shims de 1-3 líneas en `features/**\/components/**` que re-exportan un container. */
export const CONTAINER_SHIM_BUDGET = 9;

/** Pages-wrapper de 1-3 líneas que solo re-exportan un container. */
export const PAGE_WRAPPER_BUDGET = 1;

/** Un container devuelve exactamente **un** elemento JSX de primer nivel. */
export const CONTAINER_SINGLE_ROOT_BUDGET = 0;

/** Un container no emite elementos DOM intrínsecos. */
export const CONTAINER_INTRINSIC_JSX_BUDGET = 0;

/* -------------------------------------------------------------------------- */
/* Utilidades de análisis                                                    */
/* -------------------------------------------------------------------------- */

const HOOK_NAME = /^use[A-Z]/;

/**
 * Hooks **puros**: no gestionan estado, no disparan efectos ni re-renderizan.
 *
 * `useId()` genera un identificador estable para asociar `label`,
 * `aria-describedby` y el mensaje de error de un control: es exactamente lo
 * que exige el contrato de a11y de error (spec 036 AC3) y lo usan ya
 * `Select` y `Checkbox`. Contarlo como "componente con estado" sería un falso
 * positivo: el invariante que este guardrail protege (spec 033 AC2) es que la
 * capa de componentes **no gestione estado**.
 *
 * La exclusión es explícita y acotada: si mañana aparece un hook puro nuevo,
 * hay que añadirlo aquí (y el conteo sube, que es lo que se quiere ver).
 */
const PURE_HOOK_NAMES = new Set(["useId"]);

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

/** Parsea un fragmento de codigo (sondas del propio guardrail). */
const parseSource = (code: string, fileName = "probe.tsx"): ts.SourceFile =>
  ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const isHookCallee = (callee: ts.Expression): boolean => {
  if (ts.isIdentifier(callee)) return HOOK_NAME.test(callee.text) || callee.text === "use";
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "React"
  ) {
    return HOOK_NAME.test(callee.name.text);
  }
  return false;
};

/** `true` si el callee es un hook **puro** (`useId`). */
const isPureHookCallee = (callee: ts.Expression): boolean => {
  if (ts.isIdentifier(callee)) return PURE_HOOK_NAMES.has(callee.text);
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "React"
  ) {
    return PURE_HOOK_NAMES.has(callee.name.text);
  }
  return false;
};

const walk = (node: ts.Node, visit: (node: ts.Node) => void): void => {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
};

const hasHookCall = (sourceFile: ts.SourceFile): boolean => {
  let found = false;
  walk(sourceFile, (node) => {
    if (ts.isCallExpression(node) && isHookCallee(node.expression)) found = true;
  });
  return found;
};

/**
 * `true` si el componente llama a un hook **con estado** (los hooks puros como
 * `useId` no cuentan: ver `PURE_HOOK_NAMES`).
 */
const hasStateHookCall = (sourceFile: ts.SourceFile): boolean => {
  let found = false;
  walk(sourceFile, (node) => {
    if (
      ts.isCallExpression(node) &&
      isHookCallee(node.expression) &&
      !isPureHookCallee(node.expression)
    ) {
      found = true;
    }
  });
  return found;
};

const hasCallTo = (
  sourceFile: ts.SourceFile,
  matches: (callee: ts.Expression) => boolean,
): boolean => {
  let found = false;
  walk(sourceFile, (node) => {
    if (ts.isCallExpression(node) && matches(node.expression)) found = true;
  });
  return found;
};

const isRawFetch = (callee: ts.Expression): boolean =>
  ts.isIdentifier(callee) && callee.text === "fetch";

const isInvalidateQueries = (callee: ts.Expression): boolean =>
  ts.isPropertyAccessExpression(callee) && callee.name.text === "invalidateQueries";

/** Import por **valor** de un modulo de `services/` (los `import type` valen). */
const importsServiceByValue = (sourceFile: ts.SourceFile): boolean =>
  sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) return false;
    if (!modulePath(statement.moduleSpecifier).includes("/services/")) return false;
    const clause = statement.importClause;
    if (!clause) return false;
    if (clause.isTypeOnly) return false;
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      return bindings.elements.some((element) => !element.isTypeOnly);
    }
    return true;
  });

/** Path del modulo importado (solo literales de cadena). */
const modulePath = (specifier: ts.Expression): string =>
  ts.isStringLiteral(specifier) ? specifier.text : "";

const lineCount = (filePath: string): number =>
  readFileSync(filePath, "utf8").split("\n").length - 1;

/* -------------------------------------------------------------------------- */
/* Inventarios                                                                */
/* -------------------------------------------------------------------------- */

const viewFiles = (): string[] => listFiles(SRC_ROOT, (name) => name.endsWith(".view.tsx"));

const componentLayerFiles = (): string[] => {
  const inFeatures = listFiles(path.join(SRC_ROOT, "features"), (name) =>
    name.endsWith(".tsx"),
  ).filter((file) => file.split(path.sep).includes("components"));
  const inUi = listFiles(path.join(SRC_ROOT, "components", "ui"), (name) => name.endsWith(".tsx"));
  return [...new Set([...inFeatures, ...inUi])]
    .filter((file) => !file.endsWith(".view.tsx") && !file.endsWith(".container.tsx"))
    .sort();
};

const containerFiles = (): string[] =>
  listFiles(SRC_ROOT, (name) => name.endsWith(".container.tsx")).sort();

const relative = (file: string): string => path.relative(FRONTEND_ROOT, file);

/* -------------------------------------------------------------------------- */
/* Invariantes de composición de un container (AC1/AC4)                       */
/* -------------------------------------------------------------------------- */

const unwrapParens = (expression: ts.Expression): ts.Expression => {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
};

/** Funciones de **primer nivel** del modulo (el container, no sus callbacks). */
const outermostFunctions = (sourceFile: ts.SourceFile): ts.FunctionLikeDeclaration[] => {
  const found: ts.FunctionLikeDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      found.push(node);
      return; // no se descends: es de primer nivel
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};

const meaningfulJsxChildren = (fragment: ts.JsxFragment): readonly ts.JsxChild[] =>
  fragment.children.filter((child) => !ts.isJsxText(child) || child.text.trim() !== "");

/**
 * `true` si el container cumple "un único elemento JSX de primer nivel".
 *
 * Solo cuentan los `return` **directos del cuerpo de la funcion**: un
 * `return null` de salida temprana es legitimo, igual que los `return` de
 * un callback anidado (no son el retorno del container).
 */
const hasSingleJsxRoot = (sourceFile: ts.SourceFile): boolean => {
  const functions = outermostFunctions(sourceFile);
  let jsxRoots = 0;
  for (const fn of functions) {
    const body = fn.body;
    if (!body || !ts.isBlock(body)) continue;
    for (const statement of body.statements) {
      if (!ts.isReturnStatement(statement) || !statement.expression) continue;
      const root = unwrapParens(statement.expression);
      if (ts.isJsxElement(root) || ts.isJsxSelfClosingElement(root)) {
        jsxRoots += 1;
        continue;
      }
      if (ts.isJsxFragment(root)) {
        if (meaningfulJsxChildren(root).length !== 1) return false;
        jsxRoots += 1;
        continue;
      }
      // Salida temprana (`return null`) permitida; cualquier otra expresion no.
      if (
        root.kind !== ts.SyntaxKind.NullKeyword &&
        root.kind !== ts.SyntaxKind.TrueKeyword &&
        root.kind !== ts.SyntaxKind.FalseKeyword
      ) {
        return false;
      }
    }
  }
  return jsxRoots > 0;
};

/** `true` si el container no emite elementos DOM intrínsecos (`<div>`, ...). */
const hasNoIntrinsicJsx = (sourceFile: ts.SourceFile): boolean => {
  let clean = true;
  walk(sourceFile, (node) => {
    if (!ts.isJsxOpeningElement(node)) return;
    const name = node.tagName;
    if (ts.isIdentifier(name) && /^[a-z]/.test(name.text)) clean = false;
  });
  return clean;
};

/* -------------------------------------------------------------------------- */
/* Shims y pages-wrapper (AC6)                                                */
/* -------------------------------------------------------------------------- */

/** Un fichero de 1-3 líneas cuyo único proposito es re-exportar un container. */
const isContainerReexport = (filePath: string): boolean => {
  if (lineCount(filePath) > 3) return false;
  const sourceFile = parse(filePath);
  if (sourceFile.statements.length === 0) return false;
  return sourceFile.statements.every((statement) => {
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      return modulePath(statement.moduleSpecifier).includes(".container");
    }
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      return modulePath(statement.moduleSpecifier).includes(".container");
    }
    if (ts.isExportAssignment(statement)) return true;
    return false;
  });
};

const shimFiles = (dir: string): string[] =>
  listFiles(dir, (name) => name.endsWith(".tsx") || name.endsWith(".ts"))
    .filter((file) => isContainerReexport(file))
    .sort();

/* -------------------------------------------------------------------------- */
/* Sonda negativa: la regla de ESLint tiene que disparar                      */
/* -------------------------------------------------------------------------- */

/**
 * Instancia compartida de ESLint.
 *
 * Cada `new ESLint()` resuelve la flat config completa (con el parser de
 * TypeScript): hacerlo por sonda multiplicaba el coste de arranque del
 * guardrail. La instancia es perezosa y se reutiliza en las 3 sondas.
 */
let eslintInstance: ESLint | null = null;

const getEslint = (): ESLint => {
  eslintInstance ??= new ESLint({ cwd: FRONTEND_ROOT });
  return eslintInstance;
};

const lintProbe = async (code: string, filePath: string): Promise<string[]> => {
  const [result] = await getEslint().lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId ?? "unknown");
};

/** Timeout de las sondas: resolver la flat config de ESLint no es instantáneo. */
const PROBE_TIMEOUT_MS = 60000;

describe("Guardrail de pureza de la vista (spec 033 T3-T5, AC1/AC2/AC3/AC6/AC11)", () => {
  it("ninguna vista llama a un hook (spec 033 AC1)", () => {
    const offenders = viewFiles()
      .filter((file) => hasHookCall(parse(file)))
      .map(relative);

    expect(
      offenders.length,
      "Las vistas (*.view.tsx) son presentacional puro: el estado va al container o a un hook de dominio. Offenders: " +
        offenders.join(", "),
    ).toBeLessThanOrEqual(VIEW_HOOK_BUDGET);
  });

  it("la capa de componentes no crece en numero de componentes con estado (spec 033 AC2)", () => {
    const offenders = componentLayerFiles()
      .filter((file) => hasStateHookCall(parse(file)))
      .map(relative);

    expect(
      offenders.length,
      "La capa de componentes mezcla estado y presentación. Offenders: " + offenders.join(", "),
    ).toBeLessThanOrEqual(HOOKED_COMPONENT_BUDGET);
  });

  it("el ratchet de componentes grandes con estado no sube (spec 033 AC3)", () => {
    const offenders = componentLayerFiles()
      .filter((file) => hasStateHookCall(parse(file)))
      .filter((file) => {
        if (lineCount(file) <= 150) return false;
        const dir = path.dirname(file);
        const stem = path.basename(file, path.extname(file));
        const hasTwin =
          listFiles(dir, (name) => name === `${stem}.container.tsx`).length > 0 ||
          listFiles(dir, (name) => name === `${stem}.view.tsx`).length > 0;
        return !hasTwin;
      })
      .map(relative);

    expect(
      offenders.length,
      "Componentes con hooks y >150 líneas sin container/view gemelo: " + offenders.join(", "),
    ).toBeLessThanOrEqual(LARGE_HOOKED_COMPONENT_BUDGET);
  });

  it("ningun componente importa services/ por valor (spec 033 AC11)", () => {
    const offenders = componentLayerFiles()
      .filter((file) => importsServiceByValue(parse(file)))
      .map(relative);

    expect(
      offenders.length,
      "Los imports de valor de services/ van al hook de dominio. Offenders: " +
        offenders.join(", "),
    ).toBeLessThanOrEqual(SERVICE_IMPORT_BUDGET);
  });

  it("ningun componente hace fetch crudo (spec 033 AC2)", () => {
    const offenders = componentLayerFiles()
      .filter((file) => hasCallTo(parse(file), isRawFetch))
      .map(relative);

    expect(
      offenders.length,
      "El fetch crudo va a un hook de dominio. Offenders: " + offenders.join(", "),
    ).toBeLessThanOrEqual(RAW_FETCH_BUDGET);
  });

  it("ningun componente invalida la cache inline (spec 033 AC2)", () => {
    const offenders = componentLayerFiles()
      .filter((file) => hasCallTo(parse(file), isInvalidateQueries))
      .map(relative);

    expect(
      offenders.length,
      "queryClient.invalidateQueries inline va a un hook de mutación. Offenders: " +
        offenders.join(", "),
    ).toBeLessThanOrEqual(INLINE_CACHE_INVALIDATION_BUDGET);
  });

  it("no hay shims que re-exportan un container (spec 033 AC6)", () => {
    const offenders = shimFiles(path.join(SRC_ROOT, "features")).filter((file) =>
      file.split(path.sep).includes("components"),
    );

    expect(
      offenders.length,
      "Los shims de components/ que re-exportan un container sobran: " +
        offenders.map(relative).join(", "),
    ).toBeLessThanOrEqual(CONTAINER_SHIM_BUDGET);
  });

  it("no hay pages que solo re-exportan un container (spec 033 AC6)", () => {
    const offenders = shimFiles(path.join(SRC_ROOT, "features")).filter((file) =>
      file.split(path.sep).includes("pages"),
    );

    expect(
      offenders.length,
      "Las pages que solo re-exportan un container sobran: " + offenders.map(relative).join(", "),
    ).toBeLessThanOrEqual(PAGE_WRAPPER_BUDGET);
  });

  it("cada container devuelve un único elemento JSX de primer nivel (spec 033 AC1/AC4)", () => {
    const offenders = containerFiles()
      .filter((file) => !hasSingleJsxRoot(parse(file)))
      .map(relative);

    expect(
      offenders.length,
      "Un container orquesta y devuelve la vista: un solo elemento JSX de primer nivel. Offenders: " +
        offenders.join(", "),
    ).toBeLessThanOrEqual(CONTAINER_SINGLE_ROOT_BUDGET);
  });

  it("ningun container emite JSX de presentación (spec 033 AC1/AC4)", () => {
    const offenders = containerFiles()
      .filter((file) => !hasNoIntrinsicJsx(parse(file)))
      .map(relative);

    expect(
      offenders.length,
      "Un container no emite elementos DOM intrínsecos. Offenders: " + offenders.join(", "),
    ).toBeLessThanOrEqual(CONTAINER_INTRINSIC_JSX_BUDGET);
  });

  it("un hook puro (useId) no cuenta como componente con estado (spec 036 AC3)", () => {
    const pure = parseSource(
      "export const Probe = () => { const id = useId(); return <div>{id}</div>; };",
    );
    const stateful = parseSource(
      "export const Probe = () => { const [a] = useState(0); return <div>{a}</div>; };",
    );

    expect(hasHookCall(pure)).toBe(true);
    expect(hasStateHookCall(pure)).toBe(false);
    expect(hasStateHookCall(stateful)).toBe(true);
  });

  it(
    "la regla de ESLint de hooks en vistas dispara (sonda negativa, spec 033 T1)",
    async () => {
      const rules = await lintProbe(
        "export const Probe = () => { const [a] = React.useState(0); return <div>{a}</div>; };",
        "src/__view_purity_probe__.view.tsx",
      );

      expect(rules).toContain("no-restricted-syntax");
    },
    PROBE_TIMEOUT_MS,
  );

  it(
    "la regla de ESLint de JSX en containers dispara (sonda negativa, spec 033 T2)",
    async () => {
      const rules = await lintProbe(
        'export const Probe = () => <div className="x">hola</div>;',
        "src/__view_purity_probe__.container.tsx",
      );

      expect(rules).toContain("no-restricted-syntax");
    },
    PROBE_TIMEOUT_MS,
  );

  it(
    "una vista sin hooks no es reportada por la regla (sonda positiva, spec 033 T1)",
    async () => {
      const rules = await lintProbe(
        "export const Probe = () => <div>ok</div>;",
        "src/__view_purity_probe__.view.tsx",
      );

      expect(rules).not.toContain("no-restricted-syntax");
    },
    PROBE_TIMEOUT_MS,
  );
});
