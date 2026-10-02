#!/usr/bin/env node
// Enforce Conventional Commits sin dependencias externas.
// Uso: node scripts/commit-conventional.cjs <path-commit-msg>
// (husky commit-msg le pasa $1). Falla != 0 si el subject no cumple.
const fs = require("node:fs");

const msgFile = process.argv[2];
if (!msgFile) {
  console.error("commit-conventional: falta path del mensaje de commit");
  process.exit(1);
}

const subject = fs.readFileSync(msgFile, "utf8").split("\n")[0].trim();

// Merge commits y reverts generados por git quedan exentos.
if (/^Merge (branch|remote|pull request)/.test(subject)) {
  process.exit(0);
}

const pattern =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?(!)?: .+/;

if (!pattern.test(subject)) {
  console.error(`commit-conventional: subject inválido: "${subject}"`);
  console.error("Formato: tipo(scope opcional): mensaje. Ej: feat(auth): add MFA flow");
  console.error("Tipos: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert");
  process.exit(1);
}
