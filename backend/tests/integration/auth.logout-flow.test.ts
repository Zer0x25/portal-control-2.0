import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { login, logout } from "../../src/controllers/authController";

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
};

const createMockRes = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe("Auth Logout Integration Flow", () => {
  const testUserId = ulid();
  const testUsername = `it_logout_${ulid().toLowerCase()}`;
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = "integration-test-secret";

    await prisma.user.create({
      data: {
        id: testUserId,
        username: testUsername,
        passwordHash: bcrypt.hashSync("secret123", 10),
        role: "Supervisor",
      },
    });
  });

  afterAll(async () => {
    await prisma.activeSession.deleteMany({ where: { userId: testUserId } });
    await prisma.auditLog.deleteMany({
      where: { actorUsername: { in: [testUsername, "ANONYMOUS"] } },
    });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it("invalidates active session token on logout and remains idempotent on second call", async () => {
    const loginReq = {
      body: { username: testUsername, password: "secret123" },
      ip: "127.0.0.1",
      headers: { "user-agent": "vitest-logout-flow" },
    } as any;
    const loginRes = createMockRes();

    await login(loginReq, loginRes as any);
    expect(loginRes.statusCode).toBe(200);
    expect(typeof loginRes.body?.token).toBe("string");

    const token = loginRes.body.token as string;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const sessionBefore = await prisma.activeSession.findUnique({ where: { tokenHash } });
    expect(sessionBefore).not.toBeNull();

    const logoutReq = {
      headers: { authorization: `Bearer ${token}` },
      ip: "127.0.0.1",
      user: { username: testUsername },
    } as any;
    const logoutRes = createMockRes();
    await logout(logoutReq, logoutRes as any);

    expect(logoutRes.statusCode).toBe(200);
    expect(String(logoutRes.body?.message || "")).toContain("Logout exitoso");

    const sessionAfter = await prisma.activeSession.findUnique({ where: { tokenHash } });
    expect(sessionAfter).toBeNull();

    const logoutResSecond = createMockRes();
    await logout(logoutReq, logoutResSecond as any);
    expect(logoutResSecond.statusCode).toBe(200);
  });
});
