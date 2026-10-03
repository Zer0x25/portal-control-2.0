// pre-push inteligente (invocado por .husky/pre-push como
// `node scripts/pre-push.cjs <remote-name> <remote-url>`, con las líneas
// `<local-ref> <local-oid> <remote-ref> <remote-oid>` en stdin).
//
// - Push a cualquier rama que NO sea main -> no valida nada: el CI del PR
//   (barato desde ADR-0014) cubre la validación. Push rápido.
// - Push a main (incluye `git push origin feature:main`) -> corre los gates
//   de gobernanza y el `validate:ci` solo de los paquetes tocados respecto
//   a la punta remota actual. Es la única barrera funcional para pushes
//   directos a main (sin branch protection, ver ADR-0013).
//
// Cero dependencias: solo node stdlib + git CLI.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const ZERO_OID = "0000000000000000000000000000000000000000";
const MAIN_REF = "refs/heads/main";

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });
  return res;
}

function readStdinLines() {
  const data = fs.readFileSync(0, "utf8");
  return data
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function changedFilesSince(remoteOid, localOid) {
  const res = sh("git", ["diff", "--name-only", remoteOid, localOid]);
  if (res.status !== 0) {
    console.error(`pre-push: no se pudo calcular el diff ${remoteOid}..${localOid}`);
    console.error((res.stderr || "").trim());
    process.exit(1);
  }
  return res.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
}

function run(cmd, args, label) {
  console.log(`pre-push: ${label} ...`);
  const res = spawnSync(cmd, args, { encoding: "utf8", stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) {
    console.error(`pre-push: FALLÓ ${label} (exit ${res.status}). Push abortado.`);
    process.exit(res.status ?? 1);
  }
}

function main() {
  const lines = readStdinLines();
  const mainPushes = lines
    .map((l) => l.split(/\s+/))
    .filter((p) => p.length === 4)
    .map(([localRef, localOid, remoteRef, remoteOid]) => ({ localRef, localOid, remoteRef, remoteOid }))
    .filter(({ localOid, remoteRef }) => localOid !== ZERO_OID && remoteRef === MAIN_REF);

  if (mainPushes.length === 0) {
    console.log("pre-push: el push no toca main -> sin validación local (la corre el CI del PR).");
    return;
  }

  // Unión de archivos nuevos respecto a cada punta remota de main.
  const changed = new Set();
  for (const { localOid, remoteOid } of mainPushes) {
    if (remoteOid === ZERO_OID) {
      // main no existe en el remoto: se valida todo.
      changed.add("backend/");
      changed.add("frontend/");
      continue;
    }
    for (const f of changedFilesSince(remoteOid, localOid)) changed.add(f);
  }

  const backend = [...changed].some((f) => f === "backend/" || f.startsWith("backend/"));
  const frontend = [...changed].some((f) => f === "frontend/" || f.startsWith("frontend/"));

  console.log(`pre-push: push a main con ${changed.size} archivo(s) nuevo(s).`);

  // Gates de gobernanza: rápidos, sin node_modules.
  run("npm", ["run", "secrets:scan"], "secret scan");
  run("npm", ["run", "spec:check"], "spec check");
  run("npm", ["run", "docs:check"], "docs check");

  if (!backend && !frontend) {
    console.log("pre-push: sin cambios en backend/ ni frontend/ -> sin validate:ci.");
    return;
  }
  if (backend) run("npm", ["--prefix", "backend", "run", "validate:ci"], "backend validate:ci");
  if (frontend) run("npm", ["--prefix", "frontend", "run", "validate:ci"], "frontend validate:ci");
  console.log("pre-push: validación de main OK.");
}

main();
