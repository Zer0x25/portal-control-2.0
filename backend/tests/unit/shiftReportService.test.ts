import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShiftReportService } from "../../src/services/ShiftReportService";
import prisma, { withDirectTransaction } from "../../src/services/db";
import { auditService } from "../../src/services/auditService";
import { SocketService } from "../../src/services/socketService";
import { NotFoundError } from "../../src/utils/AppError";

vi.mock("../../src/services/db", () => {
  const mockPrisma = {
    shiftReport: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
    prismaDirect: mockPrisma,
    withDirectTransaction: vi.fn(async (cb) => cb(mockPrisma)),
  };
});

vi.mock("../../src/services/auditService", () => ({
  auditService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../src/services/socketService", () => ({
  SocketService: {
    emit: vi.fn(),
  },
}));

describe("ShiftReportService update and delete anti-regression unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const existingReport = {
    id: "rep-1",
    folio: "001",
    shiftName: "Mañana",
    responsibleUser: "operador",
    startTime: new Date("2026-10-14T08:00:00Z"),
    endTime: null,
    status: "open",
    date: new Date("2026-10-14T00:00:00Z"),
    logEntries: "[]",
    supplierEntries: "[]",
    isDeleted: false,
  };

  describe("ShiftReportService.update", () => {
    it("throws NotFoundError when report does not exist or is deleted", async () => {
      vi.mocked(prisma.shiftReport.findFirst).mockResolvedValue(null);

      await expect(
        ShiftReportService.update("non-existent", { shiftName: "Tarde" }, "admin"),
      ).rejects.toThrow(NotFoundError);

      expect(prisma.shiftReport.findFirst).toHaveBeenCalledWith({
        where: { id: "non-existent", isDeleted: false },
      });
    });

    it("merges partial data and delegates to createOrUpdate", async () => {
      vi.mocked(prisma.shiftReport.findFirst).mockResolvedValue(existingReport as any);

      const spyCreateOrUpdate = vi
        .spyOn(ShiftReportService, "createOrUpdate")
        .mockResolvedValue({ id: "rep-1", folio: "001" } as any);

      const result = await ShiftReportService.update(
        "rep-1",
        { shiftName: "Tarde", status: "closed" },
        "admin",
      );

      expect(spyCreateOrUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "rep-1",
          folio: "001",
          shiftName: "Tarde",
          status: "closed",
          responsibleUser: "operador",
        }),
        "admin",
      );
      expect(result).toEqual({ id: "rep-1", folio: "001" });
    });
  });

  describe("ShiftReportService.delete", () => {
    it("throws NotFoundError when report does not exist or is deleted", async () => {
      vi.mocked(prisma.shiftReport.findFirst).mockResolvedValue(null);

      await expect(ShiftReportService.delete("missing-id", "admin")).rejects.toThrow(NotFoundError);
      expect(withDirectTransaction).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
      expect(SocketService.emit).not.toHaveBeenCalled();
    });

    it("soft-deletes report, emits audit and socket events", async () => {
      vi.mocked(prisma.shiftReport.findFirst).mockResolvedValue(existingReport as any);

      await ShiftReportService.delete("rep-1", "admin-actor");

      expect(withDirectTransaction).toHaveBeenCalled();
      expect(prisma.shiftReport.update).toHaveBeenCalledWith({
        where: { id: "rep-1" },
        data: { isDeleted: true },
      });

      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "admin-actor",
        action: "SHIFT_REPORT_DELETED",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "SUCCESS",
        details: { shiftId: "rep-1", folio: "001" },
      });

      expect(SocketService.emit).toHaveBeenCalledWith("shiftReport:deleted", {
        id: "rep-1",
        isDeleted: true,
      });
    });
  });
});
