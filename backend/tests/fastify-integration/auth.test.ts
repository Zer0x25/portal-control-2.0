import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { UserService } from "../../src/services/UserService";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import type { FastifyInstance } from "fastify";
import type { Prisma } from "../../src/generated/prisma/client";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { clearLoginFailures } from "../../src/services/loginFailures";
import { SocketService } from "../../src/services/socketService";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";

let app: FastifyInstance;
const password = "integration-auth-password";
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const secret = () => process.env.JWT_SECRET!;
async function user(
  username = "alice",
  role: Prisma.UserCreateInput["role"] = "Supervisor",
  mfaEnabled = false,
  isForcePasswordChange = false,
) {
  await clearLoginFailures("127.0.0.1", username);
  return prismaDirect.user.create({
    data: {
      username,
      role,
      passwordHash: bcrypt.hashSync(password, 4),
      mfaEnabled,
      mfaSecret: mfaEnabled ? speakeasy.generateSecret().base32 : null,
      isForcePasswordChange,
    },
  });
}
const login = (username = "alice", suppliedPassword = password) =>
  app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password: suppliedPassword },
    headers: { "user-agent": "fastify-integration" },
  });
async function employee() {
  await clearLoginFailures("127.0.0.1", "employee-test");
  return prismaDirect.employee.create({
    data: {
      id: "employee-test",
      name: "Employee Test",
      rut: "12345678-9",
      position: "Operator",
      area: "Ops",
      workdayType: "Normal",
      status: "Activo",
      pin: "1234",
    },
  });
}
const kiosk = (pin: string, employeeId = "employee-test") =>
  app.inject({ method: "POST", url: "/api/auth/kiosk-login", payload: { employeeId, pin } });
const headers = (token: string) => ({ authorization: `Bearer ${token}` });
beforeAll(async () => {
  await assertConnectedToTestDb();
  app = createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  });
  await app.ready();
});
beforeEach(async () => {
  await resetIntegrationDb();
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await resetIntegrationDb();
  await app?.close();
});

