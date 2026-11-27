import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { backupHealthService } from "../../src/services/backupHealthService";
import { AuthService } from "../../src/services/AuthService";
import { prismaDirect } from "../../src/services/db";
import { assertConnectedToTestDb, resetIntegrationDb } from "../integration/_support/testDb";

let app: FastifyInstance;
beforeAll(async () => {
  await assertConnectedToTestDb();
  await resetIntegrationDb();
  app = createFastifyRuntime({
    allowedOrigins: [],
    trustProxy: 1,
    rateLimit: { max: 5000, timeWindow: 900000 },
    logger: false,
  });
  await app.ready();
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await resetIntegrationDb();
  await app?.close();
});

it("preserves degraded/200 health without exposing internal details when unauthenticated", async () => {
  vi.spyOn(backupHealthService, "getStatus").mockReturnValue({
    enabled: true,
    stale: true,
    staleThresholdHours: 26,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: "secret internal error",
    latestFileAt: null,
    latestFileAgeHours: null,
  });
  const response = await app.inject({ url: "/api/health" });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body).toMatchObject({
    success: true,
    data: { status: "degraded", database: { status: "OK" } },
  });
  expect(body.data.system).toBeUndefined();
  expect(body.data.backup).toBeUndefined();
  expect(body.data.database.size).toBeUndefined();
});

it("exposes full health details only to Super_Administrador and persistent instanceId publicly", async () => {
  const first = await app.inject({ url: "/api/health" });
  expect(first.statusCode).toBe(200);
  const data1 = first.json().data;
  expect(data1.instanceId).toBeDefined();
  expect(typeof data1.instanceId).toBe("string");
  expect(data1.instanceId.length).toBeGreaterThan(0);
  expect(data1.system).toBeUndefined();

  const second = await app.inject({ url: "/api/health" });
  expect(second.json().data.instanceId).toBe(data1.instanceId);

  const admin = await prismaDirect.user.create({
    data: { username: "health-admin", role: "Super_Administrador", passwordHash: "test-only" },
  });
  const { token: adminToken } = await AuthService.createSession(
    admin.id,
    admin.username,
    admin.role,
    undefined,
    "spec120",
  );
  const adminRes = await app.inject({
    url: "/api/health",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  expect(adminRes.statusCode).toBe(200);
  const adminData = adminRes.json().data;
  expect(adminData.system?.nodeVersion).toBeDefined();
  expect(adminData.database?.size).toBeDefined();
  expect(adminData.backup).toBeDefined();
});
