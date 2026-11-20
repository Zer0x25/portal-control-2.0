import { describe, expect, it, vi } from "vitest";
import { CorrectionService } from "../../src/services/CorrectionService";
import { timeRecordIntegrityService } from "../../src/services/timeRecordIntegrityService";
import { withDirectTransaction } from "../../src/services/db";
import { SocketService } from "../../src/services/socketService";

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
    $executeRaw: vi.fn(async () => 0),
    $queryRaw: vi.fn(async () => []),
    auditLog: { create: vi.fn(async () => ({ id: "audit" })) },
    correctionRequest: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      findUnique: vi.fn(async () => ({
        id: "cr-1",
        status: "approved",
        employeeId: "EMP-100",
        timeRecordId: "tr-100",
        recordField: "entrada",
        originalValue: "2026-10-06T08:30:00Z",
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
          originalValue: "2026-10-06T08:30:00Z",
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
    vi.spyOn(TimeRecordService, "isRecordLocked").mockResolvedValue(false);
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

  it("does not emit events when commit fails", async () => {
    vi.spyOn(TimeRecordService, "validateEditableRecord").mockResolvedValue(undefined);
    vi.spyOn(TimeRecordService, "isRecordLocked").mockResolvedValue(false);
    const emit = vi.spyOn(SocketService, "emit");
    const emitAll = vi.spyOn(SocketService, "emitToAll");
    emit.mockClear();
    emitAll.mockClear();
    const original = vi.mocked(withDirectTransaction).getMockImplementation();
    vi.mocked(withDirectTransaction).mockImplementationOnce(async (fn, options) => {
      if (!original) throw new Error("Missing transaction mock");
      await original(fn, options);
      throw new Error("commit failed");
    });
    await expect(CorrectionService.updateStatus("cr-1", { status: "approved" })).rejects.toThrow(
      "commit failed",
    );
    expect(emit).not.toHaveBeenCalled();
    expect(emitAll).not.toHaveBeenCalled();
  });

  it("propagates audit insertion failure without publishing events", async () => {
    vi.spyOn(TimeRecordService, "validateEditableRecord").mockResolvedValue(undefined);
    vi.spyOn(TimeRecordService, "isRecordLocked").mockResolvedValue(false);
    const emit = vi.spyOn(SocketService, "emit");
    const emitAll = vi.spyOn(SocketService, "emitToAll");
    emit.mockClear();
    emitAll.mockClear();
    const original = vi.mocked(withDirectTransaction).getMockImplementation();
    vi.mocked(withDirectTransaction).mockImplementationOnce(async (fn, options) => {
      if (!original) throw new Error("Missing transaction mock");
      return original(async (tx) => {
        vi.mocked(tx.auditLog.create).mockRejectedValueOnce(new Error("audit failed"));
        return fn(tx);
      }, options);
    });
    await expect(CorrectionService.updateStatus("cr-1", { status: "approved" })).rejects.toThrow(
      "audit failed",
    );
    expect(emit).not.toHaveBeenCalled();
    expect(emitAll).not.toHaveBeenCalled();
  });

  it("refuses approval for a closed period before sealing or emitting", async () => {
    vi.spyOn(TimeRecordService, "isRecordLocked").mockResolvedValueOnce(true);
    vi.mocked(timeRecordIntegrityService.sealAfterMutation).mockClear();
    const emit = vi.spyOn(SocketService, "emit");
    emit.mockClear();
    await expect(
      CorrectionService.updateStatus("cr-1", { status: "approved" }),
    ).rejects.toMatchObject({ code: "RECORD_LOCKED" });
    expect(timeRecordIntegrityService.sealAfterMutation).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
