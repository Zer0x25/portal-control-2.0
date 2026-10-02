#!/usr/bin/env node
// Escaneo de secretos sin dependencias: falla si git grep encuentra
// patrones de credenciales en el árbol de trabajo. Mismo estilo que los
// guardrails de .github/workflows/ci.yml (grep, no SaaS).
//
// Gitleaks (spec 003 G-05, AC5): NO migrar ahora. Migrar cuando se cumpla
// al menos uno: (a) secret-scan.allow supera 15 entradas; (b) se necesita
// escanear historial (git log), no solo árbol; (c) se requieren patrones
// de alta entropía mantenidos por terceros. Ver ADR-0012.
const { execFileSync } = require("node:child_process");

const allowFile = path => {
  try {
    return require("node:fs").readFileSync(path, "utf8");
  } catch {
    return "";
  }
};

// Allowlist auditable: `prefijo-de-path | justificación`.
// Una coincidencia bajo un prefijo allowlistado se reporta pero no falla.
const path = require("node:path");
const allowEntries = allowFile(path.join(__dirname, "secret-scan.allow"))
  .split("\n")
  .map(line => line.trim())
  .filter(line => line !== "" && !line.startsWith("#"))
  .map(line => {
    const [prefix, ...rest] = line.split("|");
    return { prefix: prefix.trim(), reason: rest.join("|").trim() };
  });

const patterns = [
  "-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY",
  "AKIA[0-9A-Z]{16}",
  "ghp_[A-Za-z0-9]{36}",
  "github_pat_[A-Za-z0-9_]{22,}",
  "xox[baprs]-[A-Za-z0-9-]{10,}",
  "-----BEGIN PGP PRIVATE KEY",
  "password\\s*[:=]\\s*[\"'][^\"']+[\"']",
  "passwd\\s*[:=]\\s*[\"'][^\"']+[\"']",
  "aws_secret_access_key\\s*[:=].+",
];

let failed = 0;
let allowedCount = 0;
for (const pattern of patterns) {
  try {
    const out = execFileSync("git", ["grep", "-n", "-E", "-e", pattern, "--", "."], {
      encoding: "utf8",
    });
  for (const line of out.trim().split("\n")) {
    const file = line.split(":")[0];
    const allowed = allowEntries.find(e => file.startsWith(e.prefix));
    if (allowed) {
      console.log(`secrets-scan: permitido (${allowed.reason}): ${line}`);
      allowedCount += 1;
    } else {
      console.error(`secrets-scan: SECRETO SOSPECHOSO: ${line}`);
      failed = 1;
    }
  }
  } catch (err) {
    // git grep sale 1 cuando no hay matches: ese es el caso bueno.
    if (err && err.status !== 1) {
      throw err;
    }
  }
}

if (failed === 0) {
  console.log(`secrets-scan: OK (0 secretos, ${allowedCount} coincidencia(s) allowlistada(s))`);
}
process.exit(failed);
