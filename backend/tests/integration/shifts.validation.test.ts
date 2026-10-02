import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/services/db";
import { shiftService } from "../../src/services/shiftService";
import { PunchService } from "../../src/services/PunchService";
import { ulid } from "ulid";
import { SocketService } from "../../src/services/socketService";

describe("Advanced Shift Validation Integration (v8.9.0 Rules)", () => {
  let testEmployeeId = ulid();
  let pattern8hRestId = ulid();
  let patternNormalId = ulid();
  let pattern7DayId = ulid();
  let pattern6DayId = ulid();

  beforeAll(async () => {
    // Cleanup any residual data from previous failed runs
    await prisma.employee.deleteMany({ where: { rut: "88888888-8" } });

    // 1. Create a test employee
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Validation Tester",
        rut: "88888888-8",
        position: "Quality Engineer",
        area: "Testing",
        workdayType: "Artículo 22", // Exempt from weekly hours limit to test other rules
        status: "Activo",
      },
    });

    // 2. Create useful patterns
    // Pattern A: Ends Late (22:00)
    await shiftService.createPattern({
      id: pattern8hRestId,
      name: "Late Shift (Ends 22:00)",
      cycleLengthDays: 1,
      startDayOfWeek: 1,
      color: "#FF0000",
      maxHoursPattern: 45,
      dailySchedules: [
        {
          dayIndex: 0,
          isOffDay: false,
          startTime: "16:00",
          endTime: "22:00",
          hasColacion: false, // 6h total
        },
      ],
    });

    // Pattern B: Starts Early (05:00)
    await shiftService.createPattern({
      id: patternNormalId,
      name: "Early Shift (Starts 05:00)",
      cycleLengthDays: 1,
      startDayOfWeek: 1,
      color: "#00FF00",
      maxHoursPattern: 45,
      dailySchedules: [
        {
          dayIndex: 0,
          isOffDay: false,
          startTime: "05:00",
          endTime: "11:00",
          hasColacion: false, // 6h total
        },
      ],
    });

    // Pattern C: 7 Days Consecutive Work (Should Fail Rule 6x1)
    await shiftService.createPattern({
      id: pattern7DayId,
      name: "Non-Stop Week (7 Days)",
      cycleLengthDays: 7,
      startDayOfWeek: 1,
      color: "#0000FF",
      maxHoursPattern: 60,
      dailySchedules: Array.from({ length: 7 }).map((_, i) => ({
        dayIndex: i,
        isOffDay: false,
        startTime: "08:00",
        endTime: "16:00",
        hasColacion: true,
        colacionMinutes: 60,
      })),
    });

    // Pattern D: 6 Days Work, 1 Off (Should Pass Rule 6x1)
    await shiftService.createPattern({
      id: pattern6DayId,
      name: "Standard Week (6x1)",
      cycleLengthDays: 7,
      startDayOfWeek: 1,
      color: "#FFFF00",
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
  });

  afterAll(async () => {
    // Cleanup
    await prisma.assignedShift.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.shiftPattern.deleteMany({
      where: { id: { in: [pattern8hRestId, patternNormalId, pattern7DayId, pattern6DayId] } },
    });
    await prisma.employee.delete({ where: { id: testEmployeeId } });
  });

  describe("Rule: Minimum 8h Rest Period", () => {
    it("should fail when assigning a shift that starts less than 8h after previous shift ends", async () => {
      // 1. Assign Late Shift on Day 1
      await shiftService.assignShift(
        {
          employeeId: testEmployeeId,
          shiftPatternId: pattern8hRestId,
          startDate: "2026-06-01",
          endDate: "2026-06-01",
        },
        "admin",
      );

      // 2. Try to assign Early Shift on Day 2
      // Late Shift ends at 22:00 on June 1st.
      // Early Shift starts at 05:00 on June 2nd.
      // Gap is 7 hours (< 8h).
      const assignmentData = {
        employeeId: testEmployeeId,
        shiftPatternId: patternNormalId,
        startDate: "2026-06-02",
        endDate: "2026-06-02",
      };

      await expect(shiftService.assignShift(assignmentData, "admin")).rejects.toThrow(
        /Descanso insuficiente/,
      );
    });

    it("should pass when the rest period is exactly 8h or more", async () => {
      // Cleanup previous failed attempt residuals if any
      await prisma.assignedShift.deleteMany({
        where: { employeeId: testEmployeeId, startDate: "2026-06-02" },
      });

      // Create a pattern that starts at 06:00 (Exactly 8h gap from 22:00)
      const pattern8hGapId = ulid();
      await shiftService.createPattern({
        id: pattern8hGapId,
        name: "8h Gap Shift (Starts 06:00)",
        cycleLengthDays: 1,
        startDayOfWeek: 1,
        color: "#AAFF00",
        maxHoursPattern: 45,
        dailySchedules: [
          {
            dayIndex: 0,
            isOffDay: false,
            startTime: "06:00",
            endTime: "14:00",
            hasColacion: true,
            colacionMinutes: 60,
          },
        ],
      });

      const assignmentData = {
        employeeId: testEmployeeId,
        shiftPatternId: pattern8hGapId,
        startDate: "2026-06-02",
        endDate: "2026-06-02",
      };

      const assignment = await shiftService.assignShift(assignmentData, "admin");
      expect(assignment).toBeDefined();

      // Cleanup
      await prisma.assignedShift.delete({ where: { id: assignment.id } });
      await prisma.shiftPattern.delete({ where: { id: pattern8hGapId } });
    });
  });

  describe("Rule: Maximum 6 Consecutive Workdays", () => {
    it("should fail when assigning a pattern with 7 consecutive workdays", async () => {
      const assignmentData = {
        employeeId: testEmployeeId,
        shiftPatternId: pattern7DayId,
        startDate: "2026-07-01",
        endDate: null,
      };

      await expect(shiftService.assignShift(assignmentData, "admin")).rejects.toThrow(
        /Regla 6x1 excedida/,
      );
    });

    it("should pass when assigning a pattern with 6 workdays and 1 off day", async () => {
      const assignmentData = {
        employeeId: testEmployeeId,
        shiftPatternId: pattern6DayId,
        startDate: "2026-07-01",
        endDate: null,
      };

      const assignment = await shiftService.assignShift(assignmentData, "admin");
      expect(assignment).toBeDefined();

      // Cleanup for next tests
      await prisma.assignedShift.delete({ where: { id: assignment.id } });
    });

    it("should pass 6+ days if pattern is marked as exceptional (e.g., '7x7')", async () => {
      const pattern7x7Id = ulid();
      await shiftService.createPattern({
        id: pattern7x7Id,
        name: "Exotic 7x7 Pattern",
        cycleLengthDays: 14,
        startDayOfWeek: 1,
        color: "#FF00FF",
        maxHoursPattern: 45,
        dailySchedules: Array.from({ length: 14 }).map((_, i) => ({
          dayIndex: i,
          isOffDay: i >= 7,
          startTime: i < 7 ? "08:00" : null,
          endTime: i < 7 ? "20:00" : null,
          hasColacion: true,
          colacionMinutes: 60,
        })),
      });

      const assignmentData = {
        employeeId: testEmployeeId,
        shiftPatternId: pattern7x7Id,
        startDate: "2026-08-01",
        endDate: null,
      };

      const assignment = await shiftService.assignShift(assignmentData, "admin");
      expect(assignment).toBeDefined();

      // Cleanup
      await prisma.assignedShift.delete({ where: { id: assignment.id } });
      await prisma.shiftPattern.delete({ where: { id: pattern7x7Id } });
    });
  });

  describe("Rule: 12h Shift Excess Detection", () => {
    it("should mark a shift as AnomaliaManual if duration exceeds 12 hours", async () => {
      vi.useFakeTimers();

      // 1. Setup Request Mock
      const mockReq = {
        user: { username: "system_test", role: "Admin" },
      } as any;

      // 2. Punch IN (at 08:00 AM)
      const startTime = new Date("2026-01-01T08:00:00Z");
      vi.setSystemTime(startTime);

      const inResult = await PunchService.handlePunch(
        mockReq,
        testEmployeeId,
        "TEST_SUITE",
        "entrada",
      );
      expect(inResult.action).toBe("ENTRADA");
      expect(inResult.record.status).toBe("Laborando");

      // 3. Punch OUT (at 09:00 PM -> 13 hours total)
      const endTime = new Date("2026-01-01T21:05:00Z");
      vi.setSystemTime(endTime);

      const outResult = await PunchService.handlePunch(
        mockReq,
        testEmployeeId,
        "TEST_SUITE",
        "salida",
      );

      expect(outResult.action).toBe("SALIDA");
      expect(outResult.record.status).toBe("AnomaliaManual");
      expect(outResult.record.justification.reason).toContain("Exceso de Jornada Legal (+12h)");

      vi.useRealTimers();
    });
  });
});
