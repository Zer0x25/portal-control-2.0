import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { QUERY_KEYS } from "../../lib/queryKeys";
import { PERSISTED_QUERY_ROOTS, SENSITIVE_QUERY_ROOTS } from "../../lib/queryCache";
import { ApiHttpError } from "../../services/apiClient";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(currentDir, "../../..");
const srcDir = path.join(frontendRoot, "src");

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist") {
        results = results.concat(getFilesRecursively(fullPath, extensions));
      }
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const HTTP_CLIENT_WHITELIST = new Set([
  path.join(srcDir, "services/apiClient.ts"),
  path.join(srcDir, "hooks/useWeather.ts"),
  path.join(srcDir, "components/ui/UserManualModal.tsx"),
]);

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes("/tests/") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".spec.tsx")
  );
}

describe("HTTP Client & Transport Guardrails (Spec 034 / AC8, AC9)", () => {
  it("enforces zero raw fetch(), XMLHttpRequest, or axios calls outside frozen whitelist", () => {
    const allSourceFiles = getFilesRecursively(srcDir, [".ts", ".tsx"]).filter(
      (file) => !isTestFile(file) && !HTTP_CLIENT_WHITELIST.has(file),
    );

    const violations: { file: string; line: number; match: string }[] = [];

    // Regex that matches standalone fetch(, but not refetch( or obj.fetch(
    const rawFetchRegex = /(?<![a-zA-Z0-9_.])fetch\s*\(/g;
    const xhrRegex = /\bXMLHttpRequest\b/g;
    const axiosRegex = /\baxios\b/g;

    for (const filePath of allSourceFiles) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((lineText, lineIdx) => {
        // Ignore comments
        const trimmed = lineText.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

        if (rawFetchRegex.test(lineText)) {
          violations.push({
            file: path.relative(frontendRoot, filePath),
            line: lineIdx + 1,
            match: "raw fetch()",
          });
        }
        if (xhrRegex.test(lineText)) {
          violations.push({
            file: path.relative(frontendRoot, filePath),
            line: lineIdx + 1,
            match: "XMLHttpRequest",
          });
        }
        if (axiosRegex.test(lineText)) {
          violations.push({
            file: path.relative(frontendRoot, filePath),
            line: lineIdx + 1,
            match: "axios",
          });
        }
      });
    }

    expect(
      violations,
      `Detected unauthorized network calls outside apiClient whitelist. Violations: ${JSON.stringify(violations, null, 2)}`,
    ).toHaveLength(0);
  });

  it("verifies ApiHttpError contract preserves numeric status and structured payload", () => {
    const error = new ApiHttpError("Not Found", 404, "/api/resource", { detail: "missing" });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiHttpError");
    expect(error.status).toBe(404);
    expect(error.url).toBe("/api/resource");
    expect(error.data).toEqual({ detail: "missing" });
  });

  it("verifies all query roots in QUERY_KEYS belong to PERSISTED_QUERY_ROOTS or SENSITIVE_QUERY_ROOTS (AC8 / T25)", () => {
    const allowedRoots = new Set([...PERSISTED_QUERY_ROOTS, ...SENSITIVE_QUERY_ROOTS]);

    const canonicalRoots = Object.keys(QUERY_KEYS);
    const unmappedRoots: string[] = [];

    for (const root of canonicalRoots) {
      if (!allowedRoots.has(root)) {
        unmappedRoots.push(root);
      }
    }

    expect(
      unmappedRoots,
      `Found canonical query roots not registered in PERSISTED_QUERY_ROOTS or SENSITIVE_QUERY_ROOTS: ${unmappedRoots.join(", ")}`,
    ).toHaveLength(0);

    const overlap = PERSISTED_QUERY_ROOTS.filter((root) => SENSITIVE_QUERY_ROOTS.includes(root));
    expect(overlap, "PERSISTED_QUERY_ROOTS and SENSITIVE_QUERY_ROOTS must never overlap").toEqual(
      [],
    );
  });

  it("verifies all literal queryKey roots in application source belong to the allowlists (AC8 / T25)", () => {
    const allSourceFiles = getFilesRecursively(srcDir, [".ts", ".tsx"]).filter(
      (file) => !isTestFile(file),
    );
    const allowedRoots = new Set([...PERSISTED_QUERY_ROOTS, ...SENSITIVE_QUERY_ROOTS]);

    const keyRegex = /queryKey:\s*\[\s*["']([a-zA-Z0-9_-]+)["']/g;
    const invalidateRegex = /invalidateQueries\(\s*\{\s*queryKey:\s*\[\s*["']([a-zA-Z0-9_-]+)["']/g;

    const unknownRoots: { root: string; file: string; line: number }[] = [];

    for (const filePath of allSourceFiles) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((lineText, lineIdx) => {
        let match: RegExpExecArray | null;
        while ((match = keyRegex.exec(lineText)) !== null) {
          if (!allowedRoots.has(match[1])) {
            unknownRoots.push({
              root: match[1],
              file: path.relative(frontendRoot, filePath),
              line: lineIdx + 1,
            });
          }
        }
        while ((match = invalidateRegex.exec(lineText)) !== null) {
          if (!allowedRoots.has(match[1])) {
            unknownRoots.push({
              root: match[1],
              file: path.relative(frontendRoot, filePath),
              line: lineIdx + 1,
            });
          }
        }
        keyRegex.lastIndex = 0;
        invalidateRegex.lastIndex = 0;
      });
    }

    expect(
      unknownRoots,
      `Detected unauthorized query key roots outside PERSISTED and SENSITIVE allowlists: ${JSON.stringify(unknownRoots, null, 2)}`,
    ).toHaveLength(0);
  });

  it("verifies there are no deprecated kebab-case query keys in application source", () => {
    const allSourceFiles = getFilesRecursively(srcDir, [".ts", ".tsx"]).filter(
      (file) => !isTestFile(file),
    );

    const violations: { file: string; line: number; key: string }[] = [];

    for (const filePath of allSourceFiles) {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((lineText, lineIdx) => {
        if (lineText.includes('"audit-logs"') || lineText.includes("'audit-logs'")) {
          // Allow in service endpoints or swagger mappings
          if (!lineText.includes("/api/audit-logs") && !lineText.includes("/audit-logs")) {
            violations.push({
              file: path.relative(frontendRoot, filePath),
              line: lineIdx + 1,
              key: "audit-logs",
            });
          }
        }
        if (
          lineText.includes('"attendance-analytics"') ||
          lineText.includes("'attendance-analytics'")
        ) {
          violations.push({
            file: path.relative(frontendRoot, filePath),
            line: lineIdx + 1,
            key: "attendance-analytics",
          });
        }
      });
    }

    expect(violations).toHaveLength(0);
  });
});
