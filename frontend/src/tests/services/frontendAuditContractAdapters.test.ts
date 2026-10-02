import { describe, expect, it, vi } from "vitest";
import { getContractAttendanceMetrics, getContractClockingStatus } from "../../utils/mappings";
import type { AttendanceRecord } from "../../types";

const baseRecord = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  id: "r1",
  employeeId: "e1",
  employeeName: "Ana",
  employeePosition: "Operaria",
  employeeArea: "Produccion",
  employeeWorkdayType: "Ordinaria",
  date: "2026-03-06",
  status: "Completado",
  syncStatus: "synced",
  lastModified: 0,
  isDeleted: false,
  ...overrides,
});

describe("frontend audit contract adapters", () => {
  it("prefers backend clockingStatus over legacy fallback", () => {
    const fallback = vi.fn(() => "fuera" as const);

    const status = getContractClockingStatus(
      baseRecord({
        clockingStatus: "en_colacion",
      }),
      fallback,
    );

    expect(status).toBe("en_colacion");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back when backend clockingStatus is absent", () => {
    const fallback = vi.fn(() => "terminada" as const);

    const status = getContractClockingStatus(baseRecord(), fallback);

    expect(status).toBe("terminada");
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("prefers backend metrics over local calculation fallback", () => {
    const fallback = vi.fn(() => ({
      scheduledHours: 8,
      workedHours: 8,
      overtimeHours: 0,
      isDayOffWorked: false,
    }));

    const metrics = getContractAttendanceMetrics(
      baseRecord({
        scheduledHours: 12,
        workedHours: 10.5,
        overtimeHours: 0,
        isDayOffWorked: true,
      }),
      fallback,
    );

    expect(metrics).toEqual({
      scheduledHours: 12,
      workedHours: 10.5,
      overtimeHours: 0,
      isDayOffWorked: true,
    });
    expect(fallback).not.toHaveBeenCalled();
  });
});
