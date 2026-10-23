import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(frontendRoot, "src");
const compilerLogArg = process.argv.find((argument) => argument.startsWith("--compiler-log="));
const compilerLogPath = compilerLogArg
  ? resolve(process.cwd(), compilerLogArg.slice("--compiler-log=".length))
  : undefined;
const verbose = process.argv.includes("--verbose");

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const filePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "tests" || entry.name === "__tests__") return [];
        return walk(filePath);
      }
      return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)
        ? [filePath]
        : [];
    }),
  );
  return nested.flat();
};

const getCallKind = (call) => {
  const callee = call.expression;
  if (ts.isIdentifier(callee) && ["useMemo", "useCallback", "memo"].includes(callee.text)) {
    return callee.text;
  }
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    if (callee.expression.text === "React" && callee.name.text === "memo") return "memo";
    if (
      callee.expression.text === "React" &&
      ["useMemo", "useCallback"].includes(callee.name.text)
    ) {
      return callee.name.text;
    }
  }
  return undefined;
};

const files = await walk(sourceRoot);
const counts = { useMemo: 0, useCallback: 0, memo: 0 };
const sites = [];

for (const filePath of files) {
  const source = await readFile(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const kind = getCallKind(node);
      if (kind) {
        counts[kind] += 1;
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        sites.push({ file: relative(frontendRoot, filePath), line: line + 1, kind });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

if (compilerLogPath) {
  const compilerLog = await readFile(compilerLogPath, "utf8");
  const bailoutFiles = new Set(
    [...compilerLog.matchAll(/\,-\[([^\]]*\/frontend\/src\/[^:\]]+):\d+:\d+\]/g)].map(
      ([, sourcePath]) => `src/${sourcePath.split("/frontend/src/").at(-1)}`,
    ),
  );
  for (const site of sites) site.compilerBailout = bailoutFiles.has(site.file);
}

const result = {
  scannedProductionFiles: files.length,
  counts,
  total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  compilerLog: compilerLogPath ? relative(process.cwd(), compilerLogPath) : null,
  sites,
};

if (verbose) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(
    `${JSON.stringify({
      scannedProductionFiles: result.scannedProductionFiles,
      counts: result.counts,
      total: result.total,
      compilerBailoutSites: compilerLogPath
        ? sites.filter((site) => site.compilerBailout).length
        : null,
    })}\n`,
  );
}
