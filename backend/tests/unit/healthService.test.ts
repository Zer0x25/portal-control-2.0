import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, getBackupStatus } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  getBackupStatus: vi.fn(),
}));

vi.mock("../../src/services/db", () => ({ default: { $queryRaw: queryRaw } }));
vi.mock("../../src/services/backupHealthService", () => ({
  backupHealthService: { getStatus: getBackupStatus },
}));

import { HealthService } from "../../src/services/HealthService";
import { backupHealthService } from "../../src/services/backupHealthService";

const backupStatus = (overrides: Partial<ReturnType<typeof backupHealthService.getStatus>> = {}) =>
  ({
    enabled: false,
    isScheduledEnabled: false,
    stale: false,
    staleThresholdHours: 26,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
    latestFileAt: null,
    latestFileAgeHours: null,
    latestFileSize: null,
    backupCount: 0,
    mode: "Standard",
    ...overrides,
  }) satisfies ReturnType<typeof backupHealthService.getStatus>;

describe("HealthService readiness", () => {
  beforeEach(() => {
    queryRaw.mockReset().mockResolvedValue([]);
    getBackupStatus.mockReset().mockReturnValue(backupStatus());
  });

  it("returns only startup identity/status without collecting diagnostics", () => {
    const readiness = HealthService.getReadiness();

    expect(queryRaw).not.toHaveBeenCalled();
    expect(getBackupStatus).toHaveBeenCalledTimes(1);
    expect(readiness).toMatchObject({
      status: "ready",
      healthStatus: "healthy",
      instanceId: expect.any(String),
    });
    expect(Object.keys(readiness).sort()).toEqual(["healthStatus", "instanceId", "status"]);
  });

  it("preserves degraded health when enabled backups are stale or errored", async () => {
    getBackupStatus.mockReturnValueOnce(backupStatus({ enabled: true, stale: true }));
    expect(HealthService.getReadiness()).toMatchObject({ healthStatus: "degraded" });

    getBackupStatus.mockReturnValueOnce(
      backupStatus({ enabled: true, stale: false, lastError: "backup failed" }),
    );
    expect(HealthService.getReadiness()).toMatchObject({ healthStatus: "degraded" });
  });

  it("keeps the database probe separate for the route to map to 503", async () => {
    await HealthService.checkDbReady();

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(queryRaw.mock.calls[0]?.[0].join("")).toBe("SELECT 1");
  });

  it("propagates database probe errors without treating them as backup status", async () => {
    queryRaw.mockRejectedValueOnce(new Error("database down"));

    await expect(HealthService.checkDbReady()).rejects.toThrow("database down");
    expect(getBackupStatus).not.toHaveBeenCalled();
  });
});
