import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * Spec 036 AC7 (T19): los formularios y las tablas dejan de ser una
 * convención recordada y pasan a ser un guardrail ejecutable.
 *
 * (a) Todo fichero que cumple el criterio de inventario del Problema 1 está
 *     en una whitelist explícita con su motivo. El budget es **decreciente**:
 *     `FORM_MANUAL_BUDGET` debe igualar el tamaño de la whitelist, y la
 *     whitelist debe igualar el conjunto detectado (si un formulario migra,
 *     el test falla hasta que se quite de la lista y se baje el budget).
 * (b) Todo componente que declara `sortConfig`/`requestSort` usa la primitiva
 *     de tabla (o `SortableHeader`) o está en la whitelist de excepciones.
 * (c) `SortableHeader` expone `aria-sort` y no quedan `<th>` clicables crudos.
 * (d) Las vistas (`*.view.tsx`) no instancian `useAppForm` ni `useState`.
 *
 * Presupuesto real medido al cierre de la Fase C (2026-10-23): **4** (no 34).
 * La diferencia con el baseline del spec se debe a que la Fase C ya migró 24
 * formularios a `useAppForm`; el detector estricto del AC7 ya no los ve, y de
 * los 10 "no migrados" del spec 5 tampoco cumplen el criterio sintáctico
 * (`GlobalVariablesManager` desapareció con la partición de la spec 033 y los
 * otros delegan el envío en el `<form>` de la capa). Los 2 "invisibles"
 * (`useTimestampEditor`, `useSystemMaintenanceController`) ya están migrados.
 */

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");

/* -------------------------------------------------------------------------- */
/* Helpers de escaneo                                                         */
/* -------------------------------------------------------------------------- */

const listFiles = (dir: string, predicate: (name: string) => boolean): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full, predicate);
    return predicate(name) ? [full] : [];
  });

const relative = (full: string): string => path.relative(FRONTEND_ROOT, full).replaceAll("\\", "/");

const parse = (file: string): ts.SourceFile =>
  ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

const walk = (node: ts.Node, visit: (node: ts.Node) => void): void => {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
};

const isTestFile = (rel: string): boolean =>
  /(^|\/)(tests|__tests__)\//.test(rel) || /\.(test|spec|stories)\.(ts|tsx)$/.test(rel);

const isHookFile = (rel: string): boolean =>
  rel.includes("/hooks/") || rel.startsWith("src/hooks/");

const sourceFiles = (): string[] =>
  listFiles(SRC_ROOT, (name) => name.endsWith(".ts") || name.endsWith(".tsx")).filter(
    (full) => !isTestFile(relative(full)),
  );

const jsxTagName = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string =>
  node.tagName.getText();

/* -------------------------------------------------------------------------- */
/* (a) Inventario de formularios manuales                                     */
/* -------------------------------------------------------------------------- */

const SUBMIT_HANDLERS = [
  "handleSubmit",
  "handleSave",
  "handleVerify",
  "handleAddNote",
  "handleManualSend",
] as const;

const INPUT_FIELDS = [
  "input",
  "textarea",
  "select",
  "Input",
  "Textarea",
  "Select",
  "Checkbox",
  "Switch",
  "NumericKeypad",
  "TimePicker",
  "DatePicker",
] as const;

const callsHook = (source: ts.SourceFile, hook: string): boolean => {
  let found = false;
  walk(source, (node) => {
    if (!ts.isCallExpression(node)) return;
    const expr = node.expression;
    if (ts.isIdentifier(expr) && expr.text === hook) found = true;
    if (
      ts.isPropertyAccessExpression(expr) &&
      ts.isIdentifier(expr.expression) &&
      expr.expression.text === "React" &&
      expr.name.text === hook
    ) {
      found = true;
    }
  });
  return found;
};

