import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import {
  createAuthenticate,
  type AuthenticationDependencies,
} from "../../src/modules/auth/application/authenticate";

const secret = "test-only-authentication-secret";
const now = new Date("2026-10-06T12:00:00Z");
function fixture() {
  const user = { id: "u1", username: "persisted", role: "Supervisor", employeeId: null };
  const deps: AuthenticationDependencies = {
    verify: (token) => jwt.verify(token, secret) as typeof user,
    hash: (token) => crypto.createHash("sha256").update(token).digest("hex"),
    now: () => now,
    sessions: {
      find: vi.fn(async () => ({
        id: "s1",
        userId: "u1",
        expiresAt: new Date(now.getTime() + 60000),
        lastActive: new Date(now.getTime() - 120000),
      })),
      remove: vi.fn(async () => {}),
      touch: vi.fn(async () => {}),
    },
    users: { find: vi.fn(async () => user) },
  };
  return {
    deps,
    user,
    authenticate: createAuthenticate(deps),
    token: jwt.sign({ ...user, role: "Administrador" }, secret, { expiresIn: "1h" }),
  };
}
describe("Shared authentication with real JWT verification", () => {
  it("uses persisted role instead of token claim, hashes session and touches stale activity", async () => {
    const { deps, user, token, authenticate } = fixture();
    expect(await authenticate(token)).toEqual(user);
    expect(deps.sessions.find).toHaveBeenCalledWith(deps.hash(token));
    expect(deps.sessions.touch).toHaveBeenCalledWith("s1", now);
  });
  it.each([
    undefined,
    "invalid",
    jwt.sign({ id: "u1", username: "u", role: "Usuario" }, "wrong-secret"),
    jwt.sign({ id: "u1", username: "u", role: "Usuario", exp: 1 }, secret),
  ])("rejects missing/invalid/expired token %s", async (token) => {
    const { deps, authenticate } = fixture();
    await expect(authenticate(token)).rejects.toMatchObject({ statusCode: 401 });
    expect(deps.sessions.find).not.toHaveBeenCalled();
  });
  it("rejects revoked session", async () => {
    const f = fixture();
    vi.mocked(f.deps.sessions.find).mockResolvedValue(null);
    await expect(f.authenticate(f.token)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("removes expired session and rejects before reading user", async () => {
    const f = fixture();
    vi.mocked(f.deps.sessions.find).mockResolvedValue({
      id: "s1",
      userId: "u1",
      expiresAt: new Date(0),
      lastActive: now,
    });
    await expect(f.authenticate(f.token)).rejects.toMatchObject({ statusCode: 401 });
    expect(f.deps.sessions.remove).toHaveBeenCalledWith("s1");
    expect(f.deps.users.find).not.toHaveBeenCalled();
  });
  it("retains short-lived kiosk session exemption", async () => {
    const f = fixture();
    const token = jwt.sign({ id: "k", username: "kiosk", role: "Kiosk_Employee" }, secret, {
      expiresIn: "2m",
    });
    expect(await f.authenticate(token)).toMatchObject({ role: "Kiosk_Employee" });
    expect(f.deps.sessions.find).not.toHaveBeenCalled();
  });
  it("activity update failure is best effort", async () => {
    const f = fixture();
    vi.mocked(f.deps.sessions.touch).mockRejectedValue(new Error("touch failed"));
    expect(await f.authenticate(f.token)).toEqual(f.user);
  });
});
