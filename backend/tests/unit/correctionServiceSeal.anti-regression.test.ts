import { describe, expect, it, vi } from "vitest";
import { CorrectionService } from "../../src/services/CorrectionService";
import { timeRecordIntegrityService } from "../../src/services/timeRecordIntegrityService";
import prisma, { withDirectTransaction } from "../../src/services/db";

import { TimeRecordService } from "../../src/services/TimeRecordService";

vi.mock("../../src/services/timeRecordIntegrityService", () => ({
  timeRecordIntegrityService: {
    sealAfterMutation: vi.fn(async () => ({ valid: true })),
  },
}));

vi.mock("../../src/services/auditService", () => ({
  auditService: {
    log: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/services/db", () => {
  const fakeTx = {
    correctionRequest: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      findUnique: vi.fn(async () => ({
        id: "cr-1",
        status: "approved",
        employeeId: "EMP-100",
        timeRecordId: "tr-100",
        recordField: "entrada",
        requestedValue: "2026-10-06T08:00:00Z",
        targetDate: new Date("2026-10-06"),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },
    timeRecord: {
      findUnique: vi.fn(async () => ({
        id: "tr-100",
        employeeId: "EMP-100",
        date: "2026-10-06",
        entrada: "2026-10-06T08:30:00Z",
        inicioColacion: null,
        finColacion: null,
        salida: "2026-10-06T17:00:00Z",
        status: "Completado",
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn(async () => ({
        id: "tr-100",
        employeeId: "EMP-100",
        date: "2026-10-06",
        entrada: "2026-10-06T08:00:00Z",
        inicioColacion: null,
        finColacion: null,
        salida: "2026-10-06T17:00:00Z",
        status: "Completado",
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },
  };

  return {
    default: {
      correctionRequest: {
        findUnique: vi.fn(async () => ({
          id: "cr-1",
          status: "pending",
          employeeId: "EMP-100",
          timeRecordId: "tr-100",
          recordField: "entrada",
          requestedValue: "2026-10-06T08:00:00Z",
          targetDate: new Date("2026-10-06"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    },
    withDirectTransaction: vi.fn(async (fn: (tx: typeof fakeTx) => Promise<unknown>) => fn(fakeTx)),
  };
});

describe("Anti-regression: CorrectionService cryptographic seal after mutation", () => {
  it("calls timeRecordIntegrityService.sealAfterMutation upon approved time record correction", async () => {
    vi.spyOn(TimeRecordService, "validateEditableRecord").mockResolvedValue(undefined);
    const result = await CorrectionService.updateStatus(
      "cr-1",
      {
        status: "approved",
        resolvedBy: "admin-user",
      },
      "admin-user",
    );

    expect(result.status).toBe("approved");
    expect(timeRecordIntegrityService.sealAfterMutation).toHaveBeenCalledTimes(1);
    expect(timeRecordIntegrityService.sealAfterMutation).toHaveBeenCalledWith(
      expect.anything(),
      "EMP-100",
      "tr-100",
    );
  });
});
