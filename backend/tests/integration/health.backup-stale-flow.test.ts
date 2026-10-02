import { afterEach, describe, expect, it, vi } from "vitest";
import { backupHealthService } from "../../src/services/backupHealthService";
import { health } from "../../src/controllers/healthController";

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

describe("Health Backup Monitoring Flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns degraded/200 when backup is enabled and stale", async () => {
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

    const req = {} as any;
    const res = createMockRes();

    await health(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.status).toBe("degraded");
    expect(res.body?.data?.backup?.enabled).toBe(true);
    expect(res.body?.data?.backup?.stale).toBe(true);
  });
});
