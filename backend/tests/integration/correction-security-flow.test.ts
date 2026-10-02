import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { createCorrectionRequest } from "../../src/controllers/correctionController";
import { SocketService } from "../../src/services/socketService";
import { CorrectionService } from "../../src/services/CorrectionService";
import { AppError } from "../../src/utils/AppError";

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
};

const createMockRes = (): MockResponse => {
  const res = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe("Correction Request Security Flow", () => {
  const testEmployeeId = ulid();
  const otherEmployeeId = ulid();
  const testUserId = ulid();
  const testTimeRecordId = ulid();
  const testUsername = `it_corr_${ulid().toLowerCase()}`;

  beforeAll(async () => {
    await prisma.employee.createMany({
      data: [
        {
          id: testEmployeeId,
          name: "Correction Owner",
          rut: `11${Date.now()}-1`,
          position: "Operator",
          area: "Ops",
          workdayType: "Normal",
          status: "Activo",
        },
        {
          id: otherEmployeeId,
          name: "Different Employee",
          rut: `22${Date.now()}-2`,
          position: "Operator",
          area: "Ops",
          workdayType: "Normal",
          status: "Activo",
        },
      ],
    });

    await prisma.user.create({
      data: {
        id: testUserId,
        username: testUsername,
        passwordHash: "dummy",
        role: "Usuario",
        employeeId: testEmployeeId,
      },
    });

    await prisma.timeRecord.create({
      data: {
        id: testTimeRecordId,
        employeeId: testEmployeeId,
        employeeName: "Correction Owner",
        date: "2026-02-11",
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        action: { in: ["CORRECTION_REQUEST_CREATED", "CORRECTION_REQUEST_STATUS_UPDATED"] },
      },
    });
    await prisma.correctionRequest.deleteMany({
      where: { id: { startsWith: "it-corr-" } },
    });
    await prisma.timeRecord.deleteMany({ where: { id: testTimeRecordId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.employee.deleteMany({ where: { id: { in: [testEmployeeId, otherEmployeeId] } } });
  });

  it("rejects Usuario when request employeeId does not match user employeeId", async () => {
    const req = {
      user: { id: testUserId, username: testUsername, role: "Usuario", employeeId: testEmployeeId },
      body: {
        id: `it-corr-${ulid()}`,
        employeeId: otherEmployeeId,
        timeRecordId: testTimeRecordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-11T07:55:00.000Z",
        reason: "Mismatch should be blocked",
      },
    } as any;
    const res = createMockRes();

    await createCorrectionRequest(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(String(res.body?.message || "")).toContain("Acceso denegado");
  });

  it("creates request for Usuario when employeeId matches", async () => {
    const emitSpy = vi.spyOn(SocketService, "emit");
    const requestId = `it-corr-${ulid()}`;
    const req = {
      user: { id: testUserId, username: testUsername, role: "Usuario", employeeId: testEmployeeId },
      body: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: testTimeRecordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-11T07:55:00.000Z",
        reason: "Valid own correction request",
      },
    } as any;
    const res = createMockRes();

    await createCorrectionRequest(req, res as any);

    expect(res.statusCode).toBe(201);
    expect(res.body?.id).toBe(requestId);

    const dbRequest = await prisma.correctionRequest.findUnique({ where: { id: requestId } });
    expect(dbRequest).not.toBeNull();
    expect(emitSpy).toHaveBeenCalledWith("correctionRequest:created", expect.any(Object));
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "CORRECTION_REQUEST_CREATED",
        details: {
          path: ["requestId"],
          equals: requestId,
        },
      },
      orderBy: { timestamp: "desc" },
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog?.category).toBe("CTRL_HOURS");

    emitSpy.mockRestore();
  });

  it("requires rejectionReason when status is rejected", async () => {
    const requestId = `it-corr-${ulid()}`;
    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: testTimeRecordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-11T07:50:00.000Z",
        reason: "Need manual verification",
        status: "pending",
      },
    });

    await expect(
      CorrectionService.updateStatus(requestId, {
        status: "rejected",
        resolvedBy: "supervisor_test",
        actorUsername: "supervisor_test",
        actorRole: "Supervisor",
      }),
    ).rejects.toMatchObject({ code: "REJECTION_REASON_REQUIRED" });
  });

  it("logs audit event when status is resolved", async () => {
    const requestId = `it-corr-${ulid()}`;
    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: testTimeRecordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-11T07:45:00.000Z",
        reason: "Approve for test",
        status: "pending",
      },
    });

    const updated = await CorrectionService.updateStatus(requestId, {
      status: "approved",
      resolvedBy: "supervisor_test",
      actorUsername: "supervisor_test",
      actorRole: "Supervisor",
    });

    expect(updated.status).toBe("approved");

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "CORRECTION_REQUEST_STATUS_UPDATED",
        details: {
          path: ["requestId"],
          equals: requestId,
        },
      },
      orderBy: { timestamp: "desc" },
    });
    expect(auditLog).not.toBeNull();
    expect(auditLog?.severity).toBe("INFO");
  });

  it("applies approved correction value to time record", async () => {
    const requestId = `it-corr-${ulid()}`;
    const requestedValue = "2026-02-11T07:33:00.000Z";

    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: testTimeRecordId,
        recordField: "entrada",
        originalValue: "2026-02-11T08:00",
        requestedValue,
        reason: "Adjust entry time",
        status: "pending",
      },
    });

    await CorrectionService.updateStatus(requestId, {
      status: "approved",
      resolvedBy: "supervisor_test",
      actorUsername: "supervisor_test",
      actorRole: "Supervisor",
    });

    const updatedTimeRecord = await prisma.timeRecord.findUnique({
      where: { id: testTimeRecordId },
    });

    expect(updatedTimeRecord).not.toBeNull();
    expect(updatedTimeRecord?.entrada).toBe(requestedValue);

    const timeRecordAudit = await prisma.auditLog.findFirst({
      where: {
        action: "TIME_RECORD_EDITED",
        details: {
          path: ["correctionRequestId"],
          equals: requestId,
        },
      },
      orderBy: { timestamp: "desc" },
    });
    expect(timeRecordAudit).not.toBeNull();
    expect(timeRecordAudit?.details).toMatchObject({
      recordId: testTimeRecordId,
      correctionRequestId: requestId,
    });
  });

  it("keeps updateStatus idempotent and does not duplicate audit log", async () => {
    const requestId = `it-corr-${ulid()}`;
    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: testTimeRecordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-11T07:40:00.000Z",
        reason: "Idempotency test",
        status: "pending",
      },
    });

    await CorrectionService.updateStatus(requestId, {
      status: "approved",
      resolvedBy: "supervisor_test",
      actorUsername: "supervisor_test",
      actorRole: "Supervisor",
    });

    const firstAuditCount = await prisma.auditLog.count({
      where: {
        action: "CORRECTION_REQUEST_STATUS_UPDATED",
        details: { path: ["requestId"], equals: requestId },
      },
    });
    expect(firstAuditCount).toBe(1);

    const secondUpdate = await CorrectionService.updateStatus(requestId, {
      status: "rejected",
      resolvedBy: "supervisor_test_2",
      rejectionReason: "Should not apply",
      actorUsername: "supervisor_test_2",
      actorRole: "Supervisor",
    });

    expect(secondUpdate.status).toBe("approved");

    const secondAuditCount = await prisma.auditLog.count({
      where: {
        action: "CORRECTION_REQUEST_STATUS_UPDATED",
        details: { path: ["requestId"], equals: requestId },
      },
    });
    expect(secondAuditCount).toBe(1);
  });

  it("returns history events for the request", async () => {
    const requestId = `it-corr-${ulid()}`;
    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: testEmployeeId,
        timeRecordId: testTimeRecordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-11T07:35:00.000Z",
        reason: "History test",
        status: "pending",
      },
    });

    await CorrectionService.updateStatus(requestId, {
      status: "rejected",
      resolvedBy: "supervisor_test",
      rejectionReason: "Insufficient evidence",
      actorUsername: "supervisor_test",
      actorRole: "Supervisor",
    });

    const history = await CorrectionService.getHistory(requestId, {
      role: "Supervisor",
    });

    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history.some((event: any) => event.action === "CORRECTION_REQUEST_STATUS_UPDATED")).toBe(
      true,
    );
  });

  it("denies history access for Usuario over another employee request", async () => {
    const otherTimeRecordId = ulid();
    const requestId = `it-corr-${ulid()}`;
    await prisma.timeRecord.create({
      data: {
        id: otherTimeRecordId,
        employeeId: otherEmployeeId,
        employeeName: "Different Employee",
        date: "2026-02-12",
      },
    });

    await prisma.correctionRequest.create({
      data: {
        id: requestId,
        employeeId: otherEmployeeId,
        timeRecordId: otherTimeRecordId,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-12T07:30:00.000Z",
        reason: "Unauthorized history access test",
        status: "pending",
      },
    });

    await expect(
      CorrectionService.getHistory(requestId, {
        role: "Usuario",
        employeeId: testEmployeeId,
      }),
    ).rejects.toBeInstanceOf(AppError);

    await prisma.timeRecord.deleteMany({ where: { id: otherTimeRecordId } });
  });

  it("throws NOT_FOUND for missing correction history request", async () => {
    await expect(
      CorrectionService.getHistory(`it-corr-missing-${ulid()}`, {
        role: "Supervisor",
      }),
    ).rejects.toMatchObject({ message: "NOT_FOUND" });
  });
});
