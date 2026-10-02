#!/usr/bin/env node
// Check de enlaces y consistencia para Docs as Code (spec 003 G-04, AC4).
// Cero dependencias: solo node + fs. Falla (exit 1) si hay un enlace
// relativo roto en docs/adr/ o specs/, o si un ADR numerado no está
// indexado en docs/adr/README.md.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = [path.join(ROOT, "docs", "adr"), path.join(ROOT, "specs")];
const INDEX = path.join(ROOT, "docs", "adr", "README.md");

function collectMarkdown(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdown(full, out);
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function extractTargets(markdown) {
  const targets = [];
  // [texto](destino) e ![alt](destino). Ignora http(s), mailto y anclas puras.
  const re = /!?\[[^\]]*\]\(([^)\s]+)\)/g;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    let target = match[1].trim();
    if (/^(https?:|mailto:|data:)/i.test(target)) continue;
    if (target.startsWith("#")) continue;
    // Quita ancla (#...) y query (?...) para resolver el archivo.
    target = target.split("#")[0].split("?")[0];
    if (!target) continue;
    // Ignora rutas absolutas del portal (ej. /api/health) y holders.
    if (target.startsWith("/") && !target.startsWith("./") && !target.startsWith("../")) {
      continue;
    }
    targets.push(match[1].trim());
  }
  return targets;
}

let failed = 0;
const files = SCAN_DIRS.flatMap((dir) => collectMarkdown(dir));

if (files.length === 0) {
  console.error("docs-check: no se encontraron markdown en docs/adr/ ni specs/");
  process.exit(1);
}

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const raw of extractTargets(content)) {
    const clean = raw.split("#")[0].split("?")[0];
    const resolved = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(resolved)) {
      console.error(`docs-check: ENLACE ROTO en ${path.relative(ROOT, file)} -> ${raw}`);
      failed = 1;
    }
  }
}

// Consistencia del índice: todo ADR numerado debe estar listado en README.md.
const adrFiles = collectMarkdown(path.join(ROOT, "docs", "adr"))
  .map((f) => path.basename(f))
  .filter((name) => /^\d{4}-.*\.md$/.test(name) && name !== "0000-template.md")
  .sort();
if (fs.existsSync(INDEX)) {
  const index = fs.readFileSync(INDEX, "utf8");
  for (const adr of adrFiles) {
    const stem = adr.replace(/\.md$/, "");
    if (!index.includes(stem) && !index.includes(adr)) {
      console.error(`docs-check: ADR sin indexar en docs/adr/README.md -> ${adr}`);
      failed = 1;
    }
  }
} else {
  console.error("docs-check: falta docs/adr/README.md");
  failed = 1;
}

if (failed === 0) {
  console.log(`docs-check: OK (${files.length} markdown, ${adrFiles.length} ADR indexados)`);
}
process.exit(failed);