const declaresSubmitHandler = (source: ts.SourceFile): boolean => {
  let found = false;
  walk(source, (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (jsxTagName(node) === "form") found = true;
      for (const attr of node.attributes.properties) {
        if (ts.isJsxAttribute(attr) && attr.name.getText() === "onSubmit") found = true;
      }
    }
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      node.name &&
      SUBMIT_HANDLERS.includes(node.name.getText() as (typeof SUBMIT_HANDLERS)[number])
    ) {
      found = true;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      SUBMIT_HANDLERS.includes(node.name.text as (typeof SUBMIT_HANDLERS)[number])
    ) {
      found = true;
    }
  });
  return found;
};

const rendersInputField = (source: ts.SourceFile): boolean => {
  let found = false;
  walk(source, (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (INPUT_FIELDS.includes(jsxTagName(node) as (typeof INPUT_FIELDS)[number])) found = true;
    }
  });
  return found;
};

interface ManualFormEntry {
  file: string;
  reason: string;
}

/**
 * Whitelist explícita de formularios manuales que quedan fuera de la capa
 * `useAppForm`. Cada entrada está justificada; el budget debe bajar cuando
 * una desaparezca de la lista.
 */
const FORM_WHITELIST: readonly ManualFormEntry[] = [
  {
    file: "src/components/ui/TimePickerDialog.tsx",
    reason:
      "Primitiva certificada de selección de hora; no envía payload de negocio ni usa schema de dominio.",
  },
  {
    file: "src/features/communications/hooks/useCommunicationsData.ts",
    reason:
      "Hook de datos del comunicado (IndexedDB + sanitización); `handleSave` persiste el contenido, no mantiene el estado de un formulario de mutación.",
  },
  {
    file: "src/features/employee-management/hooks/useEmployeeManagementData.ts",
    reason:
      "Hook de datos/mutaciones de empleados; el formulario real vive en `EmployeeForm.container` con `useAppForm`.",
  },
  {
    file: "src/features/meters/components/MeterConfigPanel.tsx",
    reason:
      "Editor de filas dinámicas de medidores; evaluado en T18/AC7 y pendiente de refactor fuera del alcance de la spec 036.",
  },
];

/** Budget decreciente: debe coincidir con la whitelist y bajar con ella. */
export const FORM_MANUAL_BUDGET = 4;

const detectManualForms = (): string[] => {
  const detected: string[] = [];
  for (const full of sourceFiles()) {
    const rel = relative(full);
    const hook = isHookFile(rel);
    const component = rel.endsWith(".tsx") && !hook;
    if (!hook && !component) continue;

    const source = parse(full);
    if (!callsHook(source, "useState")) continue;
    if (!declaresSubmitHandler(source)) continue;
    if (component && !rendersInputField(source)) continue;
    detected.push(rel);
  }
  return detected.sort();
};

/* -------------------------------------------------------------------------- */
/* (b) Consumidores de sort y primitiva de tabla                              */
/* -------------------------------------------------------------------------- */

const SORT_PRIMITIVES = [
  "DataTable",
  "SortableHeader",
  "PaginationControls",
  "ReportTable",
] as const;

interface SortException {
  file: string;
  reason: string;
}

const SORT_WHITELIST: readonly SortException[] = [
  {
    file: "src/features/employee-management/views/EmployeeManagement.view.tsx",
    reason:
      "Vista de composición: recibe `requestSort` por props y lo reenvía a `EmployeeListCard`, que usa `SortableHeader`.",
  },
];

const importsPrimitive = (source: ts.SourceFile): boolean => {
  const specifiers = source.statements
    .filter(ts.isImportDeclaration)
    .map((decl) => decl.moduleSpecifier.getText());
  return SORT_PRIMITIVES.some((primitive) =>
    specifiers.some((specifier) => specifier.includes(primitive)),
  );
};

const referencesSort = (source: ts.SourceFile): boolean => {
  let found = false;
  walk(source, (node) => {
    if (ts.isIdentifier(node) && (node.text === "sortConfig" || node.text === "requestSort")) {
      found = true;
    }
  });
  return found;
};

