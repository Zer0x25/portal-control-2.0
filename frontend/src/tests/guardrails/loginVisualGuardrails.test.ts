import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const INDEX_CSS = path.resolve(__dirname, "../../index.css");
const LOGIN_PAGE = path.resolve(__dirname, "../../features/auth/pages/LoginPage.tsx");
const css = readFileSync(INDEX_CSS, "utf8");
const loginPage = readFileSync(LOGIN_PAGE, "utf8");

describe("Login visual guardrails", () => {
  it("keeps the login spotlight diffuse without relying on filters", () => {
    const gradientRule = css.match(/\.login-ambient-glow\s*\{([^}]+)\}/s)?.[1] ?? "";

    expect(loginPage).toContain("login-ambient-glow");
    expect(loginPage).not.toContain("blur-[120px]");
    expect(gradientRule).toContain("radial-gradient(");
    expect(gradientRule).toContain("ellipse 70% 55%");
    expect(gradientRule).not.toMatch(/\bfilter\s*:/);
  });

  it("uses the active theme colors for autofilled credential fields", () => {
    expect(css).toContain("var(--surface-stripe) inset !important");
    expect(css).toContain("-webkit-text-fill-color: var(--text-primary) !important;");
    expect(css).toContain("background-color: var(--surface-stripe) !important;");
    expect(css).toContain("color: var(--text-primary) !important;");
  });
});
