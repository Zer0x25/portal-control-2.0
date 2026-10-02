import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { getCorrectionStats } from "../../src/controllers/correctionController";

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

describe("Correction Stats Integration", () => {
  const testEmployeeId = ulid();
  const testUserId = ulid();
  const testUsername = `it_stats_${ulid().toLowerCase()}`;
  const timeRecord1 = ulid();
  const timeRecord2 = ulid();
  const timeRecord3 = ulid();

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Stats Test Employee",
        rut: `88${Date.now()}-1`,
        position: "Operator",
        area: "Ops",
        workdayType: "Normal",
        status: "Activo",
      },
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

    await prisma.timeRecord.createMany({
      data: [
        { id: timeRecord1, employeeId: testEmployeeId, employeeName: "Stats", date: "2026-02-10" },
        { id: timeRecord2, employeeId: testEmployeeId, employeeName: "Stats", date: "2026-02-11" },
        { id: timeRecord3, employeeId: testEmployeeId, employeeName: "Stats", date: "2026-02-12" },
      ],
    });

    // Create some requests
    // 1. Old approved (should NOT be counted)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35);

    await prisma.correctionRequest.create({
      data: {
        id: `it-stats-old-${ulid()}`,
        employeeId: testEmployeeId,
        timeRecordId: timeRecord1,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-10T07:55:00.000Z",
        reason: "Old request",
        status: "approved",
        resolvedAt: oldDate,
      },
    });

    // 2. Recent approved (SHOULD be counted)
    await prisma.correctionRequest.create({
      data: {
        id: `it-stats-rec-${ulid()}`,
        employeeId: testEmployeeId,
        timeRecordId: timeRecord2,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-11T07:55:00.000Z",
        reason: "Recent request",
        status: "approved",
        resolvedAt: new Date(),
      },
    });

    // 3. Pending (SHOULD be counted)
    await prisma.correctionRequest.create({
      data: {
        id: `it-stats-pen-${ulid()}`,
        employeeId: testEmployeeId,
        timeRecordId: timeRecord3,
        recordField: "entrada",
        originalValue: "08:00",
        requestedValue: "2026-02-12T07:55:00.000Z",
        reason: "Pending request",
        status: "pending",
      },
    });
  });

  afterAll(async () => {
    await prisma.correctionRequest.deleteMany({
      where: { id: { startsWith: "it-stats-" } },
    });
    await prisma.timeRecord.deleteMany({
      where: { id: { in: [timeRecord1, timeRecord2, timeRecord3] } },
    });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.employee.deleteMany({ where: { id: testEmployeeId } });
  });

  it("returns correct stats counts for Usuario", async () => {
    const req = {
      user: { id: testUserId, username: testUsername, role: "Usuario", employeeId: testEmployeeId },
      query: {},
    } as any;
    const res = createMockRes();

    await getCorrectionStats(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      pending: 1,
      approved: 1,
      rejected: 0,
    });
  });
});
