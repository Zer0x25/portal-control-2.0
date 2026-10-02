import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../../src/services/db";
import { shiftService } from "../../src/services/shiftService";
import { ulid } from "ulid";

describe("Shift Assignment Boundary Flow", () => {
  const testEmployeeId = ulid();
  const testPatternId = ulid();
  const firstAssignmentId = ulid();
  const secondAssignmentId = ulid();

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Boundary Tester",
        rut: `BOUND-${ulid().slice(0, 10)}`,
        position: "Ops",
        area: "Ops",
        workdayType: "Normal",
        status: "Activo",
      },
    });

    await prisma.shiftPattern.create({
      data: {
        id: testPatternId,
        name: "Boundary Pattern",
        cycleLengthDays: 14, // Extended cycle to avoid 6x1
        startDayOfWeek: 0,
        color: "#0099AA",
        maxHoursPattern: 40,
        worksOnHolidays: false,
        dailySchedules: JSON.stringify(
          Array.from({ length: 14 }).map((_, i) => ({
            dayIndex: i,
            isOffDay: i >= 7,
            startTime: i < 7 ? "09:00" : null,
            endTime: i < 7 ? "17:00" : null,
            hasColacion: true,
            colacionMinutes: 60,
          })),
        ),
      },
    });
  });

  afterAll(async () => {
    await prisma.assignedShift.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.shiftPattern.deleteMany({ where: { id: testPatternId } });
    await prisma.employee.delete({ where: { id: testEmployeeId } });
  });

  it("allows a new assignment starting the day after previous assignment endDate", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // We'll use dates in the future to be safe from anything
    const start1 = new Date(today);
    start1.setDate(today.getDate() + 10);
    const end1 = new Date(today);
    end1.setDate(today.getDate() + 15);
    const start2 = new Date(today);
    start2.setDate(today.getDate() + 16);

    const start1Iso = start1.toISOString().split("T")[0];
    const end1Iso = end1.toISOString().split("T")[0];
    const start2Iso = start2.toISOString().split("T")[0];

    const first = await shiftService.assignShift(
      {
        id: firstAssignmentId,
        employeeId: testEmployeeId,
        shiftPatternId: testPatternId,
        startDate: start1Iso,
        endDate: end1Iso,
      },
      "it_boundary_admin",
    );
    expect(first.id).toBe(firstAssignmentId);

    const second = await shiftService.assignShift(
      {
        id: secondAssignmentId,
        employeeId: testEmployeeId,
        shiftPatternId: testPatternId,
        startDate: start2Iso,
        endDate: null,
      },
      "it_boundary_admin",
    );

    expect(second.id).toBe(secondAssignmentId);
  });
});
