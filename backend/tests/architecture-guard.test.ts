import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const retired = new Set([
  "express",
  "express-rate-limit",
  "compression",
  "cors",
  "helmet",
  "multer",
  "supertest",
  "swagger-ui-express",
]);
function files(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.name === "generated") return [];
    return entry.isDirectory() ? files(file) : /\.(ts|cjs)$/.test(file) ? [file] : [];
  });
}
it("has no retired Express runtime, adapters, imports or dependencies", () => {
  for (const file of [
    "src/app.ts",
    "src/express-main.ts",
    "src/routes",
    "src/controllers",
    "src/middleware",
  ])
    expect(fs.existsSync(path.join(root, file)), file).toBe(false);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  for (const dependency of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))
    expect(retired.has(dependency.replace(/^@types\//, "")), dependency).toBe(false);
  expect(pkg.scripts).not.toHaveProperty("dev:express");
  const sources = ["src", "tests", "scripts"].flatMap((directory) =>
    files(path.join(root, directory)),
  );
  expect(sources.length).toBeGreaterThan(0);
  const offenders: string[] = [];
  for (const file of sources) {
    const ast = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      let specifier: string | undefined;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
          specifier = node.moduleSpecifier.text;
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require"))
      ) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) specifier = arg.text;
      }
      if (specifier && retired.has(specifier))
        offenders.push(`${path.relative(root, file)}: ${specifier}`);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  expect(offenders).toEqual([]);
});
