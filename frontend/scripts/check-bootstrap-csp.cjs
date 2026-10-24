const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { minifySync } = require("vite");

const useBuiltHtml = process.argv.includes("--dist");
const frontendRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(frontendRoot, useBuiltHtml ? "dist/index.html" : "index.html");
const nginxConfigPath = path.join(frontendRoot, "nginx.conf");
const html = readFileSync(htmlPath, "utf8");
const nginxConfig = readFileSync(nginxConfigPath, "utf8");
const inlineScript = html.match(/<script id="dashboard-bootstrap-script">([\s\S]*?)<\/script>/);

if (useBuiltHtml && Buffer.byteLength(html, "utf8") > 5 * 1024) {
  throw new Error(`Built index.html exceeds 5 KiB: ${Buffer.byteLength(html, "utf8")} bytes`);
}

if (!inlineScript) {
  throw new Error(`Dashboard bootstrap script was not found in ${htmlPath}`);
}

if (!html.includes('id="dashboard-bootstrap-critical"')) {
  throw new Error(`Dashboard critical CSS was not found in ${htmlPath}`);
}

if (useBuiltHtml) {
  const stylesheet = html.match(/<link\b(?=[^>]*\brel="stylesheet")[^>]*>/);
  if (!stylesheet || !/\bmedia="print"/.test(stylesheet[0])) {
    throw new Error("Built Dashboard stylesheet must start with media=print for critical handoff");
  }
  if (!/\bfetchpriority="high"/.test(stylesheet[0])) {
    throw new Error("Built stylesheet must keep high fetch priority while critical CSS renders");
  }
}

const scriptForHash = useBuiltHtml
  ? inlineScript[1]
  : minifySync("dashboard-bootstrap.js", inlineScript[1], {
      compress: true,
      mangle: true,
    }).code.trim();
const hash = createHash("sha256").update(scriptForHash).digest("base64");
const allowedHash = `'sha256-${hash}'`;
const scriptPolicies = [...nginxConfig.matchAll(/script-src ([^;]+);/g)].map((match) => match[1]);

if (scriptPolicies.length !== 2) {
  throw new Error(
    `Expected two script-src policies in ${nginxConfigPath}; found ${scriptPolicies.length}`,
  );
}

const expectedScriptPolicy = `'self' ${allowedHash}`;
if (scriptPolicies.some((policy) => policy.trim() !== expectedScriptPolicy)) {
  throw new Error(
    `script-src must allow only 'self' and the exact Dashboard bootstrap hash: ${expectedScriptPolicy}`,
  );
}

process.stdout.write(
  `[BOOTSTRAP-CSP] ${useBuiltHtml ? "dist" : "build-transformed source"} hash matches both policies.\n`,
);
