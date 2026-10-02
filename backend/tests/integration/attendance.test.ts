import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/services/db";
import { PunchService } from "../../src/services/PunchService";
import { ulid } from "ulid";
import { SocketService } from "../../src/services/socketService";
import { timeRecordIntegrityService } from "../../src/services/timeRecordIntegrityService";

describe("Attendance Integration Flow", () => {
  let testEmployeeId = ulid();
  let testUserId = ulid();

  beforeAll(async () => {
    // Create a test employee
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Test Integration Employee",
        rut: "12345678-9",
        position: "Tester",
        area: "QA",
        workdayType: "Normal",
        status: "Activo",
      },
    });

    // Create a test user (required for AuthRequest)
    await prisma.user.create({
      data: {
        id: testUserId,
        username: "test_tester",
        passwordHash: "dummy",
        role: "Administrador",
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.employee.delete({ where: { id: testEmployeeId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it("should complete a full punch-in flow", async () => {
    const mockReq = {
      user: { id: testUserId, username: "test_tester", role: "Administrador" },
    } as any;

    // Spy on SocketService.emit
    const emitSpy = vi.spyOn(SocketService, "emit");

    const result = await PunchService.handlePunch(mockReq, testEmployeeId, "TEST_SUITE", "entrada");

    expect(result.action).toBe("ENTRADA");
    expect(result.record.employeeId).toBe(testEmployeeId);
    expect(result.record.status).toBe("Laborando");

    // Verify DB persistence
    const dbRecord = await prisma.timeRecord.findFirst({
      where: { employeeId: testEmployeeId, status: "Laborando" },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.entrada).not.toBeNull();
    expect(dbRecord?.integrityHash).toBeTruthy();
    expect(dbRecord?.integrityAlgo).toBe("SHA256");

    // Verify Socket emission
    expect(emitSpy).toHaveBeenCalledWith("timeRecord:created", expect.any(Object));

    emitSpy.mockRestore();
  });

  it("should complete a full punch-out flow after punching in", async () => {
    const mockReq = {
      user: { id: testUserId, username: "test_tester", role: "Administrador" },
    } as any;

    const result = await PunchService.handlePunch(mockReq, testEmployeeId, "TEST_SUITE", "salida");

    expect(result.action).toBe("SALIDA");
    expect(result.record.status).toBe("Completado");

    // Verify DB persistence
    const dbRecord = await prisma.timeRecord.findFirst({
      where: { employeeId: testEmployeeId, status: "Completado" },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.salida).not.toBeNull();
  });

  it("should reject exit when break is incomplete and elapsed is <= 60 minutes", async () => {
    const mockReq = {
      user: { id: testUserId, username: "test_tester", role: "Administrador" },
    } as any;

    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });

    const now = Date.now();
    await prisma.timeRecord.create({
      data: {
        employeeId: testEmployeeId,
        employeeName: "Test Integration Employee",
        employeePosition: "Tester",
        employeeArea: "QA",
        employeeWorkdayType: "Normal",
        date: new Date().toISOString().split("T")[0],
        entrada: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        inicioColacion: new Date(now - 30 * 60 * 1000).toISOString(),
        status: "Colacion",
        source: "TEST_SUITE",
      },
    });

    await expect(
      PunchService.handlePunch(mockReq, testEmployeeId, "TEST_SUITE", "salida"),
    ).rejects.toThrow("BREAK_INCOMPLETE_TOO_EARLY");
  });

  it("should allow exit with incomplete break after >60 minutes and complete when schedule snapshot exists", async () => {
    const mockReq = {
      user: { id: testUserId, username: "test_tester", role: "Administrador" },
    } as any;

    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });

    const now = Date.now();
    await prisma.timeRecord.create({
      data: {
        employeeId: testEmployeeId,
        employeeName: "Test Integration Employee",
        employeePosition: "Tester",
        employeeArea: "QA",
        employeeWorkdayType: "Normal",
        date: new Date().toISOString().split("T")[0],
        entrada: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        inicioColacion: new Date(now - 61 * 60 * 1000).toISOString(),
        status: "Colacion",
        source: "TEST_SUITE",
        scheduledStartTime: "08:00",
        scheduledEndTime: "18:00",
        scheduledHours: 9,
        scheduledColacionMinutes: 60,
      },
    });

    const result = await PunchService.handlePunch(mockReq, testEmployeeId, "TEST_SUITE", "salida");

    expect(result.action).toBe("SALIDA");
    expect(result.record.status).toBe("Completado");
    expect(result.exceptionApplied).toBe(true);
    expect(result.exceptionType).toBe("BREAK_INCOMPLETE_TIMEOUT");
    expect(result.requiresReview).toBe(false);
  });

  it("should allow exit with incomplete break after >60 minutes and mark AnomaliaManual when no schedule exists", async () => {
    const mockReq = {
      user: { id: testUserId, username: "test_tester", role: "Administrador" },
    } as any;

    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });

    const now = Date.now();
    await prisma.timeRecord.create({
      data: {
        employeeId: testEmployeeId,
        employeeName: "Test Integration Employee",
        employeePosition: "Tester",
        employeeArea: "QA",
        employeeWorkdayType: "Normal",
        date: new Date().toISOString().split("T")[0],
        entrada: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        inicioColacion: new Date(now - 61 * 60 * 1000).toISOString(),
        status: "Colacion",
        source: "TEST_SUITE",
      },
    });

    const result = await PunchService.handlePunch(mockReq, testEmployeeId, "TEST_SUITE", "salida");

    expect(result.action).toBe("SALIDA");
    expect(result.record.status).toBe("AnomaliaManual");
    expect(result.exceptionApplied).toBe(true);
    expect(result.exceptionType).toBe("BREAK_INCOMPLETE_TIMEOUT");
    expect(result.requiresReview).toBe(true);
  });

  it("should detect manipulated record in integrity verify run", async () => {
    const mockReq = {
      user: { id: testUserId, username: "test_tester", role: "Administrador" },
    } as any;

    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });

    await PunchService.handlePunch(mockReq, testEmployeeId, "TEST_SUITE", "entrada");
    const record = await prisma.timeRecord.findFirst({
      where: { employeeId: testEmployeeId },
      orderBy: { updatedAt: "desc" },
    });

    expect(record?.integrityHash).toBeTruthy();

    await prisma.$executeRaw`UPDATE "time_records" SET "salida" = ${new Date().toISOString()} WHERE "id" = ${record!.id}`;

    const verify = await prisma.$transaction((tx) =>
      timeRecordIntegrityService.verifyChain(tx, { employeeId: testEmployeeId, limit: 100 }),
    );

    expect(verify.brokenCount).toBeGreaterThan(0);
    expect(verify.broken.some((b) => b.recordId === record!.id)).toBe(true);
  });

  it("should keep integrity valid right after punch creation", async () => {
    const mockReq = {
      user: { id: testUserId, username: "test_tester", role: "Administrador" },
    } as any;

    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await PunchService.handlePunch(mockReq, testEmployeeId, "TEST_SUITE", "entrada");

    const verify = await prisma.$transaction((tx) =>
      timeRecordIntegrityService.verifyChain(tx, { employeeId: testEmployeeId, limit: 100 }),
    );

    expect(verify.checkedCount).toBeGreaterThan(0);
    expect(verify.brokenCount).toBe(0);
  });
});
