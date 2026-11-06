import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../../src/services/db";
import { backupService } from "../../src/services/backupService";
import { logger } from "../../src/utils/logger";

describe("BackupService.exportAllData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports all model data correctly", async () => {
    const models = [
      "user",
      "employee",
      "timeRecord",
      "shiftReport",
      "auditLog",
      "shiftPattern",
      "assignedShift",
      "holiday",
      "leaveRecord",
      "correctionRequest",
      "meterReading",
      "quickNote",
      "systemConfig",
      "scheduledReport",
    ];

    for (const model of models) {
      vi.spyOn((prisma as Record<string, any>)[model], "findMany").mockResolvedValue([
        { id: `test-${model}-1` },
      ]);
    }

    const result = await backupService.exportAllData();

    for (const model of models) {
      expect(result[model]).toEqual([{ id: `test-${model}-1` }]);
    }
  });

  it("handles errors gracefully when individual model export fails", async () => {
    const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    vi.spyOn((prisma as Record<string, any>).user, "findMany").mockRejectedValue(
      new Error("Database timeout"),
    );
    vi.spyOn((prisma as Record<string, any>).employee, "findMany").mockResolvedValue([
      { id: "emp-1" },
    ]);

    const result = await backupService.exportAllData();

    expect(result.user).toBeUndefined();
    expect(result.employee).toEqual([{ id: "emp-1" }]);
    expect(loggerErrorSpy).toHaveBeenCalledWith("Error exporting model user:", expect.any(Error));
  });

  it("measures performance with simulated async I/O latency", async () => {
    const models = [
      "user",
      "employee",
      "timeRecord",
      "shiftReport",
      "auditLog",
      "shiftPattern",
      "assignedShift",
      "holiday",
      "leaveRecord",
      "correctionRequest",
      "meterReading",
      "quickNote",
      "systemConfig",
      "scheduledReport",
    ];

    // Simulate 20ms database query I/O per model
    const simulatedLatencyMs = 20;
    for (const model of models) {
      vi.spyOn((prisma as Record<string, any>)[model], "findMany").mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve([{ id: model }]), simulatedLatencyMs)),
      );
    }

    const start = Date.now();
    const result = await backupService.exportAllData();
    const duration = Date.now() - start;

    expect(Object.keys(result).length).toBe(models.length);
    // Log measured duration for benchmarking baseline vs optimized
    console.log(
      `[Benchmark] exportAllData duration: ${duration}ms (14 models * ${simulatedLatencyMs}ms delay)`,
    );
  });
});
