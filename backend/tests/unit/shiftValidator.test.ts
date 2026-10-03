import { describe, it, expect } from "vitest";
import { ShiftValidator } from "../../src/services/shift/ShiftValidator";
import type { AssignedShift } from "../../src/generated/prisma/client";
import type { PatternSchedule } from "../../src/services/schedulingService";
import { toBusinessDateChile, addBusinessDaysChile } from "../../src/utils/timeUtils";

const validator = new ShiftValidator();

function day(overrides: Partial<PatternSchedule> = {}): PatternSchedule {
  return {
    dayIndex: 0,
    startTime: "08:00",
    endTime: "16:00",
    isOffDay: false,
    hasColacion: true,
    colacionMinutes: 60,
    ...overrides,
  };
}

function assignment(overrides: Partial<AssignedShift> = {}): AssignedShift {
  return {
    id: "a1",
    employeeId: "e1",
    employeeName: null,
    shiftPatternId: "p1",
    shiftPatternName: null,
    startDate: "2026-01-01",
    endDate: "2026-01-07",
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    deletedAt: null,
    ...overrides,
  };
}

describe("ShiftValidator (pure methods, no DB)", () => {
  describe("calculateNetHours", () => {
    it("computes an 8h day without colacion", () => {
      expect(validator.calculateNetHours(day({ hasColacion: false }))).toBe(8);
    });

    it("discounts colacion minutes", () => {
      expect(validator.calculateNetHours(day())).toBe(7);
    });

    it("handles overnight shifts crossing midnight", () => {
      expect(
        validator.calculateNetHours(
          day({ startTime: "22:00", endTime: "06:00", hasColacion: false }),
        ),
      ).toBe(8);
    });

    it("returns 0 for off days", () => {
      expect(
        validator.calculateNetHours(day({ isOffDay: true, startTime: null, endTime: null })),
      ).toBe(0);
    });

    it("clamps invalid ranges to 0 instead of negative", () => {
      expect(
        validator.calculateNetHours(day({ startTime: null, endTime: null, hasColacion: false })),
      ).toBe(0);
    });
  });

  describe("validatePatternSchedules", () => {
    it("accepts a valid week", async () => {
      const days = Array.from({ length: 7 }, (_, i) =>
        i === 6
          ? day({ dayIndex: i, isOffDay: true, startTime: null, endTime: null })
          : day({ dayIndex: i }),
      );
      expect(await validator.validatePatternSchedules(days)).toEqual({ isValid: true });
    });

    it("rejects workdays without times", async () => {
      const result = await validator.validatePatternSchedules([
        day({ startTime: null, endTime: null }),
      ]);
      expect(result.isValid).toBe(false);
    });

    it("rejects zero-duration days", async () => {
      const result = await validator.validatePatternSchedules([
        day({ startTime: "08:00", endTime: "08:00", hasColacion: false }),
      ]);
      expect(result.isValid).toBe(false);
    });
  });

  describe("validateTemporalBoundary", () => {
    it("accepts today and future dates", () => {
      const today = toBusinessDateChile();
      expect(validator.validateTemporalBoundary(today).isValid).toBe(true);
      expect(validator.validateTemporalBoundary(addBusinessDaysChile(today, 30)).isValid).toBe(
        true,
      );
    });

    it("rejects dates older than 7 days (calendar-rot-proof anchors)", () => {
      const today = toBusinessDateChile();
      const result = validator.validateTemporalBoundary(addBusinessDaysChile(today, -30));
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/7 d/);
    });
  });

  describe("validateConflicts (provided assignments, no DB)", () => {
    const existing = [
      assignment({ id: "b1", startDate: "2026-03-01", endDate: "2026-03-07" }),
      assignment({ id: "b2", startDate: "2026-04-01", endDate: null }),
    ];

    it("detects overlapping ranges", async () => {
      const conflicts = await validator.validateConflicts(
        "e1",
        "2026-03-05",
        "2026-03-10",
        undefined,
        existing,
      );
      expect(conflicts.map((c) => c.id)).toEqual(["b1"]);
    });

    it("treats null endDate as open-ended", async () => {
      const conflicts = await validator.validateConflicts(
        "e1",
        "2026-05-01",
        null,
        undefined,
        existing,
      );
      expect(conflicts.map((c) => c.id)).toEqual(["b2"]);
    });

    it("returns empty when ranges do not touch", async () => {
      const conflicts = await validator.validateConflicts(
        "e1",
        "2026-03-08",
        "2026-03-31",
        undefined,
        existing,
      );
      expect(conflicts).toEqual([]);
    });

    it("honors excludeAssignmentId", async () => {
      const conflicts = await validator.validateConflicts(
        "e1",
        "2026-03-05",
        "2026-03-10",
        "b1",
        existing,
      );
      expect(conflicts).toEqual([]);
    });
  });
});
