import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const src = path.resolve(__dirname, "../src");
const moduleRoot = path.join(src, "modules/holidays");
const applicationRoot = path.join(moduleRoot, "application");

const astCache = new Map<string, ts.SourceFile>();
const contentCache = new Map<string, string>();

function filesUnder(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : file.endsWith(".ts") ? [file] : [];
  });
}

const srcFiles = filesUnder(src).filter(
  (file) => !file.includes(`${path.sep}generated${path.sep}`),
);

const tsConfigModulesParsed = (() => {
  const config = ts.readConfigFile(
    path.resolve(__dirname, "../tsconfig.modules.json"),
    ts.sys.readFile,
  );
  return ts.parseJsonConfigFileContent(config.config, ts.sys, path.resolve(__dirname, ".."));
})();

function getSourceFile(file: string, source: string): ts.SourceFile {
  if (file.includes("fixture.ts")) {
    return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  }
  let tree = astCache.get(file);
  if (!tree) {
    tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    astCache.set(file, tree);
  }
  return tree;
}

function readSource(file: string): string {
  let content = contentCache.get(file);
  if (!content) {
    content = fs.readFileSync(file, "utf8");
    contentCache.set(file, content);
  }
  return content;
}

function inspect(source: string, file: string, name = "holidays"): string[] {
  const moduleRoot = path.join(src, "modules", name);
  const applicationRoot = path.join(moduleRoot, "application");
  const tree = getSourceFile(file, source);
  const violations: string[] = [];
  const application = file.startsWith(applicationRoot + path.sep);
  function dependency(target: string) {
    const resolved = target.startsWith(".") ? path.resolve(path.dirname(file), target) : target;
    if (
      application &&
      !resolved.startsWith(applicationRoot + path.sep) &&
      !(
        [
          "auth",
          "employees",
          "records",
          "shifts",
          "leaves",
          "corrections",
          "shiftReports",
          "kpis",
          "emailReports",
          "configs",
          "notes",
          "meters",
          "importExport",
          "audit",
          "admin",
          "maintenance",
        ].includes(name) &&
        (resolved === path.join(src, "utils/AppError") ||
          (["leaves", "corrections", "shiftReports", "configs", "admin", "maintenance"].includes(
            name,
          ) &&
            resolved === path.join(src, "utils/caughtError")))
      )
    ) {
      violations.push(`application dependency: ${target}`);
    }
    if (
      !file.startsWith(moduleRoot + path.sep) &&
      resolved.startsWith(moduleRoot + path.sep) &&
      resolved !== path.join(moduleRoot, "index") &&
      resolved !== path.join(moduleRoot, "index.ts")
    ) {
      violations.push(`private module import: ${target}`);
    }
  }
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      dependency(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) dependency(argument.text);
      else if (application) violations.push("dynamic dependency");
    }
    if (application) {
      if (ts.isIdentifier(node) && ["process", "fetch"].includes(node.text))
        violations.push(`global effect: ${node.text}`);
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "Date" &&
        !node.arguments?.length
      )
        violations.push("global clock");
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "Date" &&
        node.name.text === "now"
      )
        violations.push("global clock");
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return violations;
}

