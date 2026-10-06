import { describe, expect, it, vi } from "vitest";
import { createAuthFlows, type AuthFlowDependencies } from "../../src/modules/auth";

function fixture() {
  const user = {
    id: "u1",
    username: "alice",
    role: "Supervisor_Elevado",
    employeeId: null,
    mfaEnabled: false,
    isForcePasswordChange: true,
  };
  const deps: AuthFlowDependencies = {
    service: {
      authenticate: vi.fn(async () => ({ success: true, user })),
      generateMFAPendingToken: vi.fn(() => "pending"),
      manageSessionLimit: vi.fn(async () => {}),
      createSession: vi.fn(async () => ({ token: "access", role: user.role })),
      verifyKioskPin: vi.fn(async () => ({
        success: true,
        token: "kiosk",
        employeeName: "Employee",
      })),
      revokeSession: vi.fn(async () => {}),
      setupMFA: vi.fn(async () => ({ qrCode: "data:image/png;base64,fixture", secret: "secret" })),
      confirmMFASetup: vi.fn(async () => true),
      validateMFALogin: vi.fn(async () => ({ success: true, user })),
    },
    failures: { record: vi.fn(async () => {}), clear: vi.fn(async () => {}) },
    audit: vi.fn(async () => {}),
    log: vi.fn(),
  };
  return { deps, user, flows: createAuthFlows(deps) };
}
const context = { ip: "127.0.0.1", userAgent: "test-agent", user: { id: "u1", username: "alice" } };
describe("Shared auth flows", () => {
  it("creates session, normalizes role, clears failures and audits login without credentials", async () => {
    const f = fixture();
    expect(await f.flows.login({ username: "ALICE", password: "sensitive" }, context)).toEqual({
      status: 200,
      body: {
        userId: "u1",
        username: "alice",
        role: "Supervisor Elevado",
        employeeId: null,
        token: "access",
        mustChangePassword: true,
        message: "Login exitoso",
      },
    });
    expect(f.deps.service.createSession).toHaveBeenCalledWith(
      "u1",
      "alice",
      "Supervisor_Elevado",
      null,
      "test-agent",
    );
    expect(f.deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN_SUCCESS", actorUsername: "alice" }),
    );
    expect(JSON.stringify(vi.mocked(f.deps.audit).mock.calls)).not.toContain("sensitive");
    expect(f.deps.failures.clear).toHaveBeenCalledWith(context.ip, "alice");
  });
  it("records failed credentials before raising 401 without creating session", async () => {
    const f = fixture();
    vi.mocked(f.deps.service.authenticate).mockResolvedValue({
      success: false,
      reason: "INVALID_CREDENTIALS",
    });
    await expect(
      f.flows.login({ username: "alice", password: "wrong" }, context),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(f.deps.failures.record).toHaveBeenCalledWith(context.ip, "alice");
    expect(f.deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN_FAILED", outcome: "FAILURE" }),
    );
    expect(f.deps.service.createSession).not.toHaveBeenCalled();
  });
  it("rejects archived users without session or failure counter", async () => {
    const f = fixture();
    vi.mocked(f.deps.service.authenticate).mockResolvedValue({
      success: false,
      reason: "USER_ARCHIVED",
    });
    await expect(
      f.flows.login({ username: "alice", password: "valid" }, context),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(f.deps.failures.record).not.toHaveBeenCalled();
    expect(f.deps.service.createSession).not.toHaveBeenCalled();
  });
  it("returns MFA challenge without creating session, success audit or clearing failures", async () => {
    const f = fixture();
    f.user.mfaEnabled = true;
    expect(await f.flows.login({ username: "alice", password: "valid" }, context)).toMatchObject({
      body: { mfaRequired: true, mfaToken: "pending", userId: "u1" },
    });
    expect(f.deps.service.createSession).not.toHaveBeenCalled();
    expect(f.deps.audit).not.toHaveBeenCalled();
    expect(f.deps.failures.clear).not.toHaveBeenCalled();
  });
  it("completes MFA session and audits distinct success", async () => {
    const f = fixture();
    expect(
      await f.flows.validateMFA({ mfaToken: "pending", code: "123456" }, context),
    ).toMatchObject({ body: { token: "access", message: "Autenticación de dos pasos exitosa" } });
    expect(f.deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN_MFA_SUCCESS" }),
    );
  });
  it("rejects invalid MFA code without creating session", async () => {
    const f = fixture();
    vi.mocked(f.deps.service.validateMFALogin).mockResolvedValue({ success: false });
    await expect(
      f.flows.validateMFA({ mfaToken: "pending", code: "000000" }, context),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(f.deps.service.createSession).not.toHaveBeenCalled();
  });
  it("sets up and confirms MFA only with an authenticated user", async () => {
    const f = fixture();
    await expect(f.flows.setupMFA({})).rejects.toMatchObject({ statusCode: 401 });
    expect(await f.flows.setupMFA(context)).toMatchObject({ body: { secret: "secret" } });
    expect(await f.flows.verifyMFASetup({ token: "123456" }, context)).toMatchObject({
      body: { message: "MFA habilitado correctamente" },
    });
    expect(f.deps.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "MFA_ENABLED" }));
  });
  it("invalid setup code never audits enabling MFA", async () => {
    const f = fixture();
    vi.mocked(f.deps.service.confirmMFASetup).mockResolvedValue(false);
    await expect(f.flows.verifyMFASetup({ token: "000000" }, context)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(f.deps.audit).not.toHaveBeenCalled();
  });
  it.each([
    ["NOT_FOUND", 404],
    ["BLOCKED", 403],
    ["INVALID_PIN", 401],
  ] as const)("preserves kiosk %s status %s and records failure", async (reason, status) => {
    const f = fixture();
    vi.mocked(f.deps.service.verifyKioskPin).mockResolvedValue({
      success: false,
      reason,
      attempts: 5,
      isBlocked: true,
    });
    expect(await f.flows.kioskLogin({ employeeId: "e1", pin: "bad" }, context)).toMatchObject({
      status,
    });
    expect(f.deps.failures.record).toHaveBeenCalledWith(context.ip, "e1");
  });
  it("successful kiosk clears failures and returns legacy shape", async () => {
    const f = fixture();
    expect(await f.flows.kioskLogin({ employeeId: "e1", pin: "1234" }, context)).toEqual({
      status: 200,
      body: {
        success: true,
        message: "Verificación exitosa",
        employeeName: "Employee",
        token: "kiosk",
      },
    });
    expect(f.deps.failures.clear).toHaveBeenCalledWith(context.ip, "e1");
  });
  it("logout with and without token is idempotent and uses anonymous actor by default", async () => {
    const f = fixture();
    await f.flows.logout(undefined, {});
    expect(f.deps.service.revokeSession).not.toHaveBeenCalled();
    expect(await f.flows.logout("access", context)).toEqual({
      status: 200,
      body: { message: "Logout exitoso" },
    });
    expect(f.deps.service.revokeSession).toHaveBeenCalledWith("access");
    expect(f.deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUsername: "ANONYMOUS" }),
    );
  });
  it("session persistence failure does not audit success or clear failures", async () => {
    const f = fixture();
    vi.mocked(f.deps.service.createSession).mockRejectedValue(new Error("database unavailable"));
    await expect(f.flows.login({ username: "alice", password: "valid" }, context)).rejects.toThrow(
      "database unavailable",
    );
    expect(f.deps.audit).not.toHaveBeenCalled();
    expect(f.deps.failures.clear).not.toHaveBeenCalled();
  });
  it("preserves default user-agent/IP and force-password-change flag", async () => {
    const f = fixture();
    vi.mocked(f.deps.service.authenticate).mockResolvedValue({
      success: true,
      user: { id: "u1", username: "alice", role: "Usuario", employeeId: null, mfaEnabled: false },
    });
    expect(await f.flows.login({ username: "alice", password: "valid" }, {})).toMatchObject({
      body: { mustChangePassword: false },
    });
    expect(f.deps.service.createSession).toHaveBeenCalledWith(
      "u1",
      "alice",
      "Usuario",
      null,
      "Unknown",
    );
    expect(f.deps.service.authenticate).toHaveBeenCalledWith("alice", "valid", "unknown");
  });
  it("rejects incomplete service results before emitting success effects", async () => {
    const f = fixture();
    vi.mocked(f.deps.service.authenticate).mockResolvedValue({ success: true });
    await expect(f.flows.login({ username: "alice", password: "valid" }, context)).rejects.toThrow(
      "missing user",
    );
    vi.mocked(f.deps.service.validateMFALogin).mockResolvedValue({ success: true });
    await expect(
      f.flows.validateMFA({ mfaToken: "pending", code: "123456" }, context),
    ).rejects.toThrow("missing user");
    vi.mocked(f.deps.service.verifyKioskPin).mockResolvedValue({ success: true });
    await expect(f.flows.kioskLogin({ employeeId: "e1", pin: "1234" }, context)).rejects.toThrow(
      "missing identity",
    );
    expect(f.deps.audit).not.toHaveBeenCalled();
  });
});
