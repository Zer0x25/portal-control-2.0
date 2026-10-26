import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Holiday, LeaveRecord, TheoreticalShiftPattern, AssignedShift } from "../../types";
import {
  extractScheduleLeaves,
  useEmployeeDailyScheduleLookup,
} from "../../hooks/useEmployeeDailyScheduleLookup";

const date = new Date(Date.UTC(2026, 2, 2));

const assignment = (overrides: Partial<AssignedShift> = {}): AssignedShift =>
  ({
    id: "assignment-1",
    employeeId: "employee-1",
    shiftPatternId: "pattern-1",
    startDate: "2026-03-01",
    ...overrides,
  }) as AssignedShift;

const pattern = (overrides: Partial<TheoreticalShiftPattern> = {}): TheoreticalShiftPattern =>
  ({
    id: "pattern-1",
    name: "Turno día",
    cycleLengthDays: 1,
    color: "#123456",
    dailySchedules: [
      {
        dayIndex: 0,
        startTime: "09:00",
        endTime: "18:00",
        hours: 8,
        isOffDay: false,
        hasColacion: true,
        colacionMinutes: 60,
      },
    ],
    ...overrides,
  }) as TheoreticalShiftPattern;

const leave = (overrides: Partial<LeaveRecord> = {}): LeaveRecord =>
  ({
    id: "leave-1",
    employeeId: "employee-1",
    type: "Vacaciones",
    startDate: "2026-03-01",
    endDate: "2026-03-03",
    ...overrides,
  }) as LeaveRecord;

const holiday = (overrides: Partial<Holiday> = {}): Holiday =>
  ({
    id: "holiday-1",
    date: "2026-03-02",
    name: "Feriado local",
    type: "Regional",
    ...overrides,
  }) as Holiday;

describe("useEmployeeDailyScheduleLookup", () => {
  it("extracts leaves from array and paginated API response shapes", () => {
    const items = [leave()];

    expect(extractScheduleLeaves(items)).toBe(items);
    expect(extractScheduleLeaves({ data: items })).toBe(items);
    expect(extractScheduleLeaves(undefined)).toEqual([]);
  });

  it("keeps unknown employees null unless the caller allows missing directory data", () => {
    const { result: strictResult } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [],
        holidays: [],
        leaves: [],
        assignedShifts: [],
        shiftPatterns: [],
      }),
    );
    const { result: permissiveResult } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [],
        holidays: [],
        leaves: [],
        assignedShifts: [],
        shiftPatterns: [],
        allowUnknownEmployees: true,
      }),
    );

    expect(strictResult.current("employee-1", date)).toBeNull();
    expect(permissiveResult.current("employee-1", date)).toEqual({
      scheduleText: "Sin Turno Asignado",
      isWorkDay: false,
      planningStatus: "SinTurnoAsignado",
    });
  });

  it("prioritizes an approved leave over holidays and scheduled shifts", () => {
    const { result } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [{ id: "employee-1" }],
        holidays: [holiday()],
        leaves: [leave()],
        assignedShifts: [assignment()],
        shiftPatterns: [pattern()],
      }),
    );

    expect(result.current("employee-1", date)).toEqual({
      scheduleText: "Vacaciones",
      isWorkDay: false,
      justificationType: "Vacaciones",
      patternColor: "#8E44AD",
      planningStatus: "Vacaciones",
    });
  });

  it.each([
    { type: "Licencia Médica", planningStatus: "LicenciaMedica" },
    { type: "Permiso Especial", planningStatus: "PermisoEspecial" },
  ] as const)("maps $type to $planningStatus", ({ type, planningStatus }) => {
    const { result } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [{ id: "employee-1" }],
        holidays: [],
        leaves: [leave({ type })],
        assignedShifts: [],
        shiftPatterns: [],
      }),
    );

    expect(result.current("employee-1", date)).toMatchObject({
      scheduleText: type,
      planningStatus,
    });
  });

  it("returns holiday and invalid-pattern states without changing precedence", () => {
    const { result: holidayResult } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [{ id: "employee-1" }],
        holidays: [holiday()],
        leaves: [],
        assignedShifts: [],
        shiftPatterns: [],
      }),
    );
    const { result: invalidPatternResult } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [{ id: "employee-1" }],
        holidays: [],
        leaves: [],
        assignedShifts: [assignment()],
        shiftPatterns: [pattern({ cycleLengthDays: 0 })],
      }),
    );

    expect(holidayResult.current("employee-1", date)).toMatchObject({
      scheduleText: "Feriado: Feriado local",
      isWorkDay: false,
      isHoliday: true,
      planningStatus: "Feriado",
    });
    expect(invalidPatternResult.current("employee-1", date)).toEqual({
      scheduleText: "Patrón Inválido",
      isWorkDay: false,
      planningStatus: "SinTurnoAsignado",
    });
  });

  it("returns off days and full scheduled shift details", () => {
    const { result: offDayResult } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [{ id: "employee-1" }],
        holidays: [],
        leaves: [],
        assignedShifts: [assignment()],
        shiftPatterns: [
          pattern({
            dailySchedules: [
              { dayIndex: 0, isOffDay: true, hasColacion: false, colacionMinutes: 0 },
            ],
          }),
        ],
      }),
    );
    const { result: scheduledResult } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [{ id: "employee-1" }],
        holidays: [],
        leaves: [],
        assignedShifts: [assignment()],
        shiftPatterns: [pattern()],
      }),
    );

    expect(offDayResult.current("employee-1", date)).toMatchObject({
      scheduleText: "Día Libre",
      isWorkDay: false,
      planningStatus: "DiaLibre",
    });
    expect(scheduledResult.current("employee-1", date)).toEqual({
      scheduleText: "09:00 - 18:00",
      isWorkDay: true,
      startTime: "09:00",
      endTime: "18:00",
      hours: 8,
      shiftPatternId: "pattern-1",
      shiftPatternName: "Turno día",
      patternColor: "#123456",
      hasColacion: true,
      colacionMinutes: 60,
      planningStatus: "Programado",
    });
  });

  it("marks a scheduled day as a holiday when the pattern permits holiday work", () => {
    const { result } = renderHook(() =>
      useEmployeeDailyScheduleLookup({
        employees: [{ id: "employee-1" }],
        holidays: [holiday()],
        leaves: [],
        assignedShifts: [assignment()],
        shiftPatterns: [pattern({ worksOnHolidays: true })],
      }),
    );

    expect(result.current("employee-1", date)).toMatchObject({
      scheduleText: "09:00 - 18:00",
      isWorkDay: true,
      isHoliday: true,
      holidayName: "Feriado local",
    });
  });
});