describe("Fastify auth on disposable PostgreSQL with real bcrypt/JWT/MFA/session transactions", () => {
  it("returns the login contract, signs valid claims and persists only hash/device/expiry", async () => {
    const actor = await user();
    const migrated = await login("ALICE");
    expect(migrated.statusCode).toBe(200);
    const { token, ...body } = migrated.json();
    expect(body).toMatchObject({
      userId: actor.id,
      username: "alice",
      role: "Supervisor",
      employeeId: null,
      mustChangePassword: false,
      message: "Login exitoso",
    });
    const claims = jwt.verify(token, secret());
    expect(claims).toMatchObject({
      id: actor.id,
      username: "alice",
      role: "Supervisor",
      employeeId: null,
      jti: expect.any(String),
    });
    const session = await prismaDirect.activeSession.findUniqueOrThrow({
      where: { tokenHash: hash(token) },
    });
    expect(session.userId).toBe(actor.id);
    expect(session.deviceInfo).toBe("fastify-integration");
    expect(session.expiresAt.getTime() - Date.now()).toBeGreaterThan(3500000);
    expect(
      (await app.inject({ url: "/api/holidays?showArchived=true", headers: headers(token) }))
        .statusCode,
    ).toBe(200);
    expect(
      await prismaDirect.auditLog.count({
        where: { actorUsername: "alice", action: "LOGIN_SUCCESS" },
      }),
    ).toBe(1);
  });
  it.each([
    ["wrong", "Supervisor", 401],
    [password, "Archivado", 403],
  ] as const)(
    "preserves rejected login %s/%s status %s with no session",
    async (supplied, role, status) => {
      await user("alice", role);
      const migrated = await login("alice", supplied);
      expect(migrated.statusCode).toBe(status);
      expect(migrated.json()).toMatchObject({
        message:
          status === 401
            ? "Credenciales inválidas"
            : "Acceso denegado: Su cuenta de usuario está archivada",
      });
      expect(await prismaDirect.activeSession.count()).toBe(0);
      expect(await prismaDirect.auditLog.count({ where: { action: "LOGIN_FAILED" } })).toBe(
        status === 401 ? 1 : 0,
      );
    },
  );
  it("returns missing-field validation errors before DB effects", async () => {
    const migrated = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "alice" },
    });
    expect(migrated.statusCode).toBe(400);
    expect(await prismaDirect.activeSession.count()).toBe(0);
  });
  it.each([
    ["Usuario", 1, 3],
    ["Reloj_Control", 2, 3],
    ["Administrador", 10, 11],
  ] as const)(
    "serializes concurrent %s logins to %s sessions with distinct jti",
    async (role, limit, attempts) => {
      const actor = await user("concurrent", role);
      await AuthService.createSession(actor.id, actor.username, role, null, "seed");
      const results = await Promise.all(
        Array.from({ length: attempts }, () => login("concurrent")),
      );
      expect(results.every((response) => response.statusCode === 200)).toBe(true);
      const tokens: string[] = results.map((response) => response.json().token);
      expect(new Set(tokens).size).toBe(attempts);
      const sessions = await prismaDirect.activeSession.findMany({ where: { userId: actor.id } });
      expect(sessions).toHaveLength(limit);
      const checks = await Promise.all(
        tokens.map((token) =>
          app.inject({ url: "/api/holidays?showArchived=true", headers: headers(token) }),
        ),
      );
      expect(checks.filter((response) => response.statusCode === 200)).toHaveLength(limit);
      if (role === "Usuario") {
        const claims = jwt.verify(tokens[0], secret()) as jwt.JwtPayload;
        expect(claims.exp! - claims.iat!).toBe(108);
        expect(sessions[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(100000);
        expect(sessions[0].expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(108000);
      }
    },
  );
  it("logout is idempotent, revokes persisted session, emits force logout and attributes real actorUsername", async () => {
    const forceSessionSpy = vi
      .spyOn(SocketService, "emitForceLogoutToSession")
      .mockImplementation(() => {});
    await user();
    const token = (await login()).json().token;
    for (let i = 0; i < 2; i++) {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        headers: headers(token),
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: "Logout exitoso" });
    }
    expect(forceSessionSpy).toHaveBeenCalledWith(hash(token), {
      isHash: true,
      reason: "SESSION_INVALIDATED",
    });
    expect(
      await prismaDirect.activeSession.findUnique({ where: { tokenHash: hash(token) } }),
    ).toBeNull();
    expect((await app.inject({ url: "/api/holidays", headers: headers(token) })).statusCode).toBe(
      401,
    );
    expect((await app.inject({ method: "POST", url: "/api/auth/logout" })).json()).toEqual({
      message: "Logout exitoso",
    });
    expect(
      await prismaDirect.auditLog.count({
        where: { action: "LOGOUT", actorUsername: "alice" },
      }),
    ).toBe(2);
    expect(
      await prismaDirect.auditLog.count({
        where: { action: "LOGOUT", actorUsername: "ANONYMOUS" },
      }),
    ).toBe(1);
  });
  it("rejects persisted session expiry and removes expired row", async () => {
    await user("alice", "Administrador");
    const token = (await login()).json().token;
    await prismaDirect.activeSession.update({
      where: { tokenHash: hash(token) },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (await app.inject({ method: "POST", url: "/api/auth/mfa/setup", headers: headers(token) }))
        .statusCode,
    ).toBe(401);
    expect(await prismaDirect.activeSession.count()).toBe(0);
  });
  it("real QR setup and TOTP verify enable MFA, then challenge completion creates exactly one session and updates lastLogin", async () => {
    const actor = await user("alice", "Administrador");
    const access = (await login()).json().token;
    const afterLogin = await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } });
    expect(afterLogin.lastLogin).toBeInstanceOf(Date);
    const setup = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/setup",
      headers: headers(access),
    });
    expect(setup.statusCode).toBe(200);
    const generated = setup.json();
    expect(generated.qrCode).toMatch(/^data:image\/png;base64,/);
    const dbUser = await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } });
    expect(dbUser.mfaSecret).toBe(generated.secret);
    expect(dbUser.mfaEnabled).toBe(false);
    const invalid = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/verify",
      headers: headers(access),
      payload: { token: "abcdef" },
    });
    expect(invalid.statusCode).toBe(400);
    const code = speakeasy.totp({ secret: generated.secret, encoding: "base32" });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/mfa/verify",
          headers: headers(access),
          payload: { token: code },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } })).mfaEnabled,
    ).toBe(true);
    await prismaDirect.activeSession.deleteMany();
    await prismaDirect.user.update({ where: { id: actor.id }, data: { lastLogin: null } });
    const challenge = await login();
    expect(challenge.statusCode).toBe(200);
    const { mfaToken: migratedPending } = challenge.json();
    expect(jwt.verify(migratedPending, secret())).toMatchObject({ id: actor.id, mfaPending: true });
    expect(challenge.json()).toMatchObject({ mfaRequired: true, userId: actor.id });
    expect(challenge.json()).not.toHaveProperty("token");
    expect(await prismaDirect.activeSession.count()).toBe(0);
    const pending = challenge.json().mfaToken;
    const claims = jwt.verify(pending, secret()) as jwt.JwtPayload;
    expect(claims.exp! - claims.iat!).toBe(300);
    expect((await app.inject({ url: "/api/holidays", headers: headers(pending) })).statusCode).toBe(
      401,
    );
    const complete = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/validate",
      payload: { mfaToken: pending, code },
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json()).toMatchObject({
      mustChangePassword: false,
      mfaEnabled: true,
      message: "Autenticación de dos pasos exitosa",
    });
    expect(
      (await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } })).lastLogin,
    ).toBeInstanceOf(Date);
    expect(await prismaDirect.activeSession.count()).toBe(1);
    expect(
      await prismaDirect.auditLog.count({
        where: { action: "MFA_ENABLED", actorUsername: "alice" },
      }),
    ).toBe(1);
    expect(
      await prismaDirect.auditLog.count({
        where: { action: "LOGIN_MFA_SUCCESS", actorUsername: "alice" },
      }),
    ).toBe(1);
  });
  it("incorrect TOTP and expired challenge preserve error contract and do not create sessions", async () => {
    const actor = await user("alice", "Supervisor", true);
    const pending = (await login()).json().mfaToken;
    for (const mfaToken of [
      pending,
      jwt.sign({ id: actor.id, mfaPending: true }, secret(), { expiresIn: -1 }),
    ]) {
      const payload = { mfaToken, code: "abcdef" };
      const migrated = await app.inject({ method: "POST", url: "/api/auth/mfa/validate", payload });
      expect(migrated.statusCode).toBe(401);
    }
    expect(await prismaDirect.activeSession.count()).toBe(0);
  });
  it("kiosk signs 5min token without session and supports hashed and default PIN", async () => {
    const emp = await employee();
    const migrated = await kiosk("1234");
    expect(migrated.statusCode).toBe(200);
    const { token: migratedKiosk } = migrated.json();
    expect(jwt.verify(migratedKiosk, secret())).toMatchObject({
      employeeId: emp.id,
      role: "Kiosk_Employee",
    });
    const claims = jwt.verify(migrated.json().token, secret()) as jwt.JwtPayload;
    expect(claims).toMatchObject({ role: "Kiosk_Employee", employeeId: emp.id });
    expect(claims.exp! - claims.iat!).toBe(300);
    expect(await prismaDirect.activeSession.count()).toBe(0);
    const kioskToken = migrated.json().token as string;
    for (const deniedUrl of [
      "/api/holidays?showArchived=true",
      "/api/records/daily-attendance?startDate=2026-01-01&endDate=2026-01-02",
      "/api/records/export?format=json",
      "/api/shifts/assignments",
      "/api/corrections",
      "/api/records?employeeId=OTHER-EMP",
    ]) {
      expect((await app.inject({ url: deniedUrl, headers: headers(kioskToken) })).statusCode).toBe(
        403,
      );
    }
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/employees/OTHER-EMP",
          headers: headers(kioskToken),
          payload: { pin: "9999" },
        })
      ).statusCode,
    ).toBe(403);

    expect(
      (
        await app.inject({
          url: `/api/records?employeeId=${emp.id}&pageSize=1`,
          headers: headers(kioskToken),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/records/punch",
          headers: headers(kioskToken),
          payload: { employeeId: emp.id, source: "KIOSK_PIN", forcedType: "entrada" },
        })
      ).statusCode,
    ).not.toBe(403);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/employees/${emp.id}`,
          headers: headers(kioskToken),
          payload: { pin: "4321" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/logout",
          headers: headers(kioskToken),
        })
      ).statusCode,
    ).toBe(200);
    await prismaDirect.employee.update({
      where: { id: emp.id },
      data: { pin: bcrypt.hashSync("5678", 4), pinFailedAttempts: 2 },
    });
    expect((await kiosk("5678")).statusCode).toBe(200);
    expect(
      (await prismaDirect.employee.findUniqueOrThrow({ where: { id: emp.id } })).pinFailedAttempts,
    ).toBe(0);
    await prismaDirect.employee.update({ where: { id: emp.id }, data: { pin: null } });
    expect((await kiosk(emp.rut.slice(0, 4))).statusCode).toBe(200);
    await prismaDirect.employee.update({ where: { id: emp.id }, data: { status: "Archivado" } });
    expect((await kiosk(emp.rut.slice(0, 4))).statusCode).toBe(403);
    expect(
      (
        await app.inject({
          url: `/api/records?employeeId=${emp.id}`,
          headers: headers(kioskToken),
        })
      ).statusCode,
    ).toBe(403);
  });
  it("five wrong PINs block employee and preserve 401/403/404 bodies", async () => {
    await employee();
    for (let attempts = 1; attempts <= 5; attempts++) {
      const response = await kiosk("wrong");
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ success: false, attempts });
    }
    const emp = await prismaDirect.employee.findUniqueOrThrow({ where: { id: "employee-test" } });
    expect(emp.isPinBlocked).toBe(true);
    expect(emp.pinFailedAttempts).toBe(5);
    const blocked = await kiosk("1234");
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toEqual({ message: "PIN bloqueado. Contacte a un administrador." });
    const missing = await kiosk("1234", "unknown-employee");
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ message: "Empleado no encontrado" });
  });
  it("real shared throttle blocks Fastify after 30 failures and separates identities", async () => {
    await user("throttled");
    await user("other");
    for (let i = 0; i < 30; i++) expect((await login("throttled", "wrong")).statusCode).toBe(401);
    const migrated = await login(" THROTTLED ");
    expect(migrated.statusCode).toBe(429);
    expect(migrated.json().message).toContain("Demasiados intentos");
    expect(Number(migrated.headers["retry-after"])).toBeGreaterThan(0);
    expect((await login("other")).statusCode).toBe(200);
    await clearLoginFailures("127.0.0.1", "throttled");
    expect((await login("throttled")).statusCode).toBe(200);
  });
  it("unexpected auth errors omit credentials in persisted audit metadata on Fastify", async () => {
    vi.spyOn(AuthService, "authenticate").mockRejectedValue(
      new Error("auth dependency unavailable"),
    );
    const payload = {
      username: "redaction",
      password: "sensitive-redaction-password",
      pin: "sensitive-pin",
      code: "sensitive-code",
      mfaToken: "sensitive-mfa",
    };
    expect((await app.inject({ method: "POST", url: "/api/auth/login", payload })).statusCode).toBe(
      500,
    );
    // Observe persisted error auditing.
    await vi.waitFor(async () => {
      expect(await prismaDirect.auditLog.count({ where: { action: "UNHANDLED_ERROR" } })).toBe(1);
    });
    const audits = await prismaDirect.auditLog.findMany({ where: { action: "UNHANDLED_ERROR" } });
    expect(audits).toHaveLength(1);
    for (const audit of audits) {
      expect(audit.metadata).toMatchObject({ path: "/api/auth/login", method: "POST" });
      expect(audit.metadata).not.toHaveProperty("body");
      expect(JSON.stringify(audit.metadata)).not.toContain("sensitive");
    }
  });
  it("enumerates six actual auth routes with correct security classification", async () => {
    const manifest = (app as ReturnType<typeof createFastifyRuntime>).routeManifest.filter(
      (route) => route.url.startsWith("/api/auth/"),
    );
    expect(manifest).toHaveLength(6);
    expect(manifest.every((route) => route.validated)).toBe(true);
    expect(
      manifest
        .filter((route) => route.authenticated)
        .map((route) => route.url)
        .sort(),
    ).toEqual(["/api/auth/mfa/setup", "/api/auth/mfa/verify"]);
    expect((await app.inject({ method: "POST", url: "/api/auth/mfa/setup" })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/mfa/verify",
          payload: { token: "123456" },
        })
      ).statusCode,
    ).toBe(401);
  });
});

describe("Spec 010 MFA and PIN security", () => {
  const complete = (mfaToken: string, code = "abcdef", remoteAddress?: string) =>
    app.inject({
      method: "POST",
      url: "/api/auth/mfa/validate",
      payload: { mfaToken, code },
      remoteAddress,
    });
  const validCode = (actor: { mfaSecret: string | null }) =>
    speakeasy.totp({ secret: actor.mfaSecret!, encoding: "base32" });

  it.each([true, false])(
    "rejects a user archived between factors with MFA %s in Fastify without successful audit",
    async (enabled) => {
      const actor = await user("archived-mfa", "Supervisor", true);
      const pending = (await login(actor.username)).json().mfaToken;
      await prismaDirect.user.update({
        where: { id: actor.id },
        data: { role: "Archivado", mfaEnabled: enabled },
      });
      const migrated = await complete(pending, validCode(actor));
      expect(migrated.statusCode).toBe(403);
      expect(await prismaDirect.activeSession.count()).toBe(0);
      expect(await prismaDirect.auditLog.count({ where: { action: "LOGIN_MFA_SUCCESS" } })).toBe(0);
    },
  );
  it("rejects disabled MFA even with a valid previous challenge/code", async () => {
    const actor = await user("disabled-mfa", "Supervisor", true);
    const pending = (await login(actor.username)).json().mfaToken;
    await prismaDirect.user.update({ where: { id: actor.id }, data: { mfaEnabled: false } });
    expect((await complete(pending, validCode(actor))).statusCode).toBe(401);
    expect(await prismaDirect.activeSession.count()).toBe(0);
  });
  it("persists exactly five concurrent MFA failures and blocks remaining requests", async () => {
    const actor = await user("limited-mfa", "Supervisor", true);
    const pending = (await login(actor.username)).json().mfaToken;
    const responses = await Promise.all(Array.from({ length: 8 }, () => complete(pending)));
    expect(responses.filter((r) => r.statusCode === 401)).toHaveLength(5);
    expect(responses.filter((r) => r.statusCode === 429)).toHaveLength(3);
    const state = await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } });
    expect(state).toMatchObject({
      mfaFailedAttempts: 5,
      mfaBlockedUntil: expect.any(Date),
      mfaFailureWindowStartedAt: expect.any(Date),
    });
    expect(state.mfaBlockedUntil!.getTime() - Date.now()).toBeGreaterThan(290000);
    // A genuinely different signed challenge still addresses the same persisted identity.
    const fresh = AuthService.generateMFAPendingToken({
      ...(await AuthService.authenticate(actor.username, password)).user!,
      username: "different-signed-name",
    });
    expect(fresh).not.toBe(pending);
    const verify = vi.spyOn(
      (await import("../../src/services/mfaService")).mfaService,
      "verifyToken",
    );
    const migrated = await complete(fresh, validCode(actor), "10.0.0.20");
    expect(migrated.statusCode).toBe(429);
    for (const value of [migrated.headers["retry-after"]]) {
      expect(Number(value)).toBeGreaterThan(0);
      expect(Number(value)).toBeLessThanOrEqual(300);
    }
    expect(verify).not.toHaveBeenCalled();
    const blockedState = await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } });
    expect(blockedState.mfaFailedAttempts).toBe(5);
    expect(blockedState.mfaBlockedUntil).toEqual(state.mfaBlockedUntil);
    const other = await user("other-mfa", "Supervisor", true);
    const otherPending = (await login(other.username)).json().mfaToken;
    expect((await complete(otherPending, validCode(other))).statusCode).toBe(200);
    expect(await prismaDirect.activeSession.count({ where: { userId: actor.id } })).toBe(0);
  });
  it.each(["block", "window"])(
    "expired %s starts fresh failure window; success clears it and uses current role",
    async (expiry) => {
      const actor = await user("expired-mfa", "Supervisor", true);
      const pending = (await login(actor.username)).json().mfaToken;
      await prismaDirect.user.update({
        where: { id: actor.id },
        data: {
          mfaFailedAttempts: expiry === "block" ? 5 : 4,
          mfaBlockedUntil: expiry === "block" ? new Date(0) : null,
          mfaFailureWindowStartedAt: expiry === "block" ? new Date() : new Date(0),
          role: "Administrador",
        },
      });
      expect((await complete(pending)).statusCode).toBe(401);
      expect(
        (await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } })).mfaFailedAttempts,
      ).toBe(1);
      const accepted = await complete(pending, validCode(actor));
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json().role).toBe("Administrador");
      expect(await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } })).toMatchObject({
        mfaFailedAttempts: 0,
        mfaBlockedUntil: null,
        mfaFailureWindowStartedAt: null,
      });
    },
  );
  it("shares MFA failure budget across independent server processes", async () => {
    const actor = await user("process-mfa", "Supervisor", true);
    const pending = (await login(actor.username)).json().mfaToken;
    const run = () =>
      promisify(execFile)(
        process.execPath,
        ["--import", "tsx", path.join(__dirname, "helpers/mfa-worker.cjs")],
        {
          cwd: path.resolve(__dirname, "../.."),
          env: { ...process.env, MFA_TEST_TOKEN: pending },
          timeout: 15000,
        },
      );
    const outputs = await Promise.all([run(), run()]);
    const statuses: number[] = outputs.flatMap((output) => JSON.parse(output.stdout));
    expect(statuses.filter((status) => status === 401)).toHaveLength(5);
    expect(statuses.filter((status) => status === 429)).toHaveLength(3);
    expect((await complete(pending, validCode(actor))).statusCode).toBe(429);
    expect(await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } })).toMatchObject({
      mfaFailedAttempts: 5,
      mfaBlockedUntil: expect.any(Date),
    });
  });
  it("new MFA counters stay out of existing user HTTP/socket DTOs", async () => {
    const actor = await user("dto-mfa", "Supervisor", true);
    const service = new UserService();
    const emitted = vi
      .spyOn((await import("../../src/services/socketService")).SocketService, "emit")
      .mockImplementation(() => {});
    const updated = await service.updateUser(actor.id, { username: actor.username }, "test");
    const listed = await service.getAllUsers({ requesterRole: "Administrador" });
    const emp = await employee();
    const created = await service.createUser(
      { username: "dto-created", password, role: "Supervisor", employeeId: emp.id },
      "test",
    );
    for (const payload of [
      updated,
      listed.users[0],
      created,
      ...emitted.mock.calls.map((call) => call[1]),
    ]) {
      expect(payload).not.toHaveProperty("mfaFailedAttempts");
      expect(payload).not.toHaveProperty("mfaFailureWindowStartedAt");
      expect(payload).not.toHaveProperty("mfaBlockedUntil");
    }
  });
  it("invalid/expired/non-pending JWTs do not consume persisted MFA attempts", async () => {
    const actor = await user("jwt-mfa", "Supervisor", true);
    for (const token of [
      "invalid",
      jwt.sign({ id: actor.id, mfaPending: true }, secret(), { expiresIn: -1 }),
      jwt.sign({ id: actor.id, mfaPending: false }, secret()),
      jwt.sign({ id: actor.id, mfaPending: "true" }, secret()),
    ]) {
      expect((await complete(token)).statusCode).toBe(401);
    }
    expect(await prismaDirect.user.findUniqueOrThrow({ where: { id: actor.id } })).toMatchObject({
      mfaFailedAttempts: 0,
      mfaBlockedUntil: null,
    });
  });
  it("serializes eight concurrent bad PINs to attempts 1..5 and keeps later valid PIN blocked", async () => {
    const emp = await employee();
    const responses = await Promise.all(Array.from({ length: 8 }, () => kiosk("wrong")));
    const failures = responses.filter((r) => r.statusCode === 401);
    expect(failures.map((r) => r.json().attempts).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(responses.filter((r) => r.statusCode === 403)).toHaveLength(3);
    expect(await prismaDirect.employee.findUniqueOrThrow({ where: { id: emp.id } })).toMatchObject({
      pinFailedAttempts: 5,
      isPinBlocked: true,
    });
    expect((await kiosk("1234")).statusCode).toBe(403);
    expect(responses.every((r) => !r.json().token)).toBe(true);
  });
  it("enforces isForcePasswordChange restricting access until self password change", async () => {
    const forced = await user("forced", "Usuario", false, true);
    const loginRes = await login("forced");
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.json().mustChangePassword).toBe(true);
    const userToken = loginRes.json().token;

    const blocked = await app.inject({
      url: "/api/holidays",
      headers: headers(userToken),
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().message).toContain(
      "Debe actualizar su contraseña temporal antes de continuar",
    );
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/mfa/setup",
          headers: headers(userToken),
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/users/${forced.id}`,
          headers: headers(userToken),
        })
      ).statusCode,
    ).toBe(403);
    expect((await app.inject({ url: "/api/health", headers: headers(userToken) })).statusCode).toBe(
      200,
    );

    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/users/${forced.id}`,
      headers: headers(userToken),
      payload: { password: "NewStrongPassword123!" },
    });
    expect(updateRes.statusCode).toBe(200);

    const unblocked = await app.inject({
      url: "/api/holidays",
      headers: headers(userToken),
    });
    expect(unblocked.statusCode).toBe(200);
  });

  it("[BUG-20] rejects empty/whitespace login and kiosk payloads with 400 before throttle or LOGIN_FAILED", async () => {
    await user("empty-target", "Supervisor");
    await employee();

    for (const payload of [
      {},
      { username: "", password: "x" },
      { username: "   ", password: "x" },
      { username: "empty-target", password: "" },
    ]) {
      const res = await app.inject({ method: "POST", url: "/api/auth/login", payload });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    }
    for (const payload of [
      {},
      { employeeId: "", pin: "1234" },
      { employeeId: " ", pin: "1234" },
      { employeeId: "employee-test", pin: "" },
    ]) {
      const res = await app.inject({ method: "POST", url: "/api/auth/kiosk-login", payload });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("VALIDATION_ERROR");
    }
    expect(await prismaDirect.auditLog.count({ where: { action: "LOGIN_FAILED" } })).toBe(0);
    expect(await prismaDirect.auditLog.count({ where: { action: "KIOSK_PIN_FAILED" } })).toBe(0);
  });

  it("[BUG-03][BUG-08][DUDA-09] returns canonical underscore roles, blocks Archivado sessions, and rejects ?token=", async () => {
    const reloj = await user("reloj-actor", "Reloj_Control");
    const supElev = await user("supelev-actor", "Supervisor_Elevado");

    const rLogin = await login("reloj-actor");
    expect(rLogin.statusCode).toBe(200);
    expect(rLogin.json()).toMatchObject({ role: "Reloj_Control", mfaEnabled: false });

    const sLogin = await login("supelev-actor");
    expect(sLogin.statusCode).toBe(200);
    expect(sLogin.json()).toMatchObject({ role: "Supervisor_Elevado", mfaEnabled: false });
    const supToken = sLogin.json().token as string;

    expect(
      (
        await app.inject({
          url: `/api/holidays?token=${encodeURIComponent(supToken)}`,
        })
      ).statusCode,
    ).toBe(401);

    await prismaDirect.user.update({ where: { id: supElev.id }, data: { role: "Archivado" } });
    expect(
      (await app.inject({ url: "/api/holidays", headers: headers(supToken) })).statusCode,
    ).toBe(403);
    expect(
      (await prismaDirect.user.findUniqueOrThrow({ where: { id: reloj.id } })).lastLogin,
    ).toBeInstanceOf(Date);
  });

  it("[DUDA-01][BUG-04][BUG-09][BUG-10] locks MFA setup/verify to Admin, blocks overwrite, enforces single-use mfaToken, and audits MFA_FAILED", async () => {
    const sup = await user("non-admin-mfa", "Supervisor");
    const supToken = (await login(sup.username)).json().token as string;
    expect(
      (await app.inject({ method: "POST", url: "/api/auth/mfa/setup", headers: headers(supToken) }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/mfa/verify",
          headers: headers(supToken),
          payload: { token: "123456" },
        })
      ).statusCode,
    ).toBe(403);

    const admin = await user("admin-mfa", "Administrador");
    const adminToken = (await login(admin.username)).json().token as string;
    // Verify before setup must return 400 (not 500)
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/mfa/verify",
          headers: headers(adminToken),
          payload: { token: "123456" },
        })
      ).statusCode,
    ).toBe(400);

    const setup = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/setup",
      headers: headers(adminToken),
    });
    expect(setup.statusCode).toBe(200);
    const activeSecret = setup.json().secret as string;
    const validCode = speakeasy.totp({ secret: activeSecret, encoding: "base32" });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/mfa/verify",
          headers: headers(adminToken),
          payload: { token: validCode },
        })
      ).statusCode,
    ).toBe(200);

    // Calling /setup again while mfaEnabled === true must fail 409 without overwriting secret or disabling MFA
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/mfa/setup",
          headers: headers(adminToken),
        })
      ).statusCode,
    ).toBe(409);
    const intact = await prismaDirect.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(intact.mfaEnabled).toBe(true);
    expect(intact.mfaSecret).toBe(activeSecret);

    // Clear sessions and test concurrent single-use mfaToken + MFA_FAILED audit on wrong code & 429
    await prismaDirect.activeSession.deleteMany();
    const challenge = await login(admin.username);
    const mfaToken = challenge.json().mfaToken as string;

    const badVerify = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/validate",
      payload: { mfaToken, code: "000000" },
    });
    expect(badVerify.statusCode).toBe(401);
    expect(
      await prismaDirect.auditLog.count({
        where: { action: "MFA_FAILED", actorUsername: admin.username, outcome: "FAILURE" },
      }),
    ).toBe(1);

    const freshCode = speakeasy.totp({ secret: activeSecret, encoding: "base32" });
    const [r1, r2] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/auth/mfa/validate",
        payload: { mfaToken, code: freshCode },
      }),
      app.inject({
        method: "POST",
        url: "/api/auth/mfa/validate",
        payload: { mfaToken, code: freshCode },
      }),
    ]);
    expect([r1.statusCode, r2.statusCode].sort()).toEqual([200, 401]);
    expect(await prismaDirect.activeSession.count({ where: { userId: admin.id } })).toBe(1);

    // Trigger 429 MFA rate limit and verify MFA_FAILED audit
    const secondChallenge = (await login(admin.username)).json().mfaToken as string;
    let saw429 = false;
    for (let i = 0; i < 6; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/mfa/validate",
        payload: { mfaToken: secondChallenge, code: "000000" },
      });
      if (res.statusCode === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
    expect(
      await prismaDirect.auditLog.count({
        where: { action: "MFA_FAILED", actorUsername: admin.username, outcome: "FAILURE" },
      }),
    ).toBeGreaterThanOrEqual(5);
  });

  it("[BUG-14][ANOMALÍA-22] purge-sessions and admin reset-password support case-insensitive username and emit auth:force_logout", async () => {
    const forceUserSpy = vi
      .spyOn(SocketService, "emitForceLogoutToUser")
      .mockImplementation(() => {});
    const admin = await user("root-admin", "Administrador");
    const target = await user("MixedCaseUser", "Usuario");
    const adminToken = (await login(admin.username)).json().token as string;
    const targetToken = (await login(target.username)).json().token as string;
    expect(targetToken).toBeTruthy();

    const purge = await app.inject({
      method: "POST",
      url: "/api/admin/purge-sessions",
      headers: headers(adminToken),
      payload: { username: "mixedcaseuser" },
    });
    expect(purge.statusCode).toBe(200);
    expect(await prismaDirect.activeSession.count({ where: { userId: target.id } })).toBe(0);
    expect(forceUserSpy).toHaveBeenCalledWith(
      target.id,
      expect.objectContaining({ reason: "SESSION_INVALIDATED" }),
    );

    forceUserSpy.mockClear();
    const targetLogin2 = (await login(target.username)).json().token as string;
    expect(targetLogin2).toBeTruthy();
    const reset = await app.inject({
      method: "POST",
      url: "/api/admin/reset-password",
      headers: headers(adminToken),
      payload: { username: "MIXEDCASEUSER", newPassword: "ResetPassword999!" },
    });
    expect(reset.statusCode).toBe(200);
    expect(await prismaDirect.activeSession.count({ where: { userId: target.id } })).toBe(0);
    expect(forceUserSpy).toHaveBeenCalledWith(
      target.id,
      expect.objectContaining({ reason: "SESSION_INVALIDATED" }),
    );
  });
});