/* -------------------------------------------------------------------------- */
/* (c) aria-sort en cabeceras ordenables                                      */
/* -------------------------------------------------------------------------- */

const hasClickableTh = (source: ts.SourceFile): boolean => {
  let found = false;
  walk(source, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    if (jsxTagName(node) !== "th") return;
    const clickable = node.attributes.properties.some(
      (attr) => ts.isJsxAttribute(attr) && attr.name.getText() === "onClick",
    );
    if (clickable) found = true;
  });
  return found;
};

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("formTableGuardrails (spec 036 AC7)", () => {
  it("(a) todo formulario manual está en la whitelist y el budget no sube", () => {
    const detected = detectManualForms();
    const whitelisted = FORM_WHITELIST.map((entry) => entry.file).sort();

    expect(
      detected,
      "Formularios manuales fuera de la whitelist. Migra a `useAppForm` o justifica la excepción:\n" +
        detected.filter((file) => !whitelisted.includes(file)).join("\n"),
    ).toEqual(whitelisted);

    expect(
      FORM_MANUAL_BUDGET,
      "Baja `FORM_MANUAL_BUDGET` al nuevo conteo cuando la whitelist encoja.",
    ).toBe(detected.length);

    for (const entry of FORM_WHITELIST) {
      expect(entry.reason.trim().length, `${entry.file} necesita un motivo`).toBeGreaterThan(10);
    }
  });

  it("(b) los consumidores de sort usan la primitiva o están en la whitelist", () => {
    const sortedFiles = sourceFiles()
      .filter((full) => relative(full).endsWith(".tsx"))
      .filter((full) => referencesSort(parse(full)))
      .map(relative)
      .sort();

    const exempt = (file: string): boolean => file.endsWith("/SortableHeader.tsx");

    const offenders = sortedFiles.filter(
      (file) =>
        !exempt(file) &&
        !importsPrimitive(parse(path.join(FRONTEND_ROOT, file))) &&
        !SORT_WHITELIST.some((entry) => entry.file === file),
    );

    expect(
      offenders,
      "Tablas ordenables a mano. Usa `DataTable`/`DataTableHeader`/`SortableHeader` o justifica la excepción:\n" +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("(b bis) la whitelist de sort no tiene entradas obsoletas", () => {
    const sortedFiles = sourceFiles()
      .filter((full) => relative(full).endsWith(".tsx"))
      .filter((full) => referencesSort(parse(full)))
      .map(relative);

    const stale = SORT_WHITELIST.map((entry) => entry.file).filter(
      (file) => !sortedFiles.includes(file),
    );
    expect(stale, "Quita de `SORT_WHITELIST` los ficheros que ya no declaran sort").toEqual([]);
  });

  it("(c) SortableHeader expone aria-sort y no quedan th clicables crudos", () => {
    const sortableHeaderPath = path.join(SRC_ROOT, "components/ui/SortableHeader.tsx");
    expect(readFileSync(sortableHeaderPath, "utf8")).toContain("aria-sort");

    const offenders = sourceFiles()
      .filter((full) => relative(full).endsWith(".tsx"))
      .filter((full) => !relative(full).endsWith("/SortableHeader.tsx"))
      .filter((full) => hasClickableTh(parse(full)))
      .map(relative);

    expect(
      offenders,
      "Cabeceras `<th>` con `onClick` a mano. Usa `SortableHeader` (aporta `aria-sort`):\n" +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("(d) las vistas no instancian useAppForm ni useState", () => {
    const offenders = sourceFiles()
      .filter((full) => relative(full).endsWith(".view.tsx"))
      .filter((full) => {
        const source = parse(full);
        return callsHook(source, "useState") || callsHook(source, "useAppForm");
      })
      .map(relative);

    expect(
      offenders,
      "Las vistas son presentacionales puras: mueve el formulario al hook/container:\n" +
        offenders.join("\n"),
    ).toEqual([]);
  });
});
