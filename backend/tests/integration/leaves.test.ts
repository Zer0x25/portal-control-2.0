import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { SocketService } from "../../src/services/socketService";
import * as leaveController from "../../src/controllers/leaveController";

describe("Leave/Permission Management Integration Flow", () => {
  let testEmployeeId = ulid();
  let testLeaveId = ulid();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const getIso = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  };

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Leave Tester",
        rut: `LEAVE-${ulid().slice(0, 10)}`,
        position: "Absence Checker",
        area: "HR",
        workdayType: "Normal",
        status: "Activo",
      },
    });
  });

  afterAll(async () => {
    await prisma.timeRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.leaveRecord.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.employee.delete({ where: { id: testEmployeeId } });
  });

  it("should create a leave record and materialize into time records", async () => {
    const startDateIso = getIso(1); // Tomorrow
    const endDateIso = getIso(3);

    const leaveData = {
      id: testLeaveId,
      employeeId: testEmployeeId,
      type: "Vacaciones",
      startDate: startDateIso,
      endDate: endDateIso,
      notes: "Test vacation",
    };

    const mockReq = { body: leaveData } as any;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    const emitSpy = vi.spyOn(SocketService, "emit");
    const mockNext = vi.fn();

    await leaveController.createLeave(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);

    const leave = await prisma.leaveRecord.findUnique({ where: { id: testLeaveId } });
    expect(leave).not.toBeNull();

    const records = await prisma.timeRecord.findMany({
      where: { employeeId: testEmployeeId, status: "Vacaciones" },
    });
    expect(records.length).toBe(3);
    emitSpy.mockRestore();
  });

  it("should cleanup time records when a leave is deleted", async () => {
    const mockReq = { params: { id: testLeaveId } } as any;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;
    const mockNext = vi.fn();

    await leaveController.deleteLeave(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);

    const leave = await prisma.leaveRecord.findUnique({ where: { id: testLeaveId } });
    expect(leave?.isDeleted).toBe(true);

    const records = await prisma.timeRecord.findMany({
      where: { employeeId: testEmployeeId },
    });
    expect(records.every((r) => r.isDeleted)).toBe(true);
  });
});
