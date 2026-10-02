#!/usr/bin/env node
// Minimal spec gate: every specs/NNNN-slug/ must ship spec.md + plan.md +
// tasks.md, and spec.md must carry verifiable acceptance criteria.
const fs = require("node:fs");
const path = require("node:path");

const specsDir = path.join(__dirname, "..", "specs");
let failed = 0;

const entries = fs
  .readdirSync(specsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^[0-9]/.test(e.name))
  .map((e) => e.name)
  .sort();

if (entries.length === 0) {
  console.error("spec-check: no numbered specs found in specs/");
  process.exit(1);
}

for (const name of entries) {
  const dir = path.join(specsDir, name);
  for (const file of ["spec.md", "plan.md", "tasks.md"]) {
    if (!fs.existsSync(path.join(dir, file))) {
      console.error(`spec-check: ${name}/${file} missing`);
      failed = 1;
    }
  }
  const specPath = path.join(dir, "spec.md");
  if (fs.existsSync(specPath)) {
    const content = fs.readFileSync(specPath, "utf8");
    if (!content.includes("Criterios de aceptación")) {
      console.error(`spec-check: ${name}/spec.md lacks "Criterios de aceptación"`);
      failed = 1;
    }
    if (!/- \[[ xX]\]/.test(content)) {
      console.error(`spec-check: ${name}/spec.md has no acceptance checkboxes`);
      failed = 1;
    }
  }
  const tasksPath = path.join(dir, "tasks.md");
  if (fs.existsSync(tasksPath)) {
    const tasks = fs.readFileSync(tasksPath, "utf8");
    if (!/- \[[ xX]\]/.test(tasks)) {
      console.error(`spec-check: ${name}/tasks.md has no task checkboxes`);
      failed = 1;
    }
  }
}

if (failed === 0) {
  console.log(`spec-check: OK (${entries.length} spec(s): ${entries.join(", ")})`);
}
process.exit(failed);
