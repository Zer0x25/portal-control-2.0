import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    assignedShift: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    shiftPattern: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    withDirectTransaction: vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
    logShiftChange: vi.fn(),
    socketEmit: vi.fn(),
    requestContextGetStore: vi.fn(),
  };
});

vi.mock("../../src/services/db", () => ({
  default: {},
  withDirectTransaction: mocks.withDirectTransaction,
}));

vi.mock("../../src/services/auditService", () => ({
  auditService: {
    logShiftChange: mocks.logShiftChange,
  },
}));

vi.mock("../../src/services/socketService", () => ({
  SocketService: {
    emit: mocks.socketEmit,
  },
}));

vi.mock("../../src/utils/context", () => ({
  requestContext: {
    getStore: mocks.requestContextGetStore,
  },
}));

import { MonthlyShiftService } from "../../src/services/MonthlyShiftService";
import { NotFoundError, ValidationError } from "../../src/utils/AppError";

describe("MonthlyShiftService.createMonthlyPlan (AC5 / DUDA-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // 2026-11-18 12:00 Chile (-03:00) -> 2026-11-18T15:00:00Z
    vi.setSystemTime(new Date("2026-11-18T15:00:00Z"));

    mocks.requestContextGetStore.mockReturnValue({ username: "admin.user" });
    mocks.tx.$queryRaw.mockResolvedValue([{ id: "emp-1", name: "Ana Perez" }]);
    mocks.tx.assignedShift.findMany.mockResolvedValue([]);
    mocks.tx.assignedShift.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.shiftPattern.create.mockImplementation(async ({ data }) => ({
      id: "pat-new-1",
      ...data,
    }));
    mocks.tx.assignedShift.create.mockImplementation(async ({ data }) => ({
      id: "ass-new-1",
      ...data,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects fully past months with ValidationError", async () => {
    await expect(
      MonthlyShiftService.createMonthlyPlan({
        employeeId: "emp-1",
        month: 10,
        year: 2026,
        dailySchedules: [],
      }),
    ).rejects.toThrow(ValidationError);
    expect(mocks.withDirectTransaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundError if employee row is missing under FOR UPDATE lock", async () => {
    mocks.tx.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      MonthlyShiftService.createMonthlyPlan({
        employeeId: "missing-emp",
        month: 12,
        year: 2026,
        dailySchedules: [{ day: 1, type: "work", startTime: "08:00", endTime: "16:00", hours: 8 }],
      }),
    ).rejects.toThrow(NotFoundError);

    expect(mocks.tx.assignedShift.findMany).not.toHaveBeenCalled();
    expect(mocks.logShiftChange).not.toHaveBeenCalled();
    expect(mocks.socketEmit).not.toHaveBeenCalled();
  });

  it("acquires FOR UPDATE lock, filters isDeleted: false, closes prior overlaps at cutoffDateIso, soft-deletes >= startDate, populates names, and emits audit + sockets", async () => {
    // Future month 2026-12 -> assignmentStartDateIso = 2026-12-01, cutoffDateIso = 2026-11-30
    mocks.tx.assignedShift.findMany.mockResolvedValueOnce([
      { id: "prev-indefinite", startDate: "2026-11-01" }, // < 2026-12-01 -> cut to 2026-11-30 (DUDA-03)
      { id: "same-or-future", startDate: "2026-12-05" }, // >= 2026-12-01 -> soft-delete
    ]);

    const result = await MonthlyShiftService.createMonthlyPlan({
      employeeId: "emp-1",
      month: 12,
      year: 2026,
      patternName: "A_PEREZ_12345_Diciembre_26_Ver_A",
      dailySchedules: [
        { day: 1, type: "work", startTime: "08:00", endTime: "17:00", hours: 8 },
        { day: 2, type: "off" },
      ],
    });

    expect(result).toEqual({ success: true });
    expect(mocks.withDirectTransaction).toHaveBeenCalledTimes(1);

    // 1. FOR UPDATE lock query
    expect(mocks.tx.$queryRaw).toHaveBeenCalledTimes(1);
    const rawSql = String(mocks.tx.$queryRaw.mock.calls[0][0].join("?"));
    expect(rawSql).toContain("FOR UPDATE");

    // 2. Conflicting assignments filtered by isDeleted: false
    expect(mocks.tx.assignedShift.findMany).toHaveBeenCalledWith({
      where: {
        employeeId: "emp-1",
        isDeleted: false,
        startDate: { lte: "2026-12-31" },
        OR: [{ endDate: null }, { endDate: { gte: "2026-12-01" } }],
      },
      select: { id: true, startDate: true },
    });

    // 3. DUDA-03: cut previous overlapping assignment at cutoffDateIso, soft-delete >= startDate (never physical deleteMany)
    expect(mocks.tx.assignedShift.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.assignedShift.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["prev-indefinite"] } },
      data: { endDate: "2026-11-30" },
    });
    expect(mocks.tx.assignedShift.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["same-or-future"] } },
      data: { isDeleted: true, deletedAt: expect.any(Date) },
    });

    // 4. Safe defaults for worksOnHolidays, hasColacion, colacionMinutes
    const patternCreateArg = mocks.tx.shiftPattern.create.mock.calls[0][0].data;
    expect(patternCreateArg.worksOnHolidays).toBe(true);
    const parsedSchedules = JSON.parse(patternCreateArg.dailySchedules) as Array<{
      dayIndex: number;
      isOffDay: boolean;
      hasColacion?: boolean;
      colacionMinutes?: number;
    }>;
    expect(parsedSchedules[0]).toMatchObject({
      dayIndex: 0,
      isOffDay: false,
      hasColacion: true,
      colacionMinutes: 60,
    });
    expect(parsedSchedules[1]).toMatchObject({
      dayIndex: 1,
      isOffDay: true,
    });

    // 5. Populates employeeName and shiftPatternName on created AssignedShift
    expect(mocks.tx.assignedShift.create).toHaveBeenCalledWith({
      data: {
        employeeId: "emp-1",
        employeeName: "Ana Perez",
        shiftPatternId: "pat-new-1",
        shiftPatternName: "A_PEREZ_12345_Diciembre_26_Ver_A",
        startDate: "2026-12-01",
        endDate: "2026-12-31",
      },
    });

    // 6. Audit log & Socket.IO events
    expect(mocks.logShiftChange).toHaveBeenCalledWith(
      "admin.user",
      "CREATE",
      expect.objectContaining({
        employeeId: "emp-1",
        employeeName: "Ana Perez",
        newPatternId: "pat-new-1",
        newPatternName: "A_PEREZ_12345_Diciembre_26_Ver_A",
        newStartDate: "2026-12-01",
        newEndDate: "2026-12-31",
        cutCount: 1,
        softDeletedCount: 1,
      }),
    );
    expect(mocks.socketEmit).toHaveBeenCalledWith(
      "shiftPattern:updated",
      expect.objectContaining({ id: "pat-new-1" }),
    );
    expect(mocks.socketEmit).toHaveBeenCalledWith(
      "assignedShift:updated",
      expect.objectContaining({ id: "ass-new-1", employeeName: "Ana Perez" }),
    );
  });

  it("respects optional worksOnHolidays, hasColacion, and colacionMinutes overrides", async () => {
    await MonthlyShiftService.createMonthlyPlan({
      employeeId: "emp-1",
      month: 12,
      year: 2026,
      worksOnHolidays: false,
      hasColacion: false,
      colacionMinutes: 30,
      dailySchedules: [
        { day: 1, type: "work", startTime: "08:00", endTime: "14:00", hours: 6 },
        {
          day: 2,
          type: "work",
          startTime: "08:00",
          endTime: "16:30",
          hours: 8,
          hasColacion: true,
          colacionMinutes: 45,
        },
      ],
    });

    const patternCreateArg = mocks.tx.shiftPattern.create.mock.calls[0][0].data;
    expect(patternCreateArg.worksOnHolidays).toBe(false);
    const parsedSchedules = JSON.parse(patternCreateArg.dailySchedules) as Array<{
      dayIndex: number;
      hasColacion?: boolean;
      colacionMinutes?: number;
    }>;
    expect(parsedSchedules[0]).toMatchObject({
      dayIndex: 0,
      hasColacion: false,
      colacionMinutes: 0,
    });
    expect(parsedSchedules[1]).toMatchObject({
      dayIndex: 1,
      hasColacion: true,
      colacionMinutes: 45,
    });
  });
});
