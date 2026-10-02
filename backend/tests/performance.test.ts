import { describe, it, expect, beforeEach, vi } from "vitest";
import prisma from "../src/services/db";
import { LeaveService } from "../src/services/LeaveService";
import { timeRecordIntegrityService } from "../src/services/timeRecordIntegrityService";
import { addBusinessDaysChile, toBusinessDateChile } from "../src/utils/timeUtils";

/**
 * Regression coverage for `LeaveService.materializeDays`.
 *
 * The previous version of this file re-implemented a copy of the private
 * helper, so it drifted from production code, asserted nothing (it only logged
 * to stdout) and could never fail. It also tried to `vi.spyOn` the extended
 * Prisma delegates, whose descriptors are not spy-able.
 *
 * These tests drive the real service through the mocked Prisma module instead.
 */

vi.mock("../src/services/db", () => ({
  default: {
    employee: { findUnique: vi.fn() },
    leaveRecord: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    timeRecord: { findMany: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("../src/services/socketService", () => ({
  SocketService: { emit: vi.fn() },
}));

vi.mock("../src/services/timeRecordIntegrityService", () => ({
  timeRecordIntegrityService: { sealAfterMutation: vi.fn().mockResolvedValue(undefined) },
}));

const employeeFindUnique = vi.mocked(prisma.employee.findUnique);
const leaveFindUnique = vi.mocked(prisma.leaveRecord.findUnique);
const leaveCreate = vi.mocked(prisma.leaveRecord.create);
const recordFindMany = vi.mocked(prisma.timeRecord.findMany);
const recordCreate = vi.mocked(prisma.timeRecord.create);
const recordUpdate = vi.mocked(prisma.timeRecord.update);
const sealAfterMutation = vi.mocked(timeRecordIntegrityService.sealAfterMutation);

/** Builds `count` business days starting at `startDate`. */
const businessDays = (startDate: string, count: number): string[] => {
  const days: string[] = [];
  let cursor = startDate;
  for (let i = 0; i < count; i += 1) {
    days.push(cursor);
    cursor = addBusinessDaysChile(cursor, 1);
  }
  return days;
};

describe("LeaveService.materializeDays", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    employeeFindUnique.mockResolvedValue({ id: "emp1", name: "Test" } as never);
    leaveFindUnique.mockResolvedValue(null);
    recordFindMany.mockResolvedValue([]);
    leaveCreate.mockImplementation(({ data }: never) =>
      Promise.resolve({ ...(data as object), id: "leave1" } as never),
    );
    recordCreate.mockImplementation(({ data }: never) =>
      Promise.resolve({ ...(data as object), id: "tr-created" } as never),
    );
    recordUpdate.mockImplementation(({ where }: never) =>
      Promise.resolve({ id: (where as { id: string }).id } as never),
    );
  });

  const futureLeave = (days: number) => {
    // Start tomorrow so the 7-day past limit never rejects the record.
    const startDate = addBusinessDaysChile(toBusinessDateChile(), 1);
    const dayList = businessDays(startDate, days);
    return {
      employeeId: "emp1",
      type: "Licencia",
      startDate: dayList[0],
      endDate: dayList[dayList.length - 1],
      notes: "Test Leave",
    };
  };

  it("creates one TimeRecord per business day without N+1 reads", async () => {
    const leave = futureLeave(10);

    await LeaveService.upsert(leave);

    // A single batched read for the whole range, not one query per day.
    expect(recordFindMany).toHaveBeenCalledTimes(1);
    expect(employeeFindUnique).toHaveBeenCalledTimes(1);
    expect(recordCreate).toHaveBeenCalledTimes(10);

    const createdDates = recordCreate.mock.calls.map(
      (call) => (call[0].data as { date: string }).date,
    );
    expect(createdDates).toEqual(businessDays(leave.startDate, 10));

    // Each materialized record is sealed with the integrity service.
    expect(sealAfterMutation).toHaveBeenCalledTimes(10);
  });

  it("marks generated records with the leave type and zero scheduled hours", async () => {
    await LeaveService.upsert(futureLeave(3));

    const data = recordCreate.mock.calls[0][0].data as {
      status: string;
      source: string;
      scheduledHours: number;
      justification: string;
      employeeName: string;
    };

    expect(data.status).toBe("Licencia");
    expect(data.source).toBe("SYSTEM_LEAVE");
    expect(data.scheduledHours).toBe(0);
    expect(data.employeeName).toBe("Test");
    expect(JSON.parse(data.justification)).toMatchObject({
      type: "Licencia",
      leaveId: "leave1",
      notes: "Autogenerado por Licencia",
    });
  });

  it("never overwrites a day that already has a manual punch", async () => {
    const leave = futureLeave(3);

    recordFindMany.mockResolvedValue([
      { id: "tr-existing", date: leave.startDate, entrada: "08:00", salida: "17:00" },
    ] as never);

    await LeaveService.upsert(leave);

    // The punched day is skipped entirely: no update and no create.
    expect(recordUpdate).not.toHaveBeenCalled();
    expect(recordCreate).toHaveBeenCalledTimes(2);
    expect(sealAfterMutation).toHaveBeenCalledTimes(2);
  });

  it("updates an existing unpunched day instead of duplicating it", async () => {
    const leave = futureLeave(2);

    recordFindMany.mockResolvedValue([
      { id: "tr-existing", date: leave.startDate, entrada: null, salida: null },
    ] as never);

    await LeaveService.upsert(leave);

    expect(recordUpdate).toHaveBeenCalledTimes(1);
    expect(recordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tr-existing" } }),
    );
    expect(recordCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects leave ranges that start more than 7 days in the past", async () => {
    await expect(
      LeaveService.upsert({
        employeeId: "emp1",
        type: "Vacaciones",
        startDate: "2024-06-03",
        endDate: "2024-06-07",
        notes: "Semana",
      }),
    ).rejects.toThrow("LIMIT_7_DAYS_EXCEEDED");
  });
});
