import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import {
  createAuthenticate,
  type AuthenticationDependencies,
} from "../../src/modules/auth/application/authenticate";
import { resolveAccessToken } from "../../src/modules/auth/infrastructure/jwt";

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
    employees: { findStatus: vi.fn(async () => ({ status: "Activo" })) },
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
  it("expired session removal failure is best effort and still rejects with session expired", async () => {
    const f = fixture();
    vi.mocked(f.deps.sessions.find).mockResolvedValue({
      id: "s1",
      userId: "u1",
      expiresAt: new Date(0),
      lastActive: now,
    });
    vi.mocked(f.deps.sessions.remove).mockRejectedValue(new Error("remove failed"));
    await expect(f.authenticate(f.token)).rejects.toMatchObject({
      statusCode: 401,
      message: "Sesión expirada",
    });
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
  describe("Anti-regression: Kiosk path lockdown, archived rejection & force password change", () => {
    it("resolves access token exclusively from Authorization Bearer header", () => {
      expect(resolveAccessToken("Bearer my-jwt-token")).toBe("my-jwt-token");
      expect(resolveAccessToken("bearer my-jwt-token")).toBe("my-jwt-token");
      expect(resolveAccessToken("Token my-jwt-token")).toBeUndefined();
      expect(resolveAccessToken("Bearer   ")).toBeUndefined();
      expect(resolveAccessToken(undefined)).toBeUndefined();
    });

    it.each([
      ["POST", "/api/records/punch"],
      ["GET", "/api/records"],
      ["GET", "/api/records?since=1000"],
      ["GET", "/api/records?employeeId=k-1&pageSize=1"],
      ["PUT", "/api/employees/k-1"],
      ["POST", "/api/auth/logout"],
    ] as const)("allows active kiosk token on %s %s and sets employeeId", async (method, path) => {
      const f = fixture();
      const token = jwt.sign(
        { id: "k-1", username: "kiosk", role: "Kiosk_Employee", employeeId: "k-1" },
        secret,
        { expiresIn: "2m" },
      );
      const user = await f.authenticate(token, path, method);
      expect(user).toMatchObject({ role: "Kiosk_Employee", employeeId: "k-1" });
    });

    it.each([
      ["GET", "/api/records/daily-attendance"],
      ["GET", "/api/records/export"],
      ["POST", "/api/records"],
      ["GET", "/api/records?employeeId=EMP-OTHER"],
      ["GET", "/api/employees/k-1"],
      ["PUT", "/api/employees/EMP-OTHER"],
      ["GET", "/api/corrections"],
      ["POST", "/api/corrections"],
      ["GET", "/api/shifts"],
      ["GET", "/api/holidays"],
      ["GET", "/api/export/calendar-pdf"],
      ["GET", "/api/users"],
      ["GET", "/api/admin/status"],
      ["GET", "/api/configs"],
      ["GET", "/api/export/report-pdf"],
    ] as const)("rejects kiosk token on unpermitted %s %s with 403", async (method, path) => {
      const f = fixture();
      const token = jwt.sign(
        { id: "k-1", username: "kiosk", role: "Kiosk_Employee", employeeId: "k-1" },
        secret,
        { expiresIn: "2m" },
      );
      await expect(f.authenticate(token, path, method)).rejects.toMatchObject({
        statusCode: 403,
        message: "Token de kiosco no autorizado para este recurso",
      });
    });

    it("rejects kiosk token when linked employee is archived or missing", async () => {
      const f = fixture();
      vi.mocked(f.deps.employees!.findStatus).mockResolvedValueOnce({ status: "Archivado" });
      const token = jwt.sign(
        { id: "k-1", username: "kiosk", role: "Kiosk_Employee", employeeId: "k-1" },
        secret,
        { expiresIn: "2m" },
      );
      await expect(f.authenticate(token, "/api/records/punch", "POST")).rejects.toMatchObject({
        statusCode: 403,
      });

      vi.mocked(f.deps.employees!.findStatus).mockResolvedValueOnce(null);
      await expect(f.authenticate(token, "/api/records/punch", "POST")).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("rejects existing session when persisted user role is Archivado", async () => {
      const f = fixture();
      vi.mocked(f.deps.users.find).mockResolvedValue({
        id: "u1",
        username: "persisted",
        role: "Archivado",
        employeeId: null,
        isForcePasswordChange: false,
      });

      await expect(f.authenticate(f.token, "/api/records", "GET")).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("restricts user with isForcePasswordChange to PUT self user route, logout, and health routes", async () => {
      const f = fixture();
      vi.mocked(f.deps.users.find).mockResolvedValue({
        id: "u1",
        username: "persisted",
        role: "Usuario",
        isForcePasswordChange: true,
      });

      await expect(f.authenticate(f.token, "/api/users/u1", "PUT")).resolves.toMatchObject({
        id: "u1",
      });
      await expect(
        f.authenticate(f.token, "/api/users/u1?refresh=true", "PUT"),
      ).resolves.toMatchObject({
        id: "u1",
      });
      await expect(f.authenticate(f.token, "/api/auth/logout", "POST")).resolves.toMatchObject({
        id: "u1",
      });
      await expect(f.authenticate(f.token, "/api/health/ready", "GET")).resolves.toMatchObject({
        id: "u1",
      });

      for (const [method, path] of [
        ["POST", "/api/auth/change-password"],
        ["POST", "/api/auth/mfa/setup"],
        ["POST", "/api/auth/mfa/verify"],
        ["GET", "/api/auth/session"],
        ["DELETE", "/api/users/u1"],
        ["GET", "/api/records"],
        ["PUT", "/api/users/other-user"],
      ] as const) {
        await expect(f.authenticate(f.token, path, method)).rejects.toMatchObject({
          statusCode: 403,
          message: "Debe actualizar su contraseña temporal antes de continuar",
        });
      }

      await expect(f.authenticate(f.token)).rejects.toMatchObject({
        statusCode: 403,
        message: "Debe actualizar su contraseña temporal antes de continuar",
      });
    });
  });
});
