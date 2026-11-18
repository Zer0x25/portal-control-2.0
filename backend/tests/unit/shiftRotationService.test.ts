import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    assignedShift: {
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      assignedShift: {
        findMany: vi.fn(),
      },
      shiftPattern: {
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
    withDirectTransaction: vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
  };
});

vi.mock("../../src/services/db", () => ({
  default: mocks.prisma,
  withDirectTransaction: mocks.withDirectTransaction,
}));

import { rotateIndefiniteShifts } from "../../src/services/shiftRotationService";

describe("rotateIndefiniteShifts (AC7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.prisma.assignedShift.findMany.mockResolvedValue([]);
    mocks.prisma.shiftPattern.findMany.mockResolvedValue([]);
    mocks.tx.assignedShift.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.assignedShift.create.mockResolvedValue({ id: "successor-1" });
    mocks.prisma.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters indefinite assignments with isDeleted: false", async () => {
    vi.setSystemTime(new Date("2026-11-18T15:00:00Z"));

    const count = await rotateIndefiniteShifts();

    expect(count).toBe(0);
    expect(mocks.prisma.assignedShift.findMany).toHaveBeenCalledWith({
      where: { endDate: null, isDeleted: false },
      take: expect.any(Number),
    });
  });

  it("uses Chile business date instead of UTC date at evening boundary", async () => {
    // 2026-11-19T01:30:00Z is 2026-11-18 22:30 in America/Santiago (UTC-3).
    // With startDate 2026-11-12 and cycleLengthDays 7, diffDays in Chile is 6 (< 7) -> must NOT rotate yet.
    vi.setSystemTime(new Date("2026-11-19T01:30:00Z"));
    mocks.prisma.assignedShift.findMany.mockResolvedValue([
      {
        id: "ass-1",
        employeeId: "emp-1",
        employeeName: "Ana Perez",
        shiftPatternId: "pat-1",
        shiftPatternName: "Turno 5x2",
        startDate: "2026-11-12",
        endDate: null,
      },
    ]);
    mocks.prisma.shiftPattern.findMany.mockResolvedValue([
      { id: "pat-1", name: "Turno 5x2", cycleLengthDays: 7 },
    ]);

    const countBeforeMidnightChile = await rotateIndefiniteShifts();
    expect(countBeforeMidnightChile).toBe(0);
    expect(mocks.withDirectTransaction).not.toHaveBeenCalled();

    // 2026-11-19T03:05:00Z is 2026-11-19 00:05 in America/Santiago -> diffDays is 7 -> MUST rotate.
    vi.setSystemTime(new Date("2026-11-19T03:05:00Z"));

    const countAfterMidnightChile = await rotateIndefiniteShifts();
    expect(countAfterMidnightChile).toBe(1);
    expect(mocks.withDirectTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.assignedShift.updateMany).toHaveBeenCalledWith({
      where: { id: "ass-1", endDate: null, isDeleted: false },
      data: { endDate: "2026-11-18" },
    });
    expect(mocks.tx.assignedShift.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        employeeId: "emp-1",
        employeeName: "Ana Perez",
        shiftPatternId: "pat-1",
        shiftPatternName: "Turno 5x2",
        startDate: "2026-11-19",
        endDate: null,
      },
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "SHIFT_ROTATION_SUMMARY",
        outcome: "SUCCESS",
      }),
    });
  });

  it("does not create successor row if concurrent update closed or soft-deleted the assignment", async () => {
    vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
    mocks.prisma.assignedShift.findMany.mockResolvedValue([
      {
        id: "ass-race",
        employeeId: "emp-1",
        employeeName: "Ana Perez",
        shiftPatternId: "pat-1",
        shiftPatternName: null,
        startDate: "2026-11-12",
        endDate: null,
      },
    ]);
    mocks.prisma.shiftPattern.findMany.mockResolvedValue([
      { id: "pat-1", name: "Turno 5x2", cycleLengthDays: 7 },
    ]);
    mocks.tx.assignedShift.updateMany.mockResolvedValueOnce({ count: 0 });

    const count = await rotateIndefiniteShifts();

    expect(count).toBe(0);
    expect(mocks.withDirectTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.assignedShift.create).not.toHaveBeenCalled();
  });
});
