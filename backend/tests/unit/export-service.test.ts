import { reportWorkedHours } from "../../src/utils/reportHours";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ExportService } from "../../src/services/export/ExportService";
import prisma from "../../src/services/db";

// Mock de Prisma
vi.mock("../../src/services/db", () => {
  return {
    default: {
      employee: {
        findMany: vi.fn(),
      },
      timeRecord: {
        findMany: vi.fn(),
      },
      shiftReport: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe("ExportService - Unit Tests", () => {
  let exportService: ExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    exportService = new ExportService();
  });

  describe("generateReportPDF - Routing", () => {
    it("should throw error for unknown report type", async () => {
      await expect(exportService.generateReportPDF("invalid_type", {})).rejects.toThrow(
        "Unknown report type: invalid_type",
      );
    });

    it("should call generateShiftReportIndividualPDF when type is shift_report", async () => {
      // @ts-ignore - Accediendo a método privado para espiar
      const spy = vi
        .spyOn(exportService, "generateShiftReportIndividualPDF")
        .mockResolvedValue(Buffer.from("pdf-content"));

      const result = await exportService.generateReportPDF("shift_report", {
        shiftReportId: "123",
      });

      expect(spy).toHaveBeenCalledWith("123");
      expect(result.toString()).toBe("pdf-content");
    });
  });

  describe("calculateWorkedHours", () => {
    it("should return 0 if entrada or salida is missing", () => {
      expect(reportWorkedHours(null, "08:00")).toBe(0);
      expect(reportWorkedHours("08:00", null)).toBe(0);
    });

    it("should calculate correct hours for standard shift", () => {
      expect(reportWorkedHours("08:00", "17:30")).toBe(9.5);
    });

    it("should handle overnight shifts", () => {
      expect(reportWorkedHours("22:00", "06:00")).toBe(8);
    });
  });
});
