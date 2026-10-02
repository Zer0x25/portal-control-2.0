import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/services/db";
import { shiftService } from "../../src/services/shiftService";
import { ulid } from "ulid";
import { SocketService } from "../../src/services/socketService";

describe("Shift Management Integration Flow", () => {
  let testEmployeeId = ulid();
  let testPatternId = ulid();
  let testAssignmentId = ulid();

  beforeAll(async () => {
    // 1. Create a test employee
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Shift Tester",
        rut: "99999999-9",
        position: "Shift Checker",
        area: "Ops",
        workdayType: "Normal",
        status: "Activo",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.assignedShift.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.shiftPattern.deleteMany({ where: { id: testPatternId } });
    await prisma.employee.delete({ where: { id: testEmployeeId } });
  });

  it("should create a shift pattern", async () => {
    const patternData = {
      id: testPatternId,
      name: "Test 7x7 Pattern",
      cycleLengthDays: 14,
      startDayOfWeek: 1,
      color: "#FF5733",
      maxHoursPattern: 45,
      worksOnHolidays: true,
      dailySchedules: Array.from({ length: 14 }).map((_, i) => ({
        dayIndex: i,
        isOffDay: i >= 7,
        startTime: i < 7 ? "08:00" : null,
        endTime: i < 7 ? "20:00" : null,
        hasColacion: true,
        colacionMinutes: 60,
      })),
    };

    const emitSpy = vi.spyOn(SocketService, "emit");
    const pattern = await shiftService.createPattern(patternData);

    expect(pattern.id).toBe(testPatternId);
    expect(pattern.name).toBe("Test 7x7 Pattern");
    expect(emitSpy).toHaveBeenCalledWith("shiftPattern:updated", expect.any(Object));
    emitSpy.mockRestore();
  });

  it("should assign a pattern to an employee", async () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 2); // 2 days ago (Safe within 7rd boundary)
    const startDateIso = startDate.toISOString().split("T")[0];

    const assignmentData = {
      id: testAssignmentId,
      employeeId: testEmployeeId,
      shiftPatternId: testPatternId,
      startDate: startDateIso,
      endDate: null,
    };

    const emitSpy = vi.spyOn(SocketService, "emit");
    const assignment = await shiftService.assignShift(assignmentData, "test_admin");

    expect(assignment.id).toBe(testAssignmentId);
    expect(assignment.employeeId).toBe(testEmployeeId);
    expect(emitSpy).toHaveBeenCalledWith("assignedShift:updated", expect.any(Object));
    emitSpy.mockRestore();
  });

  it("should fail when assigning an overlapping shift", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().split("T")[0];

    const overlappingData = {
      id: ulid(),
      employeeId: testEmployeeId,
      shiftPatternId: testPatternId,
      startDate: tomorrowIso,
      endDate: null,
    };

    // The previous assignment starts recently and has no end date (null).
    // So tomorrow definitely overlaps.
    await expect(shiftService.assignShift(overlappingData, "test_admin")).rejects.toThrow(
      /Conflicto de asignación/,
    );
  });
});
