import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { authPlugin, createAuthFlows, type AuthFlowDependencies } from "../../src/modules/auth";
import { AuthError } from "../../src/utils/AppError";
import { mapHttpError } from "../../src/utils/httpError";

const apps: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
function fixture() {
  const user = {
    id: "u1",
    username: "alice",
    role: "Supervisor",
    employeeId: null,
    mfaEnabled: false,
    credentialStamp: "private-credential-proof",
  };
  const deps: AuthFlowDependencies = {
    service: {
      authenticate: vi.fn(async () => ({ success: true, user })),
      generateMFAPendingToken: () => "pending",
      manageSessionLimit: vi.fn(async () => {}),
      createSession: vi.fn(async () => ({ token: "access", role: user.role })),
      verifyKioskPin: vi.fn(async () => ({
        success: true,
        employeeName: "Employee",
        token: "kiosk",
      })),
      revokeSession: vi.fn(async () => {}),
      setupMFA: vi.fn(async () => ({ qrCode: "qr", secret: "secret" })),
      confirmMFASetup: vi.fn(async () => true),
      validateMFALogin: vi.fn(async () => ({ success: true, user })),
    },
    failures: { record: vi.fn(async () => {}), clear: vi.fn(async () => {}) },
    audit: vi.fn(async () => {}),
    log: vi.fn(),
  };
  const inspectFailures = vi.fn(
    async (_ip: string, _body: unknown): Promise<{ retryAfter: number; message: string } | null> =>
      null,
  );
  const app = Fastify({ logger: false });
  app.decorateRequest("user", undefined);
  app.setErrorHandler((error, _request, reply) => {
    const mapped = mapHttpError(error);
    return reply.code(mapped.statusCode).send(mapped.body);
  });
  app.register(authPlugin, {
    flows: createAuthFlows(deps),
    inspectFailures,
    authenticate: async (request) => {
      if (request.headers.authorization !== "Bearer access")
        throw new AuthError("Token de acceso no proporcionado");
      request.user = user;
    },
  });
  apps.push(app);
  return { app, deps, inspectFailures };
}
describe("Auth Fastify adapter", () => {
  it.each([
    ["login", { username: [], password: "valid" }],
    ["login", { username: "alice" }],
    ["kiosk-login", { employeeId: "e1", pin: {} }],
    ["mfa/verify", { token: "" }],
    ["mfa/validate", { mfaToken: "pending", code: "12345" }],
    ["mfa/validate", { mfaToken: [], code: "123456" }],
  ])("rejects malformed %s before service effects", async (path, payload) => {
    const f = fixture();
    const res = await f.app.inject({
      method: "POST",
      url: `/api/auth/${path}`,
      payload,
      headers: { authorization: "Bearer access" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("VALIDATION_ERROR");
    for (const method of [
      f.deps.service.authenticate,
      f.deps.service.verifyKioskPin,
      f.deps.service.confirmMFASetup,
      f.deps.service.validateMFALogin,
    ])
      expect(method).not.toHaveBeenCalled();
  });
  it.each(["mfa/setup", "mfa/verify"])("authenticates %s before parsing JSON", async (path) => {
    const f = fixture();
    const res = await f.app.inject({
      method: "POST",
      url: `/api/auth/${path}`,
      payload: "{broken",
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(401);
    expect(f.deps.service.setupMFA).not.toHaveBeenCalled();
  });
  it.each(["login", "kiosk-login"])(
    "throttles %s before validation, preserves legacy 429 payload and Retry-After",
    async (path) => {
      const f = fixture();
      f.inspectFailures.mockResolvedValue({ retryAfter: 37, message: "Demasiados intentos." });
      const res = await f.app.inject({ method: "POST", url: `/api/auth/${path}`, payload: {} });
      expect(res.statusCode).toBe(429);
      expect(res.headers["retry-after"]).toBe("37");
      expect(res.json()).toEqual({ message: "Demasiados intentos." });
      expect(f.inspectFailures).toHaveBeenCalledWith("127.0.0.1", {});
      expect(f.deps.service.authenticate).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["login", { username: "alice", password: "valid" }, "Login exitoso"],
    ["kiosk-login", { employeeId: "e1", pin: "1234" }, "Verificación exitosa"],
    ["mfa/validate", { mfaToken: "pending", code: "123456" }, "Autenticación de dos pasos exitosa"],
    ["mfa/verify", { token: "123456" }, "MFA habilitado correctamente"],
  ])("executes validated %s and returns the expected body", async (path, payload, message) => {
    const f = fixture();
    const res = await f.app.inject({
      method: "POST",
      url: `/api/auth/${path}`,
      payload,
      headers: { authorization: "Bearer access" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ message });
  });
  it("setup and logout accept absent body and logout revokes header token only", async () => {
    const f = fixture();
    expect(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/auth/mfa/setup",
          headers: { authorization: "Bearer access" },
        })
      ).json(),
    ).toMatchObject({ secret: "secret", qrCode: "qr" });
    const logout = await f.app.inject({
      method: "POST",
      url: "/api/auth/logout?token=ignored",
      headers: { authorization: "Bearer access" },
    });
    expect(logout.statusCode).toBe(200);
    expect(f.deps.service.revokeSession).toHaveBeenCalledWith("access");
    expect((await f.app.inject({ method: "POST", url: "/api/auth/logout" })).statusCode).toBe(200);
  });
});
