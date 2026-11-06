import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPrisma = {
  timeRecord: {
    findMany: vi.fn(),
  },
};

const mockTimeRecordIntegrityService = {
  verifyChain: vi.fn(),
  sealAfterMutation: vi.fn(),
  bulkSqlSeal: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

const mockIntegrityStatusService = {
  markBackfillRun: vi.fn(),
};

vi.mock("../../src/services/db", () => ({
  default: mockPrisma,
}));

vi.mock("../../src/services/timeRecordIntegrityService", () => ({
  timeRecordIntegrityService: mockTimeRecordIntegrityService,
}));

vi.mock("../../src/services/auditService", () => ({
  auditService: mockAuditService,
}));

vi.mock("../../src/services/integrityStatusService", () => ({
  integrityStatusService: mockIntegrityStatusService,
}));

describe("integrityMaintenanceService.runAutoRechainIfNeeded", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns enabled: false when autoRechainEnabled is not true", async () => {
    process.env.INTEGRITY_AUTO_RECHAIN_ENABLED = "false";
    const { integrityMaintenanceService } =
      await import("../../src/services/integrityMaintenanceService");

    const result = await integrityMaintenanceService.runAutoRechainIfNeeded();
    expect(result).toEqual({
      enabled: false,
      reChainedEmployees: 0,
      processedRecords: 0,
      errors: 0,
    });
    expect(mockTimeRecordIntegrityService.verifyChain).not.toHaveBeenCalled();
  });

  it("returns early when brokenCount is 0", async () => {
    process.env.INTEGRITY_AUTO_RECHAIN_ENABLED = "true";
    mockTimeRecordIntegrityService.verifyChain.mockResolvedValueOnce({
      brokenCount: 0,
      broken: [],
    });

    const { integrityMaintenanceService } =
      await import("../../src/services/integrityMaintenanceService");

    const result = await integrityMaintenanceService.runAutoRechainIfNeeded();
    expect(result).toEqual({
      enabled: true,
      reChainedEmployees: 0,
      processedRecords: 0,
      errors: 0,
    });
    expect(mockPrisma.timeRecord.findMany).not.toHaveBeenCalled();
  });

  it("batch fetches all records in a single query and rechains affected employees", async () => {
    process.env.INTEGRITY_AUTO_RECHAIN_ENABLED = "true";
    mockTimeRecordIntegrityService.verifyChain.mockResolvedValueOnce({
      brokenCount: 3,
      broken: [
        { employeeId: "emp-1", reason: "PREV_HASH_MISMATCH" },
        { employeeId: "emp-2", reason: "HASH_MISMATCH" },
        { employeeId: "emp-3", reason: "OTHER_REASON" }, // should be filtered out
      ],
    });

    // Mock single findMany query returning records for both affected employees
    mockPrisma.timeRecord.findMany.mockResolvedValueOnce([
      { id: "rec-1-a", employeeId: "emp-1" },
      { id: "rec-1-b", employeeId: "emp-1" },
      { id: "rec-2-a", employeeId: "emp-2" },
    ]);

    mockTimeRecordIntegrityService.sealAfterMutation.mockResolvedValue(undefined);

    const { integrityMaintenanceService } =
      await import("../../src/services/integrityMaintenanceService");

    const result = await integrityMaintenanceService.runAutoRechainIfNeeded();

    expect(result).toEqual({
      enabled: true,
      reChainedEmployees: 2,
      processedRecords: 3,
      errors: 0,
    });

    // Verify findMany was called EXACTLY ONCE with { in: affectedEmployees } (no N+1 query)
    expect(mockPrisma.timeRecord.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.timeRecord.findMany).toHaveBeenCalledWith({
      where: { employeeId: { in: ["emp-1", "emp-2"] } },
      orderBy: [{ employeeId: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
      select: { id: true, employeeId: true },
    });

    // Verify records were sealed in order
    expect(mockTimeRecordIntegrityService.sealAfterMutation).toHaveBeenCalledTimes(3);
    expect(mockTimeRecordIntegrityService.sealAfterMutation).toHaveBeenNthCalledWith(
      1,
      mockPrisma,
      "emp-1",
      "rec-1-a",
      { skipAudit: true },
    );
    expect(mockTimeRecordIntegrityService.sealAfterMutation).toHaveBeenNthCalledWith(
      2,
      mockPrisma,
      "emp-1",
      "rec-1-b",
      { skipAudit: true },
    );
    expect(mockTimeRecordIntegrityService.sealAfterMutation).toHaveBeenNthCalledWith(
      3,
      mockPrisma,
      "emp-2",
      "rec-2-a",
      { skipAudit: true },
    );

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUsername: "SYSTEM",
        action: "TIME_RECORD_INTEGRITY_RECHAIN_RUN",
        outcome: "SUCCESS",
        details: expect.objectContaining({
          reChainedEmployees: 2,
          processedRecords: 3,
          errors: 0,
        }),
      }),
    );
  });

  it("handles errors during sealing gracefully without throwing", async () => {
    process.env.INTEGRITY_AUTO_RECHAIN_ENABLED = "true";
    mockTimeRecordIntegrityService.verifyChain.mockResolvedValueOnce({
      brokenCount: 1,
      broken: [{ employeeId: "emp-1", reason: "HASH_MISMATCH" }],
    });

    mockPrisma.timeRecord.findMany.mockResolvedValueOnce([
      { id: "rec-1-a", employeeId: "emp-1" },
      { id: "rec-1-b", employeeId: "emp-1" },
    ]);

    mockTimeRecordIntegrityService.sealAfterMutation
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Sealing failed"));

    const { integrityMaintenanceService } =
      await import("../../src/services/integrityMaintenanceService");

    const result = await integrityMaintenanceService.runAutoRechainIfNeeded();

    expect(result).toEqual({
      enabled: true,
      reChainedEmployees: 1,
      processedRecords: 1,
      errors: 1,
    });

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TIME_RECORD_INTEGRITY_RECHAIN_RUN",
        severity: "WARNING",
        outcome: "FAILURE",
        details: expect.objectContaining({
          reChainedEmployees: 1,
          processedRecords: 1,
          errors: 1,
        }),
      }),
    );
  });
});
