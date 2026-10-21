import { describe, it, expect } from "vitest";
import { detectAssignmentConflicts, calculateAverageWeeklyHours } from "./shiftUtils";
import { AssignedShift, TheoreticalShiftPattern } from "../types";

describe("detectAssignmentConflicts", () => {
  it("detects overlapping assignments for the same employee", () => {
    const assignments: AssignedShift[] = [
      {
        id: "as-1",
        employeeId: "emp-1",
        shiftPatternId: "p-1",
        startDate: "2026-10-01",
        endDate: "2026-10-15",
      } as AssignedShift,
      {
        id: "as-2",
        employeeId: "emp-1",
        shiftPatternId: "p-2",
        startDate: "2026-10-10",
        endDate: "2026-10-20",
      } as AssignedShift,
    ];

    const conflicts = detectAssignmentConflicts(assignments);
    expect(conflicts.has("as-1")).toBe(true);
    expect(conflicts.has("as-2")).toBe(true);
  });

  it("returns empty set when assignments do not overlap", () => {
    const assignments: AssignedShift[] = [
      {
        id: "as-1",
        employeeId: "emp-1",
        shiftPatternId: "p-1",
        startDate: "2026-10-01",
        endDate: "2026-10-09",
      } as AssignedShift,
      {
        id: "as-2",
        employeeId: "emp-1",
        shiftPatternId: "p-2",
        startDate: "2026-10-10",
        endDate: "2026-10-20",
      } as AssignedShift,
    ];

    const conflicts = detectAssignmentConflicts(assignments);
    expect(conflicts.size).toBe(0);
  });
});

describe("calculateAverageWeeklyHours", () => {
  it("calculates weekly hours based on cycle days", () => {
    const patterns: TheoreticalShiftPattern[] = [
      {
        id: "p-1",
        cycleLengthDays: 7,
        dailySchedules: [
          { hours: 8 },
          { hours: 8 },
          { hours: 8 },
          { hours: 8 },
          { hours: 8 },
          { hours: 0 },
          { hours: 0 },
        ],
      } as TheoreticalShiftPattern,
    ];

    const assignments: AssignedShift[] = [
      {
        id: "as-1",
        employeeId: "emp-1",
        shiftPatternId: "p-1",
        startDate: "2026-10-01",
      } as AssignedShift,
    ];

    const avg = calculateAverageWeeklyHours(assignments, patterns, "emp-1");
    expect(avg).toBe(40);
  });

  it("returns 0 if no assignments exist", () => {
    expect(calculateAverageWeeklyHours([], [], "emp-1")).toBe(0);
  });
});
