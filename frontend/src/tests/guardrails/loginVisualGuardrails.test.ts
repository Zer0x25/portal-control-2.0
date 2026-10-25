import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const INDEX_CSS = path.resolve(__dirname, "../../index.css");
const LOGIN_PAGE = path.resolve(__dirname, "../../features/auth/pages/LoginPage.tsx");
const SRC_DIR = path.resolve(__dirname, "../..");
const css = readFileSync(INDEX_CSS, "utf8");
const loginPage = readFileSync(LOGIN_PAGE, "utf8");

function getTsxFilesRecursively(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getTsxFilesRecursively(fullPath));
    } else if (entry.endsWith(".tsx") && !entry.includes(".spec.") && !entry.includes(".test.")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Login visual guardrails", () => {
  it("keeps the login spotlight diffuse without relying on filters", () => {
    const gradientRule = css.match(/\.login-ambient-glow\s*\{([^}]+)\}/s)?.[1] ?? "";

    expect(loginPage).toContain("login-ambient-glow");
    expect(loginPage).not.toContain("blur-[120px]");
    expect(gradientRule).toContain("radial-gradient(");
    expect(gradientRule).toContain("ellipse 70% 55%");
    expect(gradientRule).not.toMatch(/\bfilter\s*:/);
  });

  it("keeps ambient glows independent from blur filters in high-performance mode", () => {
    const offenders = getTsxFilesRecursively(SRC_DIR).flatMap((file) => {
      const tokens = readFileSync(file, "utf8").match(/\b[a-z0-9:-]*blur-[^\s"'`]+/gi) ?? [];
      const filterTokens = tokens.filter((token) => !/(?:^|:)backdrop-blur-/.test(token));
      return filterTokens.map((token) => `${path.relative(SRC_DIR, file)}: ${token}`);
    });

    expect(
      offenders,
      `Use CSS radial gradients for ambient glows instead of filter-based blur utilities:\n${offenders.join("\n")}`,
    ).toEqual([]);

    for (const variant of [
      ".ambient-glow",
      ".ambient-glow-subtle",
      ".ambient-glow-prominent",
      ".ambient-glow-danger",
      ".ambient-glow-light",
    ]) {
      expect(css).toContain(variant);
    }
  });

  it("keeps the About modal and worker portal free of ambient glows", () => {
    for (const relativePath of [
      "../../components/ui/AboutModal.view.tsx",
      "../../features/worker-portal/views/WorkerPortal.view.tsx",
    ]) {
      expect(readFileSync(path.resolve(__dirname, relativePath), "utf8")).not.toContain(
        "ambient-glow",
      );
    }
  });

  it("uses the active theme colors for autofilled credential fields", () => {
    expect(css).toContain("var(--surface-stripe) inset !important");
    expect(css).toContain("-webkit-text-fill-color: var(--text-primary) !important;");
    expect(css).toContain("background-color: var(--surface-stripe) !important;");
    expect(css).toContain("color: var(--text-primary) !important;");
  });
});
