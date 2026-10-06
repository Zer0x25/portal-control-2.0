import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import type { Prisma } from "../../src/generated/prisma/client";
import expressApp from "../../src/app";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { prismaDirect } from "../../src/services/db";
import { AuthService } from "../../src/services/AuthService";
import { clearLoginFailures } from "../../src/services/loginFailures";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";

let app: FastifyInstance;
const password = "integration-auth-password";
const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const secret = () => process.env.JWT_SECRET!;
async function user(
  username = "alice",
  role: Prisma.UserCreateInput["role"] = "Supervisor",
  mfaEnabled = false,
) {
  await clearLoginFailures("127.0.0.1", username);
  return prismaDirect.user.create({
    data: {
      username,
      role,
      passwordHash: bcrypt.hashSync(password, 4),
      mfaEnabled,
      mfaSecret: mfaEnabled ? speakeasy.generateSecret().base32 : null,
      isForcePasswordChange: true,
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
  it("matches Express login contract, signs valid claims and persists only hash/device/expiry", async () => {
    const actor = await user();
    const legacy = await request(expressApp)
      .post("/api/auth/login")
      .send({ username: "ALICE", password })
      .set("user-agent", "express-integration");
    const migrated = await login("ALICE");
    expect(legacy.status).toBe(200);
    expect(migrated.statusCode).toBe(200);
    const { token: legacyToken, ...legacyBody } = legacy.body;
    const { token, ...body } = migrated.json();
    expect(body).toEqual(legacyBody);
    expect(token).not.toBe(legacyToken);
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
    ).toBe(2);
  });
  it.each([
    ["wrong", "Supervisor", 401],
    [password, "Archivado", 403],
  ] as const)(
    "preserves rejected login %s/%s status %s with no session",
    async (supplied, role, status) => {
      await user("alice", role);
      const legacy = await request(expressApp)
        .post("/api/auth/login")
        .send({ username: "alice", password: supplied });
      const migrated = await login("alice", supplied);
      expect(migrated.statusCode).toBe(status);
      expect(migrated.json()).toEqual(legacy.body);
      expect(await prismaDirect.activeSession.count()).toBe(0);
      expect(await prismaDirect.auditLog.count({ where: { action: "LOGIN_FAILED" } })).toBe(
        status === 401 ? 2 : 0,
      );
    },
  );
  it("returns same missing-field validation contract as Express before DB effects", async () => {
    const legacy = await request(expressApp).post("/api/auth/login").send({ username: "alice" });
    const migrated = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "alice" },
    });
    expect(migrated.statusCode).toBe(400);
    expect(migrated.json()).toEqual(legacy.body);
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
  it("logout is public/idempotent, revokes persisted session and audit actor remains anonymous", async () => {
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
    expect(
      await prismaDirect.activeSession.findUnique({ where: { tokenHash: hash(token) } }),
    ).toBeNull();
    expect((await app.inject({ url: "/api/holidays", headers: headers(token) })).statusCode).toBe(
      401,
    );
    expect((await request(expressApp).post("/api/auth/logout")).body).toEqual({
      message: "Logout exitoso",
    });
    expect(
      await prismaDirect.auditLog.count({
        where: { action: "LOGOUT", actorUsername: "ANONYMOUS" },
      }),
    ).toBe(3);
  });
  it("rejects persisted session expiry and removes expired row", async () => {
    await user();
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
  it("real QR setup and TOTP verify enable MFA, then challenge completion creates exactly one session", async () => {
    const actor = await user();
    const access = (await login()).json().token;
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
    const challenge = await login();
    const legacy = await request(expressApp)
      .post("/api/auth/login")
      .send({ username: "alice", password });
    expect(challenge.statusCode).toBe(200);
    const { mfaToken: legacyPending, ...legacyChallenge } = legacy.body;
    const { mfaToken: migratedPending, ...migratedChallenge } = challenge.json();
    expect(migratedChallenge).toEqual(legacyChallenge);
    expect(jwt.verify(legacyPending, secret())).toMatchObject({ id: actor.id, mfaPending: true });
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
      mustChangePassword: true,
      message: "Autenticación de dos pasos exitosa",
    });
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
      const legacy = await request(expressApp).post("/api/auth/mfa/validate").send(payload);
      expect(migrated.statusCode).toBe(401);
      expect(migrated.json()).toEqual(legacy.body);
    }
    expect(await prismaDirect.activeSession.count()).toBe(0);
  });
  it("kiosk signs 5min token without session and supports hashed and default PIN", async () => {
    const emp = await employee();
    const legacy = await request(expressApp)
      .post("/api/auth/kiosk-login")
      .send({ employeeId: emp.id, pin: "1234" });
    const migrated = await kiosk("1234");
    expect(migrated.statusCode).toBe(200);
    const { token: legacyKiosk, ...legacyKioskBody } = legacy.body;
    const { token: migratedKiosk, ...migratedKioskBody } = migrated.json();
    expect(migratedKioskBody).toEqual(legacyKioskBody);
    expect(jwt.verify(legacyKiosk, secret())).toMatchObject({
      employeeId: emp.id,
      role: "Kiosk_Employee",
    });
    expect(jwt.verify(migratedKiosk, secret())).toMatchObject({
      employeeId: emp.id,
      role: "Kiosk_Employee",
    });
    const claims = jwt.verify(migrated.json().token, secret()) as jwt.JwtPayload;
    expect(claims).toMatchObject({ role: "Kiosk_Employee", employeeId: emp.id });
    expect(claims.exp! - claims.iat!).toBe(300);
    expect(await prismaDirect.activeSession.count()).toBe(0);
    expect(
      (
        await app.inject({
          url: "/api/holidays?showArchived=true",
          headers: headers(migrated.json().token),
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
    const legacy = await request(expressApp)
      .post("/api/auth/kiosk-login")
      .send({ employeeId: emp.id, pin: "1234" });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toEqual(legacy.body);
    const missing = await kiosk("1234", "unknown-employee");
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ message: "Empleado no encontrado" });
  });
  it("real shared throttle blocks both frameworks after 30 failures and separates identities", async () => {
    await user("throttled");
    await user("other");
    for (let i = 0; i < 30; i++) expect((await login("throttled", "wrong")).statusCode).toBe(401);
    const migrated = await login(" THROTTLED ");
    const legacy = await request(expressApp)
      .post("/api/auth/login")
      .send({ username: "throttled", password });
    expect(migrated.statusCode).toBe(429);
    expect(legacy.status).toBe(429);
    expect(migrated.json().message).toContain("Demasiados intentos");
    expect(Number(migrated.headers["retry-after"])).toBeGreaterThan(0);
    expect(Number(legacy.headers["retry-after"])).toBeGreaterThan(0);
    expect((await login("other")).statusCode).toBe(200);
    await clearLoginFailures("127.0.0.1", "throttled");
    expect((await login("throttled")).statusCode).toBe(200);
  });
  it("unexpected auth errors omit credentials in persisted audit metadata for both frameworks", async () => {
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
    expect((await request(expressApp).post("/api/auth/login").send(payload)).status).toBe(500);
    // Express schedules error audit without awaiting it; observe eventual persistence.
    await vi.waitFor(async () => {
      expect(await prismaDirect.auditLog.count({ where: { action: "UNHANDLED_ERROR" } })).toBe(2);
    });
    const audits = await prismaDirect.auditLog.findMany({ where: { action: "UNHANDLED_ERROR" } });
    expect(audits).toHaveLength(2);
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
