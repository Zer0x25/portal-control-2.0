import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  auditLog: {
    deleteMany: vi.fn(),
  },
  shiftReport: {
    deleteMany: vi.fn(),
  },
  meterReading: {
    deleteMany: vi.fn(),
  },
  activeSession: {
    deleteMany: vi.fn(),
  },
  systemConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  $executeRawUnsafe: vi.fn(),
}));

vi.mock("../../src/services/db", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
  withDirectTransaction: vi.fn(),
}));

import { maintenanceService } from "../../src/services/maintenanceService";

describe("maintenanceService log rotation and cleanups (anti-regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 5 });
    mockPrisma.shiftReport.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.meterReading.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.activeSession.deleteMany.mockResolvedValue({ count: 12 });
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
  });

  it("includes SEGURIDAD and CTRL_INTERNO_DB in auditLog categories and purges expired activeSessions", async () => {
    const fixedNow = new Date("2026-10-14T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    await maintenanceService.rotateAuditLogs();

    // Verify 6 cleanups were triggered
    expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledTimes(3);
    expect(mockPrisma.shiftReport.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.meterReading.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.activeSession.deleteMany).toHaveBeenCalledTimes(1);

    // Check administration query contains SEGURIDAD
    const adminCall = mockPrisma.auditLog.deleteMany.mock.calls.find((call) => {
      const where = call[0]?.where;
      return Array.isArray(where?.category?.in) && where.category.in.includes("SEGURIDAD");
    });
    expect(adminCall).toBeDefined();
    expect(adminCall![0].where.category.in).toEqual(
      expect.arrayContaining([
        "OPERATIONS",
        "CONFIG",
        "USER_MGMT",
        "AUTH",
        "DATA",
        "SECURITY",
        "SEGURIDAD",
      ]),
    );

    // Check infrastructure query contains CTRL_INTERNO_DB
    const infraCall = mockPrisma.auditLog.deleteMany.mock.calls.find((call) => {
      const where = call[0]?.where;
      return Array.isArray(where?.category?.in) && where.category.in.includes("CTRL_INTERNO_DB");
    });
    expect(infraCall).toBeDefined();
    expect(infraCall![0].where.category.in).toEqual(
      expect.arrayContaining(["SYSTEM", "API", "CTRL_INTERNO_DB"]),
    );

    // Check activeSessions cleanup deletes where expiresAt < now
    expect(mockPrisma.activeSession.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: fixedNow },
      },
    });

    vi.useRealTimers();
  });

  it("refreshes monthly_employee_kpis materialized view concurrently", async () => {
    await maintenanceService.refreshMaterializedViews();
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      "REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_employee_kpis",
    );
  });

  it("ensures db instance ID exists in systemConfig", async () => {
    mockPrisma.systemConfig.findUnique.mockResolvedValueOnce(null);
    mockPrisma.systemConfig.create.mockResolvedValueOnce({
      key: "db_instance_id",
      value: '"id-123"',
    });

    await maintenanceService.ensureInstanceId();

    expect(mockPrisma.systemConfig.findUnique).toHaveBeenCalledWith({
      where: { key: "db_instance_id" },
    });
    expect(mockPrisma.systemConfig.create).toHaveBeenCalledWith({
      data: {
        key: "db_instance_id",
        value: expect.any(String),
      },
    });
  });
});
