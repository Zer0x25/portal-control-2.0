#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const errors = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

const expected = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(expected);

if (!versionMatch) {
  errors.push(`.nvmrc debe contener un parche exacto; valor actual: "${expected}".`);
} else {
  const engineRange = `>=${expected} <${Number(versionMatch[1]) + 1}`;

  for (const manifestPath of ["package.json", "backend/package.json", "frontend/package.json"]) {
    const manifest = readJson(manifestPath);
    check(manifest.engines?.node === engineRange, `${manifestPath}: engines.node debe ser "${engineRange}".`);
  }

  for (const lockPath of ["package-lock.json", "backend/package-lock.json", "frontend/package-lock.json"]) {
    const lock = readJson(lockPath);
    check(lock.packages?.[""]?.engines?.node === engineRange, `${lockPath}: packages[""].engines.node debe ser "${engineRange}".`);
  }

  const dockerDirectories = [".", "backend", "frontend"];
  const dockerFiles = dockerDirectories.flatMap((directory) => {
    const absoluteDirectory = path.join(root, directory);
    return fs
      .readdirSync(absoluteDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.startsWith("Dockerfile"))
      .map((entry) => path.join(directory, entry.name));
  });
  let nodeImageCount = 0;

  for (const dockerPath of dockerFiles) {
    const contents = fs.readFileSync(path.join(root, dockerPath), "utf8");
    for (const match of contents.matchAll(/^\s*FROM\s+(?:--platform=\S+\s+)?node:([^\s]+)/gm)) {
      nodeImageCount += 1;
      check(match[1] === `${expected}-alpine`, `${dockerPath}: la imagen Node debe ser node:${expected}-alpine (actual: node:${match[1]}).`);
    }
  }
  check(nodeImageCount > 0, "No se encontraron imágenes Node en los Dockerfiles del repo.");

  const workflowDirectory = path.join(root, ".github/workflows");
  for (const entry of fs.readdirSync(workflowDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.ya?ml$/.test(entry.name)) continue;
    const workflowPath = path.join(workflowDirectory, entry.name);
    const contents = fs.readFileSync(workflowPath, "utf8");
    const setupNodeCount = [...contents.matchAll(/uses:\s*actions\/setup-node@/g)].length;
    const versionFileCount = [...contents.matchAll(/node-version-file:\s*\.nvmrc/g)].length;

    check(setupNodeCount === versionFileCount, `.github/workflows/${entry.name}: cada setup-node debe leer node-version-file: .nvmrc.`);
  }

  check(process.versions.node === expected, `El runtime actual es ${process.versions.node}; .nvmrc requiere ${expected}.`);
}

if (errors.length > 0) {
  process.stderr.write(`Alineación Node fallida:\n${errors.map((error) => `- ${error}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Alineación Node correcta: ${expected}.\n`);
