import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("better-auth schema", () => {
  it("declara las tablas necesarias", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Account");
    expect(schema).toContain("model Verification");
    expect(schema).toContain("model User");
  });
});
