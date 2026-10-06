const { spawn } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packages = ["backend", "frontend"];
const children = new Set();
let stopping = false;

function stopAll(exitCode, signal = "SIGTERM") {
  if (stopping) return;

  stopping = true;
  process.exitCode = exitCode;

  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill(signal);
  }
}

for (const packageName of packages) {
  const child = spawn(npmCommand, ["run", "dev"], {
    cwd: path.join(rootDir, packageName),
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  children.add(child);

  child.on("error", (error) => {
    process.stderr.write(`No se pudo iniciar ${packageName}: ${error.message}\n`);
    stopAll(1);
  });

  child.on("close", (code, signal) => {
    children.delete(child);

    if (!stopping) {
      const exitCode = code ?? (signal ? 1 : 0);
      if (exitCode !== 0) {
        process.stderr.write(`${packageName} terminó con código ${exitCode}.\n`);
      }
      stopAll(exitCode);
    }

    if (stopping && children.size === 0) process.exit();
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopAll(0, signal));
}
