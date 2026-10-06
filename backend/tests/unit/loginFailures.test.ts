import { describe, expect, it } from "vitest";
import {
  clearLoginFailures,
  extractUserKey,
  inspectLoginFailures,
  recordLoginFailure,
} from "../../src/services/loginFailures";
describe("Shared identity throttle", () => {
  it("extracts only string username or employeeId", () => {
    expect(extractUserKey(null)).toBe("");
    expect(extractUserKey({ username: [] })).toBe("");
    expect(extractUserKey({ employeeId: "e1" })).toBe("e1");
    expect(extractUserKey({ username: "alice", employeeId: "e1" })).toBe("alice");
  });
  it.each(["username", "employeeId"])(
    "normalizes %s, isolates IP and identity, then clears failures",
    async (field) => {
      const ip = `test-${field}`;
      expect(await inspectLoginFailures(ip, { [field]: "Alice" })).toBeNull();
      for (let i = 0; i < 30; i++) await recordLoginFailure(ip, " ALICE ");
      expect(await inspectLoginFailures(ip, { [field]: "alice" })).toMatchObject({
        message: expect.stringContaining("Demasiados intentos"),
        retryAfter: expect.any(Number),
      });
      expect(await inspectLoginFailures(`${ip}-other`, { [field]: "alice" })).toBeNull();
      expect(await inspectLoginFailures(ip, { [field]: "bob" })).toBeNull();
      await clearLoginFailures(ip, "Alice");
      expect(await inspectLoginFailures(ip, { [field]: "alice" })).toBeNull();
    },
  );
});
