// Guard para los hooks de Husky: verifica que el toolchain local exista
// antes de correr linters. Sin node_modules el hook falla con un mensaje
// accionable en vez de un error críptico de binario inexistente.
// Cero dependencias: solo node stdlib (como el resto de scripts/).
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED = [
  "backend/node_modules/.bin/eslint",
  "backend/node_modules/.bin/prettier",
  "frontend/node_modules/.bin/eslint",
  "frontend/node_modules/.bin/prettier",
];

function main() {
  const missing = REQUIRED.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length > 0) {
    console.error("hooks: faltan dependencias locales para correr los hooks.");
    console.error("  Faltante:\n    " + missing.join("\n    "));
    console.error("  Ejecuta:  (cd backend && npm ci)  y  (cd frontend && npm ci)");
    process.exit(1);
  }
}

main();
