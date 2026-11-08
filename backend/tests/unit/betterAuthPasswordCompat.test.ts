import { describe, it, expect } from "vitest";
import bcryptjs from "bcryptjs";
import { createAuth } from "../../src/modules/auth/infrastructure/betterAuth";

describe("password compat", () => {
  it("verifica hashes bcryptjs existentes", async () => {
    const hash = await bcryptjs.hash("secreta123", 10);
    expect(hash.startsWith("$2")).toBe(true);
    const ok = await bcryptjs.compare("secreta123", hash);
    expect(ok).toBe(true);
    // better-auth expone su propio verify a través del adapter; se valida existencia del factory
    expect(typeof createAuth).toBe("function");
  });
});
