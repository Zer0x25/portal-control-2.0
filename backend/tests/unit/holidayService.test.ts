import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HolidayService, holidayService } from "../../src/services/HolidayService";
import prisma from "../../src/services/db";
import { auditService } from "../../src/services/auditService";
import { SocketService } from "../../src/services/socketService";

vi.mock("../../src/services/db", () => ({
  default: {
    holiday: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../../src/services/auditService", () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock("../../src/services/socketService", () => ({
  SocketService: {
    emit: vi.fn(),
  },
}));

vi.mock("ulid", () => ({
  ulid: () => "mocked-ulid-123",
}));

describe("HolidayService", () => {
  let service: HolidayService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HolidayService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports a default singleton holidayService instance", () => {
    expect(holidayService).toBeInstanceOf(HolidayService);
  });

  describe("upsertHoliday", () => {
    it("successfully creates/updates a holiday with explicit id and type", async () => {
      const holidayData = {
        id: "custom-id-1",
        date: "2026-05-01",
        name: "Día del Trabajador",
        type: "Irrenunciable",
      };

      const mockResult = {
        id: holidayData.id,
        date: holidayData.date,
        name: holidayData.name,
        type: holidayData.type,
      };

      vi.mocked(prisma.holiday.upsert).mockResolvedValue(mockResult as never);

      const result = await service.upsertHoliday(holidayData, "admin-user");

      expect(prisma.holiday.upsert).toHaveBeenCalledWith({
        where: { date: "2026-05-01" },
        update: { name: "Día del Trabajador", type: "Irrenunciable" },
        create: {
          id: "custom-id-1",
          date: "2026-05-01",
          name: "Día del Trabajador",
          type: "Irrenunciable",
        },
      });

      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "admin-user",
        action: "HOLIDAY_UPSERT",
        category: "OPERATIONS",
        details: { date: "2026-05-01", name: "Día del Trabajador" },
      });

      expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", mockResult);
      expect(result).toEqual(mockResult);
    });

    it("uses default ULID and default type 'Nacional' when not provided", async () => {
      const holidayData = {
        date: "2026-09-18",
        name: "Fiestas Patrias",
      };

      const mockResult = {
        id: "mocked-ulid-123",
        date: holidayData.date,
        name: holidayData.name,
        type: "Nacional",
      };

      vi.mocked(prisma.holiday.upsert).mockResolvedValue(mockResult as never);

      const result = await service.upsertHoliday(holidayData, "editor-user");

      expect(prisma.holiday.upsert).toHaveBeenCalledWith({
        where: { date: "2026-09-18" },
        update: { name: "Fiestas Patrias", type: "Nacional" },
        create: {
          id: "mocked-ulid-123",
          date: "2026-09-18",
          name: "Fiestas Patrias",
          type: "Nacional",
        },
      });

      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "editor-user",
        action: "HOLIDAY_UPSERT",
        category: "OPERATIONS",
        details: { date: "2026-09-18", name: "Fiestas Patrias" },
      });

      expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", mockResult);
      expect(result).toEqual(mockResult);
    });

    it("propagates database errors and does not log audit or emit socket events", async () => {
      vi.mocked(prisma.holiday.upsert).mockRejectedValue(new Error("Database connection error"));

      await expect(
        service.upsertHoliday({ date: "2026-12-25", name: "Navidad" }, "admin-user"),
      ).rejects.toThrow("Database connection error");

      expect(auditService.log).not.toHaveBeenCalled();
      expect(SocketService.emit).not.toHaveBeenCalled();
    });
  });

  describe("deleteHoliday", () => {
    it("successfully deletes holiday, logs warning audit with holiday details, and emits deletion event", async () => {
      vi.mocked(prisma.holiday.findUnique).mockResolvedValue({
        date: "2026-05-01",
        name: "Día del Trabajador",
      } as never);
      vi.mocked(prisma.holiday.delete).mockResolvedValue({ id: "holiday-to-delete" } as never);

      await service.deleteHoliday("holiday-to-delete", "admin-user");

      expect(prisma.holiday.findUnique).toHaveBeenCalledWith({
        where: { id: "holiday-to-delete" },
        select: { date: true, name: true },
      });
      expect(prisma.holiday.delete).toHaveBeenCalledWith({
        where: { id: "holiday-to-delete" },
      });
      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "admin-user",
        action: "HOLIDAY_DELETE",
        category: "OPERATIONS",
        severity: "WARNING",
        details: {
          id: "holiday-to-delete",
          date: "2026-05-01",
          name: "Día del Trabajador",
        },
      });
      expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", {
        id: "holiday-to-delete",
        isDeleted: true,
      });
    });

    it("handles deletion gracefully when holiday summary is not found", async () => {
      vi.mocked(prisma.holiday.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.holiday.delete).mockResolvedValue({ id: "non-existent" } as never);

      await service.deleteHoliday("non-existent", "admin-user");

      expect(prisma.holiday.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent" },
        select: { date: true, name: true },
      });
      expect(prisma.holiday.delete).toHaveBeenCalledWith({
        where: { id: "non-existent" },
      });
      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "admin-user",
        action: "HOLIDAY_DELETE",
        category: "OPERATIONS",
        severity: "WARNING",
        details: {
          id: "non-existent",
          date: undefined,
          name: undefined,
        },
      });
      expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", {
        id: "non-existent",
        isDeleted: true,
      });
    });

    it("propagates error when delete fails and skips audit and socket emit", async () => {
      vi.mocked(prisma.holiday.findUnique).mockResolvedValue({
        date: "2026-01-01",
        name: "Año Nuevo",
      } as never);
      vi.mocked(prisma.holiday.delete).mockRejectedValue(new Error("Foreign key constraint"));

      await expect(service.deleteHoliday("err-id", "admin-user")).rejects.toThrow(
        "Foreign key constraint",
      );

      expect(auditService.log).not.toHaveBeenCalled();
      expect(SocketService.emit).not.toHaveBeenCalled();
    });
  });

  describe("bulkUpsertHolidays", () => {
    it("successfully performs bulk upsert, logs audit, and emits bulk socket event", async () => {
      const bulkInput = [
        { id: "h-1", date: "2026-01-01", name: "Año Nuevo", type: "Nacional" },
        { date: "2026-12-25", name: "Navidad" },
      ];

      vi.mocked(prisma.holiday.upsert)
        .mockResolvedValueOnce({
          id: "h-1",
          date: "2026-01-01",
          name: "Año Nuevo",
          type: "Nacional",
        } as never)
        .mockResolvedValueOnce({
          id: "mocked-ulid-123",
          date: "2026-12-25",
          name: "Navidad",
          type: "Nacional",
        } as never);

      const count = await service.bulkUpsertHolidays(bulkInput, "bulk-actor");

      expect(count).toBe(2);
      expect(prisma.holiday.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.holiday.upsert).toHaveBeenNthCalledWith(1, {
        where: { date: "2026-01-01" },
        update: { name: "Año Nuevo", type: "Nacional" },
        create: { id: "h-1", date: "2026-01-01", name: "Año Nuevo", type: "Nacional" },
      });
      expect(prisma.holiday.upsert).toHaveBeenNthCalledWith(2, {
        where: { date: "2026-12-25" },
        update: { name: "Navidad", type: "Nacional" },
        create: {
          id: "mocked-ulid-123",
          date: "2026-12-25",
          name: "Navidad",
          type: "Nacional",
        },
      });

      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "bulk-actor",
        action: "HOLIDAY_BULK_UPSERT",
        category: "OPERATIONS",
        details: { count: 2 },
      });
      expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", {
        type: "bulk",
        count: 2,
      });
    });

    it("handles empty array correctly", async () => {
      const count = await service.bulkUpsertHolidays([], "bulk-actor");

      expect(count).toBe(0);
      expect(prisma.holiday.upsert).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "bulk-actor",
        action: "HOLIDAY_BULK_UPSERT",
        category: "OPERATIONS",
        details: { count: 0 },
      });
      expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", {
        type: "bulk",
        count: 0,
      });
    });

    it("propagates error if any upsert fails during bulk operation", async () => {
      vi.mocked(prisma.holiday.upsert).mockRejectedValue(new Error("Bulk write failure"));

      await expect(
        service.bulkUpsertHolidays([{ date: "2026-01-01", name: "Año Nuevo" }], "actor"),
      ).rejects.toThrow("Bulk write failure");

      expect(auditService.log).not.toHaveBeenCalled();
      expect(SocketService.emit).not.toHaveBeenCalled();
    });
  });

  describe("syncExternalHolidays defaults", () => {
    it("uses current year and 'SYSTEM' actor as defaults", async () => {
      const currentYear = new Date().getFullYear();
      const mockResponse = {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({
          status: "success",
          data: [{ date: `${currentYear}-01-01`, title: "Año Nuevo", inalienable: true }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse as unknown as Response);
      vi.mocked(prisma.holiday.upsert).mockResolvedValue({} as never);

      const result = await service.syncExternalHolidays();

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.boostr.cl/holidays/${currentYear}.json`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(auditService.log).toHaveBeenCalledWith({
        actorUsername: "SYSTEM",
        action: "HOLIDAY_SYNC",
        category: "OPERATIONS",
        details: { count: 1, year: currentYear },
      });
      expect(result).toEqual({ success: true, total: 1, year: currentYear });
    });
  });
});
