#!/usr/bin/env node
const { execSync } = require("child_process");

try {
  const out = execSync("git diff --cached --name-only", { encoding: "utf8" });
  const changed = out.split(/\r?\n/).filter(Boolean);
  const protectedFiles = changed.filter((f) => f.endsWith(".view.tsx") || f.endsWith(".view.ts"));

  if (protectedFiles.length > 0) {
    console.error("Error: Detected staged changes to UI-protected view files:");
    protectedFiles.forEach((f) => console.error("  -", f));
    console.error(
      "\nIf this change is intentional, remove the file(s) from the commit and open a PR with the label 'ui/human-approved'.",
    );
    process.exit(1);
  }
  process.exit(0);
} catch (e) {
  console.error("Failed to run git check for UI protection.", e.message || e);
  process.exit(2);
}
