#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const TOKEN_FILE = path.join(ROOT, "tokens.json");
const CSS_FILE = path.join(ROOT, "src/index.css");
const TYPES_FILE = path.join(ROOT, "src/types/tokens.ts");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readAndValidateTokens() {
  const document = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  assert(document.version === 1, "tokens.json debe declarar version: 1.");
  assert(
    Array.isArray(document.tokens) && document.tokens.length > 0,
    "tokens.json debe incluir tokens.",
  );

  const byToken = new Map();
  const byCssVar = new Map();
  for (const item of document.tokens) {
    assert(/^token-[A-Za-z0-9-]+$/.test(item.token), `Nombre de token inválido: ${item.token}`);
    assert(
      /^--[a-z0-9-]+$/.test(item.cssVar),
      `cssVar inválida para ${item.token}: ${item.cssVar}`,
    );
    assert(
      typeof item.light === "string" && item.light.trim(),
      `Falta valor light para ${item.token}.`,
    );
    assert(
      item.dark === null || (typeof item.dark === "string" && item.dark.trim()),
      `Valor dark inválido para ${item.token}.`,
    );
    assert(
      Boolean(item.lightOnly) === (item.dark === null),
      `${item.token} debe marcar lightOnly cuando no declara valor dark.`,
    );
    assert(!byToken.has(item.token), `Token duplicado: ${item.token}`);
    assert(!byCssVar.has(item.cssVar), `cssVar duplicada: ${item.cssVar}`);
    byToken.set(item.token, item);
    byCssVar.set(item.cssVar, item);
  }

  const themeRefs = flattenSectionRefs(document.themeSections, "tokens", "themeSections");
  const lightRefs = flattenSectionRefs(document.lightSections, "cssVars", "lightSections");
  const darkRefs = flattenSectionRefs(document.darkSections, "cssVars", "darkSections");
  assertExactCoverage(themeRefs, new Set(byToken.keys()), "themeSections");
  assertExactCoverage(lightRefs, new Set(byCssVar.keys()), "lightSections");
  assertExactCoverage(
    darkRefs,
    new Set([...byCssVar.values()].filter((item) => item.dark !== null).map((item) => item.cssVar)),
    "darkSections",
  );

  return { document, byToken, byCssVar };
}

function flattenSectionRefs(sections, key, label) {
  assert(Array.isArray(sections), `${label} debe ser un array.`);
  return sections.flatMap((section) => {
    assert(Array.isArray(section[key]), `${label} debe incluir arrays "${key}".`);
    return section[key];
  });
}

function assertExactCoverage(actual, expected, label) {
  const counts = new Map();
  for (const ref of actual) counts.set(ref, (counts.get(ref) ?? 0) + 1);
  const missing = [...expected].filter((ref) => counts.get(ref) !== 1);
  const unknown = [...counts.keys()].filter((ref) => !expected.has(ref));
  assert(
    missing.length === 0 && unknown.length === 0,
    `${label} debe listar cada entrada exactamente una vez. Faltan/duplicadas: ${missing.join(", ") || "ninguna"}; desconocidas: ${unknown.join(", ") || "ninguna"}.`,
  );
}

function indentComment(comment, indent) {
  if (!comment) return "";
  const [firstLine, ...remainingLines] = comment.split("\n");
  return [`${indent}${firstLine}`, ...remainingLines].join("\n");
}

function renderTheme(document, byToken) {
  const lines = ["  /* @tokens:theme:start */"];
  for (const [index, section] of document.themeSections.entries()) {
    if (index > 0) lines.push("");
    if (section.comment) lines.push(indentComment(section.comment, "  "));
    for (const token of section.tokens) {
      const item = byToken.get(token);
      lines.push(`  --color-${item.token}: var(${item.cssVar});`);
    }
  }
  lines.push("  /* @tokens:theme:end */");
  return lines.join("\n");
}

