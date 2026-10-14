import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../src/services/db";
import { schedulingService } from "../../src/services/schedulingService";
import { EmployeeStatus } from "../../src/generated/prisma/client";

vi.mock("../../src/services/db", () => {
  const mockPrisma = {
    employee: {
      findMany: vi.fn(),
    },
    shiftPattern: {
      findMany: vi.fn(),
    },
    assignedShift: {
      findMany: vi.fn(),
    },
    holiday: {
      findMany: vi.fn(),
    },
    leave: {
      findMany: vi.fn(),
    },
    timeRecord: {
      findMany: vi.fn(),
    },
  };
  return {
    default: mockPrisma,
    prismaDirect: mockPrisma,
  };
});

describe("schedulingService anti-regression unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array early if there are no active employees", async () => {
    vi.mocked(prisma.employee.findMany).mockResolvedValue([]);
    const spyGetContext = vi.spyOn(schedulingService, "getSchedulingContext");

    const result = await schedulingService.getScheduledEmployeesOnDate(
      new Date("2026-10-14T12:00:00Z"),
    );
    expect(result).toEqual([]);
    expect(spyGetContext).not.toHaveBeenCalled();
  });

  it("fetches scheduling context in batch for all active employees and avoids N+1", async () => {
    const activeEmployees = [
      { id: "emp-1", name: "Alice" },
      { id: "emp-2", name: "Bob" },
    ];
    vi.mocked(prisma.employee.findMany).mockResolvedValue(activeEmployees as any);

    const mockContext = {
      patterns: new Map(),
      assignmentsByEmployee: new Map(),
      holidays: new Set<string>(),
      leavesByEmployee: new Map(),
    };

    const spyGetContext = vi
      .spyOn(schedulingService, "getSchedulingContext")
      .mockResolvedValue(mockContext as any);

    const spyGetInfo = vi
      .spyOn(schedulingService, "getEmployeeDailyScheduleInfo")
      .mockImplementation(async (empId, _date, ctx) => {
        expect(ctx).toBe(mockContext);
        if (empId === "emp-1") {
          return {
            isWorkDay: true,
            startTime: "09:00",
            endTime: "18:00",
            shiftName: "Mañana",
            hours: 8,
            hasColacion: true,
            colacionMinutes: 60,
            scheduleText: "09:00 - 18:00",
            planningStatus: "Programado",
          };
        }
        return {
          isWorkDay: false,
          startTime: "",
          endTime: "",
          shiftName: "Descanso",
          hours: 0,
          hasColacion: false,
          colacionMinutes: 0,
          scheduleText: "Descanso",
          planningStatus: "Libre",
        };
      });

    const result = await schedulingService.getScheduledEmployeesOnDate(
      new Date("2026-10-14T12:00:00Z"),
    );

    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { status: EmployeeStatus.Activo },
      select: { id: true, name: true },
    });

    expect(spyGetContext).toHaveBeenCalledTimes(1);
    expect(spyGetContext).toHaveBeenCalledWith(["emp-1", "emp-2"], "2026-10-14", "2026-10-14");

    expect(spyGetInfo).toHaveBeenCalledTimes(2);

    expect(result).toEqual([
      {
        employeeId: "emp-1",
        employeeName: "Alice",
        shiftPatternName: "N/A",
        startTime: "09:00",
        endTime: "18:00",
        patternColor: undefined,
      },
    ]);
  });
});
