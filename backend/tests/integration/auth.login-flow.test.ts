import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { login } from "../../src/controllers/authController";

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

describe("Auth Integration Flow", () => {
  const testUserId = ulid();
  const testUsername = `it_auth_${ulid().toLowerCase()}`;
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = "integration-test-secret";

    await prisma.user.create({
      data: {
        id: testUserId,
        username: testUsername,
        passwordHash: bcrypt.hashSync("secret123", 10),
        role: "Administrador",
      },
    });
  });

  afterAll(async () => {
    await prisma.activeSession.deleteMany({ where: { userId: testUserId } });
    await prisma.auditLog.deleteMany({
      where: { actorUsername: { in: [testUsername, testUsername.toUpperCase()] } },
    });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it("rotates oldest session when admin reaches max session limit", async () => {
    const oldestId = ulid();
    const now = Date.now();
    // Create 10 sessions to reach the new limit
    const sessionData = Array.from({ length: 10 }).map((_, i) => ({
      id: i === 0 ? oldestId : ulid(),
      userId: testUserId,
      tokenHash: `token_${i}_${ulid()}`,
      deviceInfo: `it-device-${i}`,
      lastActive: new Date(now - (120000 - i * 1000)),
      expiresAt: new Date(now + 3600000),
    }));

    await prisma.activeSession.createMany({
      data: sessionData,
    });

    const req = {
      body: { username: testUsername, password: "secret123" },
      ip: "127.0.0.1",
      headers: { "user-agent": "vitest-auth-integration" },
    } as any;
    const res = createMockRes();

    await login(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body?.token).toBeTypeOf("string");

    const sessions = await prisma.activeSession.findMany({
      where: { userId: testUserId },
      orderBy: { lastActive: "asc" },
    });

    expect(sessions.length).toBe(10);
    expect(sessions.some((s) => s.id === oldestId)).toBe(false);
  });

  it("allows burst logins within the same second with distinct tokens", async () => {
    // Regresión 2026-10-03: sin nonce en el JWT, N logins dentro del mismo
    // segundo firmaban el mismo token (iat en segundos) y el insert chocaba
    // con el @unique de token_hash (409). El e2e en paralelo lo gatillaba
    // siempre (loginFast en ráfaga). Con jti todos pasan y rotan al límite.
    await prisma.activeSession.deleteMany({ where: { userId: testUserId } });

    const attempt = async () => {
      const req = {
        body: { username: testUsername, password: "secret123" },
        ip: "127.0.0.1",
        headers: { "user-agent": "vitest-auth-burst" },
      } as any;
      const res = createMockRes();
      await login(req, res as any);
      return res;
    };

    const results = await Promise.all(Array.from({ length: 6 }, () => attempt()));

    for (const res of results) {
      expect(res.statusCode).toBe(200);
      expect(res.body?.token).toBeTypeOf("string");
    }
    const tokens = results.map((r) => r.body?.token);
    expect(new Set(tokens).size).toBe(tokens.length);

    const count = await prisma.activeSession.count({ where: { userId: testUserId } });
    expect(count).toBeLessThanOrEqual(10);
  });
});