function renderVariableSections(sections, byCssVar, mode) {
  const lines = [];
  for (const [index, section] of sections.entries()) {
    if (index > 0) lines.push("");
    if (section.comment) lines.push(indentComment(section.comment, "    "));
    for (const cssVar of section.cssVars) {
      const item = byCssVar.get(cssVar);
      const value = item[mode];
      assert(value !== null, `${cssVar} no tiene valor ${mode}.`);
      const comment = item[`${mode}Comment`];
      lines.push(`    ${cssVar}: ${value};${comment ? ` ${comment}` : ""}`);
    }
  }
  return lines.join("\n");
}

function renderVariables(document, byCssVar) {
  const light = renderVariableSections(document.lightSections, byCssVar, "light");
  const dark = renderVariableSections(document.darkSections, byCssVar, "dark");
  return [
    "  /* @tokens:vars:start */",
    "  :root {",
    light,
    "  }",
    "  .dark {",
    dark,
    "  }",
    "  /* @tokens:vars:end */",
  ].join("\n");
}

function renderTypes(document) {
  const renderUnion = (name, values) => [
    `export type ${name} =`,
    ...values.map(
      (value, index) => `  | ${JSON.stringify(value)}${index === values.length - 1 ? ";" : ""}`,
    ),
  ];
  const tokenNames = renderUnion(
    "DesignToken",
    document.tokens.map((item) => item.token),
  );
  const cssVars = renderUnion("DesignTokenCssVariable", [
    ...new Set(document.tokens.map((item) => item.cssVar)),
  ]);
  return [
    "/**",
    " * Generated by `npm run tokens:build` from `frontend/tokens.json`.",
    " * Do not edit this file directly.",
    " */",
    ...tokenNames,
    "",
    ...cssVars,
    "",
    'export type DesignTokenTheme = "light" | "dark";',
    "",
  ].join("\n");
}

function replaceRegion(css, label, content) {
  const startMarker = `/* @tokens:${label}:start */`;
  const endMarker = `/* @tokens:${label}:end */`;
  const start = css.indexOf(startMarker);
  const end = css.indexOf(endMarker);
  assert(start >= 0 && end > start, `Faltan o están desordenados los marcadores @tokens:${label}.`);
  assert(
    css.indexOf(startMarker, start + startMarker.length) === -1,
    `Marcador duplicado ${startMarker}.`,
  );
  assert(css.indexOf(endMarker, end + endMarker.length) === -1, `Marcador duplicado ${endMarker}.`);
  const startLine = css.lastIndexOf("\n", start) + 1;
  const endLine = css.indexOf("\n", end);
  const afterRegion = endLine < 0 ? css.length : endLine + 1;
  return `${css.slice(0, startLine)}${content}\n${css.slice(afterRegion)}`;
}

function main() {
  const check = process.argv.includes("--check");
  const write = process.argv.includes("--write") || !check;
  assert(!(check && write), "Usa --check o --write, no ambos.");

  const { document, byToken, byCssVar } = readAndValidateTokens();
  let css = fs.readFileSync(CSS_FILE, "utf8");
  css = replaceRegion(css, "theme", renderTheme(document, byToken));
  css = replaceRegion(css, "vars", renderVariables(document, byCssVar));
  const types = renderTypes(document);

  const outputs = [
    { file: CSS_FILE, expected: css },
    { file: TYPES_FILE, expected: types },
  ];
  const stale = outputs.filter(
    ({ file, expected }) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== expected,
  );

  if (check) {
    if (stale.length > 0) {
      console.error(
        `Tokens desincronizados: ${stale.map(({ file }) => path.relative(ROOT, file)).join(", ")}. Ejecuta npm run tokens:build.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(`Tokens sincronizados (${document.tokens.length} entradas).`);
    return;
  }

  for (const { file, expected } of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, expected);
  }
  console.log(`Tokens generados (${document.tokens.length} entradas).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
