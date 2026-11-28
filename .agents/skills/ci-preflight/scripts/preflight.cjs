#!/usr/bin/env node
const { execFileSync, spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { availableParallelism } = require("node:os");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "../../../../");
const backendDir = path.join(rootDir, "backend");
const full = process.argv.includes("--full");
const pr = process.argv.includes("--pr") && !full;
const completeScope = { backend: true, frontend: true, stories: true };

function git(...args) {
  return execFileSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .split("\0")
    .filter(Boolean);
}

function isDocumentation(file) {
  if (file.startsWith("docs/") || file.startsWith("specs/")) return true;
  if (!file.endsWith(".md")) return false;
  const standaloneDocs = [
    ".github/pull_request_template.md",
    "backend/README.md",
    "frontend/README.md",
  ];
  return (
    !file.includes("/") ||
    file.startsWith(".agents/") ||
    file.startsWith("backend/docs/") ||
    standaloneDocs.includes(file)
  );
}

function scopeFor(files) {
  const scope = { backend: false, frontend: false, stories: false };
  for (const file of files) {
    if (isDocumentation(file)) continue;
    if (file.startsWith("backend/")) {
      scope.backend = true;
      if (file === "backend/docs/swagger.json") scope.frontend = true;
    } else if (file.startsWith("frontend/")) {
      scope.frontend = true;
      if (!file.startsWith("frontend/e2e/")) scope.stories = true;
    } else {
      return completeScope;
    }
  }
  return scope;
}

function run(command, args, label, cwd = rootDir) {
  console.log("\n[" + label + "] " + [command, ...args].join(" "));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: command === "npm" && process.platform === "win32",
    });
    child.once("error", (error) => reject(new Error(`${label}: ${error.message}`)));
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label}: ${signal || `código ${code}`}`));
    });
  });
}

function npm(script, cwd = rootDir) {
  return run("npm", ["run", script], path.basename(cwd) + " · " + script, cwd);
}

function checkMarkdown(files) {
  const governanceMarkdown = ["docs/adr/*.md", "specs/**/*.md", ".agents/**/*.md", "AGENTS.md"];
  const prettier = require.resolve("prettier/bin/prettier.cjs", { paths: [backendDir] });
  const changedMarkdown = files
    .filter(
      (file) =>
        file.endsWith(".md") && isDocumentation(file) && existsSync(path.join(rootDir, file)),
    )
    .map((file) => "./" + file);
  return run(
    process.execPath,
    [prettier, "--check", ...governanceMarkdown, ...changedMarkdown],
    "Formato Markdown",
  );
}

function checkSddDiscipline(files) {
  const codeChanged = files.some((file) => /^(backend|frontend)\/src\//.test(file));
  const specsChanged = files.some((file) => /^(specs|docs\/adr)\//.test(file));
  if (codeChanged && !specsChanged) {
    console.log(
      "\n[Gobernanza SDD] Para una funcionalidad nueva o un refactor estructural, enlaza la spec o créala con npm run spec:new <slug>.",
    );
  }
}

async function checkPackage(workspace, scope) {
  const cwd = path.join(rootDir, workspace);
  await run("npm", ["run", "lint:budget", "--", "--only", workspace], `${workspace} · lint:budget`);
  await npm("check", cwd);
  if (!pr && !full) return;

  await npm("format:check", cwd);
  if (workspace === "backend") {
    await npm("test:unit:ci", cwd);
    await npm("test:schemas-refactor", cwd);
  } else {
    await npm("catalog:manifest:check", cwd);
    await npm("tokens:check", cwd);
    await npm("audit:design-system", cwd);
    await npm("test:run:ci", cwd);
    if (scope.stories) await npm("test:storybook", cwd);
  }
}

async function main() {
  let files = [];
  let baseAvailable = true;
  try {
    files = git(
      "status",
      "--porcelain=v1",
      "-z",
      "--no-renames",
      "--untracked-files=all",
      "--",
    ).map((entry) => entry.slice(3));
    if (pr || full) {
      const branchFiles = git(
        "diff",
        "--name-only",
        "--no-renames",
        "-z",
        "origin/main...HEAD",
        "--",
      );
      files = [...new Set([...files, ...branchFiles])];
    }
  } catch {
    baseAvailable = false;
    if (pr)
      console.warn(
        "[preflight] Git no pudo calcular el diff con origin/main. Se ejecutará la validación completa.",
      );
  }

  const scope = pr && baseAvailable ? scopeFor(files) : completeScope;
  const packages = ["backend", "frontend"].filter((name) => scope[name]);
  const parallel =
    packages.length > 1 && !process.argv.includes("--serial") && availableParallelism() >= 4;
  const mode = full ? "--full" : pr ? "--pr" : "iteración";
  const storySummary = pr || full ? " · Storybook: " + (scope.stories ? "sí" : "no") : "";
  console.log(
    "[preflight] " + mode + " · paquetes: " + (packages.join(", ") || "ninguno") + storySummary,
  );

  await npm("secrets:scan");
  await npm("spec:check");
  await npm("docs:check");
  await checkMarkdown(files);

  // El check regenera Swagger y el SDK que leen ambos paquetes.
  if ((pr || full) && scope.backend) await npm("check:sdk", backendDir);

  if (parallel) {
    console.log("\n[preflight] Backend y frontend en paralelo.");
    const results = await Promise.allSettled(
      packages.map((workspace) => checkPackage(workspace, scope)),
    );
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) throw new Error(failures.map(({ reason }) => reason.message).join("\n"));
  } else {
    for (const workspace of packages) await checkPackage(workspace, scope);
  }

  checkSddDiscipline(files);
  console.log("\n[preflight] Validación local aprobada.");
}

main().catch((error) => {
  console.error("\n[preflight] Validación local fallida. " + error.message);
  process.exitCode = 1;
});
