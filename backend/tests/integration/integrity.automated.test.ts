import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/services/db";
import { processAutoClosures, processDailyAbsences } from "../../src/services/autoCloseService";
import { holidayService } from "../../src/services/HolidayService";
import { shiftService } from "../../src/services/shiftService";
import { schedulingService } from "../../src/services/schedulingService";
import {
  addBusinessDaysChile,
  parseBusinessDateChile,
  toBusinessDateChile,
} from "../../src/utils/timeUtils";
import { ulid } from "ulid";

describe("Automated Integrity Processes Integration", () => {
  let testEmployeeId = ulid();
  let testPatternId = ulid();

  beforeAll(async () => {
    // Setup base employee
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Integrity Tester",
        rut: "77777777-7",
        position: "Integrity Specialist",
        area: "Core",
        workdayType: "Normal",
        status: "Activo",
      },
    });

    // Setup a basic 6x1 pattern
    await shiftService.createPattern({
      id: testPatternId,
      name: "Audit Pattern",
      cycleLengthDays: 7,
      startDayOfWeek: 1,
      color: "#666",
      maxHoursPattern: 45,
      dailySchedules: Array.from({ length: 7 }).map((_, i) => ({
        dayIndex: i,
        isOffDay: i === 6,
        startTime: i < 6 ? "08:00" : null,
        endTime: i < 6 ? "16:00" : null,
        hasColacion: true,
        colacionMinutes: 60,
      })),
    });

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 2);
    const startDateIso = startDate.toISOString().split("T")[0];

    // Assign pattern
    await shiftService.assignShift(
      {
        employeeId: testEmployeeId,
        shiftPatternId: testPatternId,
        startDate: startDateIso,
        endDate: null,
      },
      "system",
    );
  });

  afterAll(async () => {
    await prisma.assignedShift.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.holiday.deleteMany({ where: { date: { in: ["2026-05-01", "2026-12-25"] } } });
    await prisma.shiftPattern.deleteMany({ where: { id: testPatternId } });
    await prisma.employee.delete({ where: { id: testEmployeeId } });
  });

  describe("Auto-Closure Service", () => {
    it("should close a shift that has been open for more than 14 hours", async () => {
      const now = Date.now();
      const fifteenHoursAgo = new Date(now - 15 * 60 * 60 * 1000);

      // Create an orphaned record
      const record = await prisma.timeRecord.create({
        data: {
          employeeId: testEmployeeId,
          employeeName: "Integrity Tester",
          date: "2026-01-01",
          entrada: fifteenHoursAgo.toISOString(),
          status: "Laborando",
          source: "TEST_SUITE",
        },
      });

      const closedCount = await processAutoClosures();
      expect(closedCount).toBeGreaterThanOrEqual(1);

      const updatedRecord = await prisma.timeRecord.findUnique({ where: { id: record.id } });
      expect(updatedRecord?.status).toBe("AnomaliaManual");
      expect(updatedRecord?.salida).toBeNull();
    });
  });

  describe("Holiday and Scheduling Interaction", () => {
    it("should mark a workday as holiday if it matches a holiday date", async () => {
      const holidayDate = "2026-12-25";
      await holidayService.upsertHoliday(
        {
          date: holidayDate,
          name: "Navidad",
          type: "Nacional",
        },
        "admin",
      );

      const dateObj = new Date(holidayDate + "T12:00:00");
      const schedule = await schedulingService.getEmployeeDailyScheduleInfo(
        testEmployeeId,
        dateObj,
      );

      expect(schedule?.isHoliday).toBe(true);
      expect(schedule?.holidayName).toBe("Navidad");
      // Depending on rules, it might still be a workday if the pattern says 'worksOnHolidays'
      // But by default it should prioritize Holiday display.
    });
  });

  describe("Daily Absence Detection", () => {
    it("should create an 'Ausente' record for a workday with no markings", async () => {
      // Keep business date calculations aligned with service logic (Chile TZ)
      const yesterdayStr = addBusinessDaysChile(toBusinessDateChile(), -1);
      const yesterday = parseBusinessDateChile(yesterdayStr);

      // Ensure no record exists for yesterday
      await prisma.timeRecord.deleteMany({
        where: { employeeId: testEmployeeId, date: yesterdayStr },
      });

      // Check if yesterday was a workday for this employee (Depends on current day of week)
      const scheduleInfo = await schedulingService.getEmployeeDailyScheduleInfo(
        testEmployeeId,
        yesterday,
      );

      if (scheduleInfo?.isWorkDay && !scheduleInfo.isHoliday) {
        const absences = await processDailyAbsences();
        expect(absences).toBeGreaterThanOrEqual(1);

        const record = await prisma.timeRecord.findFirst({
          where: { employeeId: testEmployeeId, date: yesterdayStr },
        });
        expect(record?.status).toBe("Ausente");
        expect(record?.source).toBe("SYSTEM_AUTO");
      } else {
        console.log(
          "Skipping absence test: Yesterday was an Off-Day or Holiday for the test pattern",
        );
      }
    }, 30000); // 30s timeout for bulk processing
  });
});