describe("Holiday module boundaries", () => {
  it("enumerates application files and rejects effects or infrastructure dependencies", () => {
    const files = filesUnder(applicationRoot);
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap((file) => inspect(readSource(file), file))).toEqual([]);
  });

  it("requires external consumers to use the public module entry", () => {
    expect(srcFiles.length).toBeGreaterThan(0);
    expect(srcFiles.flatMap((file) => inspect(readSource(file), file))).toEqual([]);
  });

  it.each([
    'import prisma from "../../../services/db";',
    'import type { Prisma } from "../../../generated/prisma/client";',
    'require("express");',
    'import("fastify");',
    "process.env.DISABLE_HOLIDAY_AUTOSYNC;",
    'fetch("https://example.test");',
    "new Date();",
    "Date.now();",
  ])("rejects representative application violation: %s", (source) => {
    expect(inspect(source, path.join(applicationRoot, "fixture.ts")).length).toBeGreaterThan(0);
  });

  it("detects a consumer importing private module code", () => {
    expect(
      inspect(
        'import { createGetHolidays } from "../modules/holidays/application/getHolidays";',
        path.join(src, "services/fixture.ts"),
      ),
    ).toContain("private module import: ../modules/holidays/application/getHolidays");
  });

  it("enforces strict module checking as part of backend validation", () => {
    const config = ts.readConfigFile(
      path.resolve(__dirname, "../tsconfig.holidays.json"),
      ts.sys.readFile,
    );
    expect(config.error).toBeUndefined();
    expect(config.config.compilerOptions.strict).toBe(true);
    expect(config.config.compilerOptions.noImplicitAny).toBe(true);
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      path.resolve(__dirname, ".."),
    );
    const files = filesUnder(moduleRoot);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((file) => parsed.fileNames.includes(file))).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
    expect(pkg.scripts.check).toContain("check:holidays");
    expect(pkg.scripts["check:holidays"]).toContain("tsconfig.holidays.json");
  });
});

describe("Auth module boundaries", () => {
  it("keeps application independent of infrastructure and consumers on public index", () => {
    expect(
      srcFiles.filter((file) => file.includes("modules/auth/application")).length,
    ).toBeGreaterThan(0);
    expect(srcFiles.flatMap((file) => inspect(readSource(file), file, "auth"))).toEqual([]);
  });
  it.each([
    'import prisma from "../../../services/db";',
    'import("fastify");',
    "Date.now();",
    "process.env.JWT_SECRET;",
  ])("rejects auth application effect %s", (source) => {
    expect(
      inspect(source, path.join(src, "modules/auth/application/fixture.ts"), "auth").length,
    ).toBeGreaterThan(0);
  });
  it("rejects private auth import from a consumer", () => {
    expect(
      inspect(
        'import { createAuthFlows } from "../modules/auth/application/flows";',
        path.join(src, "services/fixture.ts"),
        "auth",
      ),
    ).toContain("private module import: ../modules/auth/application/flows");
  });
});

