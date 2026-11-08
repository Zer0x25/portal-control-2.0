import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("kiosk guardrails", () => {
  it("Kiosk_Employee sigue con allowlist explícito fuera de better-auth", () => {
    const auth = readFileSync("src/modules/auth/application/authenticate.ts", "utf8");
    expect(auth).toContain("Kiosk_Employee");
    expect(auth).toContain("KIOSK_ALLOWED_PATHS");
    const authService = readFileSync("src/services/AuthService.ts", "utf8");
    expect(authService).toContain("verifyKioskPin");
    expect(authService).toContain("Kiosk_Employee");
  });
});
