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
