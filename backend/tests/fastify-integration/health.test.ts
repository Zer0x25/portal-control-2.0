import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createFastifyRuntime } from "../../src/fastify/runtime";
import { backupHealthService } from "../../src/services/backupHealthService";
import { assertConnectedToTestDb } from "../integration/_support/testDb";

let app: FastifyInstance;
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
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await app?.close();
});

it("preserves degraded/200 health when backups are enabled and stale", async () => {
  vi.spyOn(backupHealthService, "getStatus").mockReturnValue({
    enabled: true,
    stale: true,
    staleThresholdHours: 26,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    latestFileAt: null,
    latestFileAgeHours: null,
  });
  const response = await app.inject({ url: "/api/health" });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    success: true,
    data: { status: "degraded", backup: { enabled: true, stale: true } },
  });
});

it("exposes persistent instanceId and system details in health response", async () => {
  const first = await app.inject({ url: "/api/health" });
  expect(first.statusCode).toBe(200);
  const data1 = first.json().data;
  expect(data1.instanceId).toBeDefined();
  expect(typeof data1.instanceId).toBe("string");
  expect(data1.instanceId.length).toBeGreaterThan(0);

  const second = await app.inject({ url: "/api/health" });
  const data2 = second.json().data;
  expect(data2.instanceId).toBe(data1.instanceId);
});
