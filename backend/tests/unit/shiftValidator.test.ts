import { describe, it, expect, vi } from "vitest";
import { ShiftValidator } from "../../src/services/shift/ShiftValidator";
import type { AssignedShift, Prisma } from "../../src/generated/prisma/client";
import type { PatternSchedule } from "../../src/services/schedulingService";
import { schedulingService } from "../../src/services/schedulingService";
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

    it("accepts a 14-day (7x7) pattern with dayIndex 0..13", async () => {
      const days = Array.from({ length: 14 }, (_, i) =>
        i >= 7
          ? day({ dayIndex: i, isOffDay: true, startTime: null, endTime: null })
          : day({ dayIndex: i }),
      );
      expect(await validator.validatePatternSchedules(days, 14)).toEqual({ isValid: true });
    });

    it("rejects dayIndex >= cycleLengthDays", async () => {
      const result = await validator.validatePatternSchedules([day({ dayIndex: 14 })], 14);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("excede la duración del ciclo");
    });
  });

  describe("validateTemporalBoundary", () => {
    it("accepts today and future dates", () => {
      const today = toBusinessDateChile();
      expect(validator.validateTemporalBoundary(today)).toEqual({ isValid: true });
      expect(validator.validateTemporalBoundary(addBusinessDaysChile(today, 1))).toEqual({
        isValid: true,
      });
      expect(validator.validateTemporalBoundary(addBusinessDaysChile(today, 30))).toEqual({
        isValid: true,
      });
    });

    it("accepts dates in the past within the 7-day boundary", () => {
      const today = toBusinessDateChile();
      expect(validator.validateTemporalBoundary(addBusinessDaysChile(today, -1))).toEqual({
        isValid: true,
      });
      expect(validator.validateTemporalBoundary(addBusinessDaysChile(today, -6))).toEqual({
        isValid: true,
      });
    });

    it("accepts dates exactly at the 7-day boundary limit", () => {
      const today = toBusinessDateChile();
      const exactBoundary = addBusinessDaysChile(today, -7);
      expect(validator.validateTemporalBoundary(exactBoundary)).toEqual({ isValid: true });
    });

    it("rejects dates just beyond the 7-day boundary (8 days ago)", () => {
      const today = toBusinessDateChile();
      const justPastLimit = addBusinessDaysChile(today, -8);
      const result = validator.validateTemporalBoundary(justPastLimit);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "No se pueden registrar o editar registros con más de 7 días de antigüedad.",
      );
    });

    it("rejects dates older than 7 days (calendar-rot-proof anchors)", () => {
      const today = toBusinessDateChile();
      const result30 = validator.validateTemporalBoundary(addBusinessDaysChile(today, -30));
      expect(result30.isValid).toBe(false);
      expect(result30.error).toBe(
        "No se pueden registrar o editar registros con más de 7 días de antigüedad.",
      );

      const result365 = validator.validateTemporalBoundary(addBusinessDaysChile(today, -365));
      expect(result365.isValid).toBe(false);
      expect(result365.error).toBe(
        "No se pueden registrar o editar registros con más de 7 días de antigüedad.",
      );
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

  describe("calculateAverageWeeklyHours / validateWorkload", () => {
    it("checks all affected assignments instead of only the latest one", async () => {
      const mockDb = {
        shiftPattern: {
          findMany: vi.fn(async () => [
            {
              id: "p-heavy",
              cycleLengthDays: 7,
              dailySchedules: JSON.stringify(
                Array.from({ length: 7 }, (_, i) =>
                  day({ dayIndex: i, startTime: "08:00", endTime: "18:00", hasColacion: false }),
                ),
              ),
            },
            {
              id: "p-light",
              cycleLengthDays: 7,
              dailySchedules: JSON.stringify(
                Array.from({ length: 7 }, (_, i) =>
                  i < 5
                    ? day({ dayIndex: i, startTime: "09:00", endTime: "17:00", hasColacion: false })
                    : day({ dayIndex: i, isOffDay: true, startTime: null, endTime: null }),
                ),
              ),
            },
          ]),
        },
        employee: {
          findUnique: vi.fn(async () => ({ workdayType: "Ordinaria" })),
        },
        systemConfig: {
          findUnique: vi.fn(async () => ({ value: "45" })),
        },
      } as unknown as Prisma.TransactionClient;

      const existingFuture = [
        assignment({
          id: "future-1",
          startDate: "2026-12-01",
          endDate: "2026-12-31",
          shiftPatternId: "p-light",
        }),
      ];

      const result = await validator.validateWorkload(
        "e1",
        {
          employeeId: "e1",
          shiftPatternId: "p-heavy",
          startDate: "2026-11-18",
          endDate: "2026-11-30",
        },
        undefined,
        existingFuture,
        mockDb,
      );

      expect(result.isValid).toBe(false);
      expect(result.weeklyHours).toBe(70);
      expect(result.maxHours).toBe(45);
    });
  });

  describe("validateRestPeriod", () => {
    it("computes cycle dayIndex for startDate in Chile timezone and detects < 8h rest", async () => {
      const spy = vi
        .spyOn(schedulingService, "getEmployeeDailyScheduleInfo")
        .mockResolvedValueOnce({
          scheduleText: "16:00 - 23:00",
          isWorkDay: true,
          startTime: "16:00",
          endTime: "23:00",
        });

      const pattern = {
        cycleLengthDays: 2,
        dailySchedules: [
          day({ dayIndex: 0, isOffDay: true, startTime: null, endTime: null }),
          day({ dayIndex: 1, isOffDay: false, startTime: "06:00", endTime: "14:00" }),
        ],
      };

      const res = await validator.validateRestPeriod(
        "e1",
        "2026-11-20",
        pattern,
        undefined,
        "2026-11-19",
      );

      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Descanso insuficiente (7.0h)");
      spy.mockRestore();
    });

    it("returns valid when target day is an off day even if startTime is present", async () => {
      const res = await validator.validateRestPeriod("e1", "2026-11-20", {
        cycleLengthDays: 1,
        dailySchedules: [day({ dayIndex: 0, isOffDay: true, startTime: "06:00" })],
      });
      expect(res).toEqual({ isValid: true });
    });
  });
});
