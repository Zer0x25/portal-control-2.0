import { describe, it, expect } from "vitest";
import { KpiEngine } from "../src/services/kpi/KpiEngine";

describe("KpiEngine", () => {
  const mockSchedule = (hours: number = 9, colacion: number = 60, isWorkDay: boolean = true) => ({
    scheduleText: "08:00 - 18:00",
    isWorkDay,
    startTime: "08:00",
    endTime: "18:00",
    hours,
    colacionMinutes: colacion,
    hasColacion: colacion > 0,
    isHoliday: false,
  });

  describe("calculateWorkedHours", () => {
    it("should calculate correct hours with physical break", () => {
      const record = {
        entrada: "2024-01-01T08:00:00",
        inicioColacion: "2024-01-01T13:00:00",
        finColacion: "2024-01-01T14:00:00",
        salida: "2024-01-01T18:00:00",
      };
      const hours = KpiEngine.calculateWorkedHours(record, mockSchedule());
      expect(hours).toBeCloseTo(9.0); // 10 total - 1 break
    });

    it("should auto-deduct break if punches updates are missing but schedule requires it", () => {
      const record = {
        entrada: "2024-01-01T08:00:00",
        salida: "2024-01-01T18:00:00",
        // No break punches
      };
      const hours = KpiEngine.calculateWorkedHours(record, mockSchedule(9, 60));
      expect(hours).toBeCloseTo(9.0); // 10 total - 1 auto deducted
    });

    it("should NOT auto-deduct if shift is too short (edge case)", () => {
      // In current logic: "if (totalMillisecondsWorked > autoDeductMs)"
      // 3 hours worked. Break is 1 hour.
      const record = {
        entrada: "2024-01-01T08:00:00",
        salida: "2024-01-01T11:00:00",
      };
      const hours = KpiEngine.calculateWorkedHours(record, mockSchedule(9, 60));
      // 3 hours = 180 min. Break = 60 min. 180 > 60. So it deducts?
      // Logic: if (totalMillisecondsWorked > autoDeductMs) -> Deduct.
      // So 3 hours > 1 hour -> 2 hours.
      expect(hours).toBeCloseTo(2.0);
    });

    it("should return 0 if entry or exit missing", () => {
      const hours = KpiEngine.calculateWorkedHours(
        { entrada: "2024-01-01T08:00:00" },
        mockSchedule(),
      );
      expect(hours).toBe(0);
    });

    it("should use contractual break deduction when break is incomplete", () => {
      const record = {
        entrada: "2024-01-01T08:00:00",
        inicioColacion: "2024-01-01T13:00:00",
        salida: "2024-01-01T18:00:00",
      };
      const hours = KpiEngine.calculateWorkedHours(record, mockSchedule(9, 60));
      expect(hours).toBeCloseTo(9.0);
    });

    it("should not deduct break on incomplete break when no schedule exists", () => {
      const record = {
        entrada: "2024-01-01T08:00:00",
        inicioColacion: "2024-01-01T13:00:00",
        salida: "2024-01-01T18:00:00",
      };
      const hours = KpiEngine.calculateWorkedHours(record, null);
      expect(hours).toBeCloseTo(10.0);
    });
  });

  describe("calculateDailyMetrics", () => {
    it("should return 0s for Article 22", () => {
      const metrics = KpiEngine.calculateDailyMetrics({}, mockSchedule(), "Artículo 22");
      expect(metrics.scheduledHours).toBe(0);
      expect(metrics.workedHours).toBe(0);
      expect(metrics.overtimeHours).toBe(0);
    });

    it("should calculate overtime correctly", () => {
      const record = {
        entrada: "2024-01-01T08:00:00",
        inicioColacion: "2024-01-01T13:00:00",
        finColacion: "2024-01-01T14:00:00",
        salida: "2024-01-01T19:00:00", // 1 hour extra
      };
      const metrics = KpiEngine.calculateDailyMetrics(record, mockSchedule(9), "Normal");
      expect(metrics.workedHours).toBeCloseTo(10.0);
      expect(metrics.scheduledHours).toBe(9);
      expect(metrics.overtimeHours).toBeCloseTo(1.0);
    });

    it("should handle Holiday logic (Scheduled=0, Overtime=Worked)", () => {
      const record = {
        entrada: "2024-01-01T08:00:00",
        salida: "2024-01-01T13:00:00", // 5 hours
      };
      const schedule = {
        ...mockSchedule(),
        isWorkDay: false,
        isHoliday: true,
        hours: 0,
        colacionMinutes: 0,
        hasColacion: false,
      };
      const metrics = KpiEngine.calculateDailyMetrics(record, schedule, "Normal");

      expect(metrics.scheduledHours).toBe(0);
      expect(metrics.workedHours).toBeCloseTo(5.0);
      expect(metrics.overtimeHours).toBeCloseTo(5.0);
    });

    it("should handle Justifications (Feriado) by preserving worked and overtime", () => {
      const record = {
        entrada: "2024-01-01T08:00:00",
        salida: "2024-01-01T13:00:00", // 5 hours
        justification: { type: "Feriado" },
      };
      const schedule = {
        ...mockSchedule(),
        isWorkDay: false,
        isHoliday: true,
        hours: 0,
        colacionMinutes: 0,
        hasColacion: false,
      };
      const metrics = KpiEngine.calculateDailyMetrics(record, schedule, "Normal");

      expect(metrics.scheduledHours).toBe(0);
      expect(metrics.workedHours).toBeCloseTo(5.0);
      expect(metrics.overtimeHours).toBeCloseTo(5.0);
    });
  });
});
