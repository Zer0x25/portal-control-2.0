import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEmployeeDailyScheduleInfoMock } = vi.hoisted(() => ({
  getEmployeeDailyScheduleInfoMock: vi.fn(),
}));

vi.mock("../src/services/db", () => ({
  default: {},
}));

vi.mock("../src/services/schedulingService", () => ({
  schedulingService: {
    getEmployeeDailyScheduleInfo: (...args: unknown[]) => getEmployeeDailyScheduleInfoMock(...args),
  },
}));

import { TimeRecordService } from "../src/services/TimeRecordService";

describe("TimeRecordService.enrichRecord", () => {
  beforeEach(() => {
    getEmployeeDailyScheduleInfoMock.mockReset();
  });

  it("materializes contract fields for a late open workday", async () => {
    getEmployeeDailyScheduleInfoMock.mockResolvedValue({
      scheduleText: "08:00 - 17:00",
      isWorkDay: true,
      startTime: "08:00",
      endTime: "17:00",
      hours: 8,
      hasColacion: true,
      colacionMinutes: 60,
      planningStatus: "Programado",
    });

    const enriched = await TimeRecordService.enrichRecord({
      id: "r1",
      employeeId: "e1",
      employeeWorkdayType: "Ordinaria",
      date: "2026-03-06",
      status: "Laborando",
      entrada: "2026-03-06T08:25:00-03:00",
      updatedAt: new Date("2026-03-06T12:00:00Z"),
    });

    expect(enriched.clockingStatus).toBe("en_jornada");
    expect(enriched.attendanceStatus).toBe("Atraso");
    expect(enriched.isLate).toBe(true);
    expect(enriched.lateMinutes).toBe(25);
    expect(enriched.scheduledHours).toBe(8);
    expect(enriched.workedHours).toBe(0);
    expect(enriched.overtimeHours).toBe(-8);
  });

  it("marks scheduled day without punches as unjustified absence", async () => {
    getEmployeeDailyScheduleInfoMock.mockResolvedValue({
      scheduleText: "08:00 - 17:00",
      isWorkDay: true,
      startTime: "08:00",
      endTime: "17:00",
      hours: 8,
      planningStatus: "Programado",
    });

    const enriched = await TimeRecordService.enrichRecord({
      id: "r2",
      employeeId: "e1",
      employeeWorkdayType: "Ordinaria",
      date: "2026-03-06",
      status: "Ausente",
      updatedAt: new Date("2026-03-06T12:00:00Z"),
    });

    expect(enriched.clockingStatus).toBe("fuera");
    expect(enriched.attendanceStatus).toBe("Ausente");
    expect(enriched.isLate).toBe(false);
    expect(enriched.lateMinutes).toBeUndefined();
  });

  it("maps leave and day-off planning statuses without local inference", async () => {
    getEmployeeDailyScheduleInfoMock.mockResolvedValue({
      scheduleText: "Vacaciones",
      isWorkDay: false,
      planningStatus: "Vacaciones",
      justificationType: "Vacaciones",
    });

    const vacation = await TimeRecordService.enrichRecord({
      id: "r3",
      employeeId: "e1",
      employeeWorkdayType: "Ordinaria",
      date: "2026-03-06",
      status: "Vacaciones",
      updatedAt: new Date("2026-03-06T12:00:00Z"),
    });

    expect(vacation.attendanceStatus).toBe("Vacaciones");
    expect(vacation.isLate).toBe(false);
    expect(vacation.clockingStatus).toBe("fuera");
  });
});
