#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const frontendRoot = path.resolve(__dirname, "..");
const assetsDir = path.join(frontendRoot, "dist/assets");
if (!fs.existsSync(assetsDir)) {
  console.error("No existe dist/assets. Ejecuta npm run build antes del guard de Storybook.");
  process.exit(1);
}

const runtimeReference = /@storybook\/|storybook\/internal-/;
const violations = [];

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath);
    } else if (/\.(?:js|mjs|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (runtimeReference.test(content)) violations.push(path.relative(frontendRoot, fullPath));
    }
  }
}

scan(assetsDir);
if (violations.length > 0) {
  console.error(`Runtime de Storybook detectado en el bundle de producción:\n${violations.join("\n")}`);
  process.exit(1);
}

console.log("Bundle de producción sin runtime de Storybook.");
