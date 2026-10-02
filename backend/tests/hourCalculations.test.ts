import { describe, it, expect } from "vitest";
import { KpiEngine } from "../src/services/kpi/KpiEngine";

describe("Hour Calculation Logic - KpiEngine", () => {
  it("should calculate normal worked hours with manual breaks correctly", () => {
    const record = {
      entrada: "2026-02-09T08:00:00Z",
      salida: "2026-02-09T17:00:00Z",
      inicioColacion: "2026-02-09T13:00:00Z",
      finColacion: "2026-02-09T14:00:00Z",
    };
    const scheduleInfo: any = { hasColacion: true, colacionMinutes: 60 };

    const hours = KpiEngine.calculateWorkedHours(record, scheduleInfo);
    expect(hours).toBe(8); // 9 hours total - 1 hour break
  });

  it("should apply auto-deduction of colacion if manual punches are missing", () => {
    const record = {
      entrada: "2026-02-09T08:00:00Z",
      salida: "2026-02-09T17:00:00Z",
      inicioColacion: null,
      finColacion: null,
    };
    const scheduleInfo: any = { hasColacion: true, colacionMinutes: 60 };

    const hours = KpiEngine.calculateWorkedHours(record, scheduleInfo);
    expect(hours).toBe(8); // 9 hours total - 60 min auto-deduct
  });

  it('should handle "Artículo 22" employees (should return 0 working hours registered)', () => {
    const record = {
      entrada: "2026-02-09T08:00:00Z",
      salida: "2026-02-09T17:00:00Z",
    };
    const scheduleInfo: any = { isWorkDay: true, hours: 9 };
    const employeeType = "Artículo 22";

    const result = KpiEngine.calculateDailyMetrics(record, scheduleInfo, employeeType);
    expect(result.workedHours).toBe(0);
    expect(result.overtimeHours).toBe(0);
  });

  it("should calculate overtime correctly for normal employees", () => {
    const record = {
      entrada: "2026-02-09T08:00:00.000Z",
      salida: "2026-02-09T18:00:00.000Z", // 10 hours
      inicioColacion: "2026-02-09T13:00:00.000Z",
      finColacion: "2026-02-09T14:00:00.000Z", // 1 hour break
    };
    const scheduleInfo: any = { isWorkDay: true, hours: 8 }; // Schedule = 8
    const employeeType = "Normal";

    const result = KpiEngine.calculateDailyMetrics(record, scheduleInfo, employeeType);
    expect(result.workedHours).toBe(9);
    expect(result.scheduledHours).toBe(8);
    expect(result.overtimeHours).toBe(1);
  });
});
