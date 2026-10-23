const fs = require("node:fs");
const path = require("node:path");

const PRECACHE_MARKER = "precacheAndRoute(";

function findPrecacheEntries(serviceWorkerSource) {
  const markerIndex = serviceWorkerSource.indexOf(PRECACHE_MARKER);
  if (markerIndex < 0) throw new Error("No precacheAndRoute manifest found in dist/sw.js");

  const arrayStart = serviceWorkerSource.indexOf("[", markerIndex + PRECACHE_MARKER.length);
  if (arrayStart < 0) throw new Error("Precache manifest array was not found in dist/sw.js");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = arrayStart; index < serviceWorkerSource.length; index += 1) {
    const character = serviceWorkerSource[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        const manifestSource = serviceWorkerSource.slice(arrayStart, index + 1);
        const entries = [];
        const entryPattern = /\{\s*url:("(?:\\.|[^"])*"),revision:(null|"(?:\\.|[^"])*")\s*\}/g;
        for (const match of manifestSource.matchAll(entryPattern)) {
          entries.push({
            url: JSON.parse(match[1]),
            revision: match[2] === "null" ? null : JSON.parse(match[2]),
          });
        }
        if (entries.length === 0 && manifestSource !== "[]") {
          throw new Error("Precache manifest entries did not match the expected Workbox format");
        }
        return entries;
      }
    }
  }

  throw new Error("Precache manifest array is unterminated in dist/sw.js");
}

function firstMatchingFile(directory, pattern, label) {
  const matches = fs
    .readdirSync(directory)
    .filter((fileName) => pattern.test(fileName))
    .sort();
  if (matches.length !== 1) {
    throw new Error(`Expected one ${label} chunk in ${directory}, found ${matches.length}`);
  }
  return path.join(directory, matches[0]);
}

function measureBuild(distDirectory) {
  const assetDirectory = path.join(distDirectory, "assets");
  const reactCore = firstMatchingFile(assetDirectory, /^react-core-.+\.js$/, "react-core");
  const charts = firstMatchingFile(assetDirectory, /^charts-.+\.js$/, "charts");
  const serviceWorkerPath = path.join(distDirectory, "sw.js");
  const entries = findPrecacheEntries(fs.readFileSync(serviceWorkerPath, "utf8"));

  const precacheBytes = entries.reduce((total, entry) => {
    if (typeof entry.url !== "string" || entry.url.startsWith("/") || entry.url.includes("..")) {
      throw new Error(`Unsafe URL in precache manifest: ${String(entry.url)}`);
    }
    const filePath = path.join(distDirectory, entry.url);
    if (!fs.existsSync(filePath))
      throw new Error(`Precache entry is missing from dist: ${entry.url}`);
    return total + fs.statSync(filePath).size;
  }, 0);

  return {
    reactCoreBytes: fs.statSync(reactCore).size,
    chartsBytes: fs.statSync(charts).size,
    precacheBytes,
    precacheEntries: entries.length,
  };
}

function checkMeasurements(measurements, limits) {
  const failures = [];
  for (const key of ["reactCoreBytes", "chartsBytes", "precacheBytes"]) {
    if (!Number.isFinite(measurements[key])) failures.push(`${key} is missing or invalid`);
    else if (measurements[key] > limits[key]) {
      failures.push(`${key} ${measurements[key]} exceeds budget ${limits[key]}`);
    }
  }
  return failures;
}

function lowerBudgets(measurements, currentBudget, reason) {
  const failures = checkMeasurements(measurements, currentBudget.limits);
  if (failures.length > 0) throw new Error(`Cannot update bundle budget: ${failures.join("; ")}`);

  return {
    ...currentBudget,
    limits: Object.fromEntries(
      Object.entries(currentBudget.limits).map(([key, value]) => [
        key,
        Math.min(value, measurements[key]),
      ]),
    ),
    measuredAt: new Date().toISOString(),
    updateReason: reason,
  };
}

module.exports = { checkMeasurements, findPrecacheEntries, lowerBudgets, measureBuild };
