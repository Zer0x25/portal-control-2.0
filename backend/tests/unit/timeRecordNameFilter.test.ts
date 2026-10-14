import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../src/services/db";
import { TimeRecordService } from "../../src/services/TimeRecordService";

vi.mock("../../src/services/db", () => {
  const mockPrisma = {
    employee: {
      findMany: vi.fn(),
    },
    timeRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  };
  return {
    default: mockPrisma,
    prismaDirect: mockPrisma,
  };
});

describe("TimeRecordService name search optimization anti-regression tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses db pushdown query first and avoids full employee table scan when matches found", async () => {
    vi.mocked(prisma.employee.findMany).mockResolvedValueOnce([
      { id: "emp-1", name: "Gonzalo Perez" },
    ] as any);

    await TimeRecordService.listRecords({ name: "Gonzalo" });

    expect(prisma.employee.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { name: { contains: "Gonzalo", mode: "insensitive" } },
      select: { id: true, name: true },
    });
    expect(prisma.timeRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: { in: ["emp-1"] },
        }),
      }),
    );
  });

  it("falls back to full employee scan and string normalization when direct db query yields no results", async () => {
    // First query with raw term returns empty
    vi.mocked(prisma.employee.findMany).mockResolvedValueOnce([]);
    // Fallback query returns all employees
    vi.mocked(prisma.employee.findMany).mockResolvedValueOnce([
      { id: "emp-2", name: "Ángel Gómez" },
      { id: "emp-3", name: "Carlos Soto" },
    ] as any);

    // Searching unaccented "Angel" matches normalized "Ángel"
    await TimeRecordService.listRecords({ name: "Angel" });

    expect(prisma.employee.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.employee.findMany).toHaveBeenNthCalledWith(1, {
      where: { name: { contains: "Angel", mode: "insensitive" } },
      select: { id: true, name: true },
    });
    expect(prisma.employee.findMany).toHaveBeenNthCalledWith(2, {
      select: { id: true, name: true },
    });
    expect(prisma.timeRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: { in: ["emp-2"] },
        }),
      }),
    );
  });
});
