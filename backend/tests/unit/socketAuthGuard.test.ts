import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("socket auth batch guardrails", () => {
  it("authorizeSocketTokens usa batch findMany (no N+1 por socket)", () => {
    const src = readFileSync("src/services/socketAuthentication.ts", "utf8");
    expect(src).toContain("findMany");
    expect(src).toContain("tokenHash");
    expect(src).toContain("in:");
    expect(src).not.toMatch(/for\s*\([^)]*\)\s*\{[^}]*findUnique/);
    expect(src).not.toContain("findUnique");
  });
});
