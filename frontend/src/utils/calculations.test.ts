import { describe, it, expect } from "vitest";
import {
  calculateHoursBetween,
  calculateDailyHours,
  getEmployeeClockingStatus,
} from "./calculations";
import { DailyTimeRecord, EmployeeDailyScheduleInfo, Employee } from "../types/index";

// Mock data
const mockEmployee: Employee = {
  id: "EMP-001",
  name: "John Doe",
  position: "Tester",
  area: "QA",
  workdayType: "Full-Time",
  status: "Activo",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};
const mockArt22Employee: Employee = { ...mockEmployee, workdayType: "Artículo 22" };

const mockScheduleInfo: EmployeeDailyScheduleInfo = {
  scheduleText: "09:00 - 18:00",
  isWorkDay: true,
  planningStatus: "Programado",
  startTime: "09:00",
  endTime: "18:00",
  hours: 8,
  hasColacion: true,
  colacionMinutes: 60,
};

const mockRecordBase: DailyTimeRecord = {
  id: "REC-001",
  employeeId: "EMP-001",
  employeeName: "John Doe",
  employeePosition: "Tester",
  employeeArea: "QA",
  employeeWorkdayType: "Full-Time",
  date: "2024-01-10",
  status: "Completado",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

describe("calculateHoursBetween", () => {
  it("should calculate the difference for a standard shift", () => {
    expect(calculateHoursBetween("09:00", "18:00", 60)).toBe(8);
  });
  it("should handle overnight shifts correctly", () => {
    expect(calculateHoursBetween("22:00", "06:00", 0)).toBe(8);
  });
  it("should return 0 for invalid inputs", () => {
    expect(calculateHoursBetween(undefined, "18:00")).toBe(0);
    expect(calculateHoursBetween("09:00", undefined)).toBe(0);
    expect(calculateHoursBetween("invalid", "18:00")).toBe(0);
  });
  it("should handle no break time", () => {
    expect(calculateHoursBetween("10:00", "12:00", 0)).toBe(2);
  });
  it("should return a float for partial hours", () => {
    expect(calculateHoursBetween("08:00", "12:30")).toBe(4.5);
  });
});

describe("calculateDailyHours", () => {
  it("should calculate hours for a normal workday", () => {
    const record: DailyTimeRecord = {
      ...mockRecordBase,
      entradaTimestamp: new Date("2024-01-10T09:00:00").getTime(),
      salidaTimestamp: new Date("2024-01-10T18:00:00").getTime(),
      inicioColacionTimestamp: new Date("2024-01-10T13:00:00").getTime(),
      finColacionTimestamp: new Date("2024-01-10T14:00:00").getTime(),
    };
    const { scheduledHours, workedHours, overtimeHours } = calculateDailyHours(
      record,
      mockScheduleInfo,
      mockEmployee,
    );
    expect(scheduledHours).toBe(8);
    expect(workedHours).toBe(8);
    expect(overtimeHours).toBe(0);
  });
  it("should calculate overtime correctly", () => {
    const record: DailyTimeRecord = {
      ...mockRecordBase,
      entradaTimestamp: new Date("2024-01-10T09:00:00").getTime(),
      salidaTimestamp: new Date("2024-01-10T19:30:00").getTime(),
      inicioColacionTimestamp: new Date("2024-01-10T13:00:00").getTime(),
      finColacionTimestamp: new Date("2024-01-10T14:00:00").getTime(),
    };
    const { scheduledHours, workedHours, overtimeHours } = calculateDailyHours(
      record,
      mockScheduleInfo,
      mockEmployee,
    );
    expect(scheduledHours).toBe(8);
    expect(workedHours).toBe(9.5);
    expect(overtimeHours).toBe(1.5);
  });
  it('should handle "Artículo 22" employees', () => {
    const record: DailyTimeRecord = {
      ...mockRecordBase,
      entradaTimestamp: new Date("2024-01-10T09:00:00").getTime(),
      salidaTimestamp: new Date("2024-01-10T20:00:00").getTime(),
    };
    const { scheduledHours, workedHours, overtimeHours } = calculateDailyHours(
      record,
      mockScheduleInfo,
      mockArt22Employee,
    );
    expect(scheduledHours).toBe(0);
    expect(workedHours).toBe(11);
    expect(overtimeHours).toBe(0);
  });
  it("should handle justified absences", () => {
    const record: DailyTimeRecord = {
      ...mockRecordBase,
      justification: { type: "Vacaciones", leaveId: "L-001" },
    };
    const { scheduledHours, workedHours, overtimeHours, justificationType } = calculateDailyHours(
      record,
      mockScheduleInfo,
      mockEmployee,
    );
    expect(scheduledHours).toBe(8);
    expect(workedHours).toBe(0);
    expect(overtimeHours).toBe(0);
    expect(justificationType).toBe("Vacaciones");
  });
  it("should handle unjustified absences", () => {
    const record: DailyTimeRecord = {
      ...mockRecordBase,
      status: "Completado",
      entradaTimestamp: 0,
      salidaTimestamp: 0,
    };
    const { scheduledHours, workedHours, overtimeHours } = calculateDailyHours(
      record,
      mockScheduleInfo,
      mockEmployee,
    );
    expect(scheduledHours).toBe(8);
    expect(workedHours).toBe(0);
    expect(overtimeHours).toBe(0);
  });
  it("should treat a worked holiday as full overtime (if not Sunday)", () => {
    const holidaySchedule: EmployeeDailyScheduleInfo = {
      ...mockScheduleInfo,
      isHoliday: true,
      isWorkDay: true,
    };
    const record: DailyTimeRecord = {
      ...mockRecordBase,
      date: "2024-01-10", // A Wednesday
      entradaTimestamp: new Date("2024-01-10T09:00:00").getTime(),
      salidaTimestamp: new Date("2024-01-10T14:00:00").getTime(), // 5 hours worked
    };
    const { scheduledHours, workedHours, overtimeHours } = calculateDailyHours(
      record,
      holidaySchedule,
      mockEmployee,
    );
    expect(scheduledHours).toBe(0);
    expect(workedHours).toBe(5);
    expect(overtimeHours).toBe(5);
  });
});

describe("getEmployeeClockingStatus", () => {
  it('should return "fuera" for null records', () => {
    expect(getEmployeeClockingStatus(null)).toBe("fuera");
  });
  it('should return "jornada_terminada_anomalia" for anomaly statuses', () => {
    expect(getEmployeeClockingStatus({ ...mockRecordBase, status: "AnomaliaManual" })).toBe(
      "jornada_terminada_anomalia",
    );
  });
  it('should return "terminada" for complete records', () => {
    expect(getEmployeeClockingStatus({ ...mockRecordBase, status: "Completado" })).toBe(
      "terminada",
    );
  });
  it('should return correct statuses for "Laborando" records', () => {
    const baseOpen = { ...mockRecordBase, status: "Laborando" as const };
    expect(getEmployeeClockingStatus({ ...baseOpen, entradaTimestamp: Date.now() })).toBe(
      "en_jornada",
    );
    expect(
      getEmployeeClockingStatus({
        ...baseOpen,
        entradaTimestamp: Date.now(),
        inicioColacionTimestamp: Date.now(),
      }),
    ).toBe("en_colacion");
    expect(
      getEmployeeClockingStatus({
        ...baseOpen,
        entradaTimestamp: Date.now(),
        inicioColacionTimestamp: Date.now(),
        finColacionTimestamp: Date.now(),
      }),
    ).toBe("en_jornada_post_colacion");
  });
});