describe("Users projection module boundaries", () => {
  it("enumerates a pure application and requires public index consumers", () => {
    const applicationFiles = filesUnder(path.join(src, "modules/users/application"));
    expect(applicationFiles.length).toBeGreaterThan(0);
    expect(srcFiles.flatMap((file) => inspect(readSource(file), file, "users"))).toEqual([]);
    expect(applicationFiles.every((file) => tsConfigModulesParsed.fileNames.includes(file))).toBe(
      true,
    );
  });
  it.each(['import prisma from "../../../services/db";', 'import("fastify");', "Date.now();"])(
    "rejects users projection dependency/effect: %s",
    (source) => {
      expect(
        inspect(source, path.join(src, "modules/users/application/fixture.ts"), "users").length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects private projection imports", () => {
    expect(
      inspect(
        'import { toPublicUser } from "../modules/users/application/publicUser";',
        path.join(src, "services/fixture.ts"),
        "users",
      ),
    ).toContain("private module import: ../modules/users/application/publicUser");
  });
});
describe("Employees module boundaries", () => {
  it("enumerates a pure application and requires public index consumers", () => {
    const applicationFiles = filesUnder(path.join(src, "modules/employees/application"));
    expect(applicationFiles.length).toBeGreaterThan(0);
    expect(srcFiles.flatMap((file) => inspect(readSource(file), file, "employees"))).toEqual([]);
    expect(applicationFiles.every((file) => tsConfigModulesParsed.fileNames.includes(file))).toBe(
      true,
    );
  });
  it.each(['import prisma from "../../../services/db";', 'import("fastify");', "Date.now();"])(
    "rejects employees application dependency/effect: %s",
    (source) => {
      expect(
        inspect(source, path.join(src, "modules/employees/application/fixture.ts"), "employees")
          .length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects private employees imports", () => {
    expect(
      inspect(
        'import { createEmployeeFlows } from "../modules/employees/application/flows";',
        path.join(src, "services/fixture.ts"),
        "employees",
      ),
    ).toContain("private module import: ../modules/employees/application/flows");
  });
});
describe("Records module boundaries", () => {
  it("enumerates a pure application and requires public index consumers", () => {
    const applicationFiles = filesUnder(path.join(src, "modules/records/application"));
    expect(applicationFiles.length).toBeGreaterThan(0);
    expect(srcFiles.flatMap((file) => inspect(readSource(file), file, "records"))).toEqual([]);
    expect(applicationFiles.every((file) => tsConfigModulesParsed.fileNames.includes(file))).toBe(
      true,
    );
  });
  it.each(['import prisma from "../../../services/db";', 'import("fastify");', "Date.now();"])(
    "rejects records application dependency/effect: %s",
    (source) => {
      expect(
        inspect(source, path.join(src, "modules/records/application/fixture.ts"), "records").length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects private records imports", () => {
    expect(
      inspect(
        'import { createRecordFlows } from "../modules/records/application/flows";',
        path.join(src, "services/fixture.ts"),
        "records",
      ),
    ).toContain("private module import: ../modules/records/application/flows");
  });
});
describe("Shifts module boundaries", () => {
  it("enumerates a pure application and requires public index consumers", () => {
    const applicationFiles = filesUnder(path.join(src, "modules/shifts/application"));
    expect(applicationFiles.length).toBeGreaterThan(0);
    expect(srcFiles.flatMap((file) => inspect(readSource(file), file, "shifts"))).toEqual([]);
    expect(applicationFiles.every((file) => tsConfigModulesParsed.fileNames.includes(file))).toBe(
      true,
    );
  });
  it.each(['import prisma from "../../../services/db";', 'import("fastify");', "Date.now();"])(
    "rejects shifts application dependency/effect: %s",
    (source) => {
      expect(
        inspect(source, path.join(src, "modules/shifts/application/fixture.ts"), "shifts").length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects private shifts imports", () => {
    expect(
      inspect(
        'import { createShiftFlows } from "../modules/shifts/application/flows";',
        path.join(src, "services/fixture.ts"),
        "shifts",
      ),
    ).toContain("private module import: ../modules/shifts/application/flows");
  });
});

describe.each([
  "leaves",
  "corrections",
  "shiftReports",
  "kpis",
  "emailReports",
  "meters",
  "importExport",
  "audit",
  "admin",
  "maintenance",
  "runtime",
  "realtime",
  "notes",
  "configs",
])("%s module boundaries", (name) => {
  it("enumerates pure application, public consumers and strict files", () => {
    const applicationFiles = filesUnder(path.join(src, "modules", name, "application"));
    expect(applicationFiles.length).toBeGreaterThan(0);
    expect(srcFiles.flatMap((file) => inspect(readSource(file), file, name))).toEqual([]);
    expect(applicationFiles.every((file) => tsConfigModulesParsed.fileNames.includes(file))).toBe(
      true,
    );
  });
  it.each([
    'import prisma from "../../../services/db";',
    'import("fastify");',
    "Date.now();",
    "process.env.JWT_SECRET;",
  ])("rejects infrastructure %s", (source) => {
    expect(
      inspect(source, path.join(src, "modules", name, "application/fixture.ts"), name).length,
    ).toBeGreaterThan(0);
  });
  it("rejects private consumers", () => {
    expect(
      inspect(
        `import { flow } from "../modules/${name}/application/flows";`,
        path.join(src, "services/fixture.ts"),
        name,
      ),
    ).toContain(`private module import: ../modules/${name}/application/flows`);
  });
});
