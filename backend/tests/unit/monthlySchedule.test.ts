import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { schedulingService } from "../../src/services/schedulingService";
const db = vi.hoisted(() => ({
  employee: { findUnique: vi.fn() },
  assignedShift: { findMany: vi.fn() },
  leaveRecord: { findMany: vi.fn() },
  holiday: { findMany: vi.fn() },
  shiftPattern: { findMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("../../src/services/db", () => ({ default: db }));
const originalTZ = process.env.TZ;
beforeEach(() => {
  vi.resetAllMocks();
  db.employee.findUnique.mockResolvedValue({ id: "employee" });
});
afterEach(() => {
  if (originalTZ === undefined) delete process.env.TZ;
  else process.env.TZ = originalTZ;
});
describe.each(["UTC", "America/Santiago", "America/New_York"])(
  "Monthly calendar with host TZ %s",
  (tz) => {
    it.each([
      [2026, 9, 30], // Midnight skip at DST start.
      [2026, 4, 30], // DST end.
      [2024, 2, 29],
      [2026, 12, 31],
    ])("keeps calendar dates and batch reads for %i-%i", async (year, month, days) => {
      process.env.TZ = tz;
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      const start = `${prefix}-01`,
        end = `${prefix}-${days}`;
      const pattern = {
        id: "pattern",
        name: "Alternating",
        cycleLengthDays: 2,
        worksOnHolidays: false,
        dailySchedules: [
          { dayIndex: 0, isOffDay: false, startTime: "09:00", endTime: "17:00", hours: 8 },
          { dayIndex: 1, isOffDay: true },
        ],
      };
      db.assignedShift.findMany.mockResolvedValue([
        { employeeId: "employee", shiftPatternId: "pattern", startDate: start, endDate: end },
      ]);
      db.leaveRecord.findMany.mockResolvedValue([
        {
          employeeId: "employee",
          startDate: `${prefix}-06`,
          endDate: `${prefix}-07`,
          type: "Vacaciones",
        },
      ]);
      db.holiday.findMany.mockResolvedValue([
        { date: start, name: "Month start" },
        { date: `${prefix}-07`, name: "Overlapping holiday" },
        { date: end, name: "Month end" },
      ]);
      db.shiftPattern.findMany.mockResolvedValue([pattern]);
      const result = await schedulingService.getEmployeeScheduleForMonth("employee", year, month);
      expect(result).toHaveLength(days);
      for (let day = 1; day <= days; day++) {
        const row = result[day - 1];
        expect(row.dateIso).toBe(`${prefix}-${String(day).padStart(2, "0")}`);
        expect(row.dayOfMonth).toBe(day);
        expect(row.dayOfWeek).toBe(
          new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("es-CL", {
            weekday: "short",
            timeZone: "UTC",
          }),
        );
        if (day === 6 || day === 7)
          expect(row).toMatchObject({ scheduleText: "Vacaciones", isWorkDay: false });
        else if (day === 1 || day === days)
          expect(row).toMatchObject({
            scheduleText: expect.stringMatching(/^Feriado:/),
            isWorkDay: false,
          });
        else
          expect(row).toMatchObject({
            scheduleText: day % 2 === 1 ? "09:00 - 17:00" : "Día Libre",
            isWorkDay: day % 2 === 1,
          });
      }
      expect(db.employee.findUnique).toHaveBeenCalledTimes(1);
      for (const dependency of [db.assignedShift, db.leaveRecord, db.holiday, db.shiftPattern])
        expect(dependency.findMany).toHaveBeenCalledTimes(1);
      expect(db.shiftPattern.findUnique).not.toHaveBeenCalled();
      expect(db.assignedShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: { in: ["employee"] },
            startDate: { lte: end },
          }),
        }),
      );
    });
    it("preserves N/A rows for an absent employee without loading context", async () => {
      process.env.TZ = tz;
      db.employee.findUnique.mockResolvedValue(null);
      db.assignedShift.findMany.mockResolvedValue([]);
      db.leaveRecord.findMany.mockResolvedValue([]);
      db.holiday.findMany.mockResolvedValue([]);
      const result = await schedulingService.getEmployeeScheduleForMonth("missing", 2026, 2);
      expect(result).toHaveLength(28);
      expect(result.every((row) => row.scheduleText === "N/A" && !row.isWorkDay)).toBe(true);
      expect(db.employee.findUnique).toHaveBeenCalledTimes(1);
      expect(db.assignedShift.findMany).not.toHaveBeenCalled();
    });
  },
);
