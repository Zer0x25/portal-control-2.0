import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ulid } from "ulid";
import prisma from "../../src/services/db";
import { kioskLogin } from "../../src/controllers/authController";

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

describe("Kiosk PIN Security Flow", () => {
  const testEmployeeId = ulid();
  const testEmployeeName = `Kiosk IT ${ulid()}`;
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = "integration-test-secret";

    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: testEmployeeName,
        rut: `33${Date.now()}-3`,
        position: "Operator",
        area: "Ops",
        workdayType: "Normal",
        status: "Activo",
        pin: "1234",
        pinFailedAttempts: 0,
        isPinBlocked: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUsername: testEmployeeName } });
    await prisma.employee.deleteMany({ where: { id: testEmployeeId } });

    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it("blocks PIN after 5 failed attempts and rejects further access", async () => {
    for (let i = 1; i <= 5; i++) {
      const req = {
        body: { employeeId: testEmployeeId, pin: "9999" },
        ip: "127.0.0.1",
      } as any;
      const res = createMockRes();

      await kioskLogin(req, res as any);

      expect(res.statusCode).toBe(401);
      if (i < 5) {
        expect(String(res.body?.message || "")).toContain("PIN incorrecto");
      } else {
        expect(String(res.body?.message || "")).toContain("PIN bloqueado");
      }
    }

    const employeeAfterFailures = await prisma.employee.findUnique({
      where: { id: testEmployeeId },
    });
    expect(employeeAfterFailures?.isPinBlocked).toBe(true);
    expect(employeeAfterFailures?.pinFailedAttempts).toBe(5);

    const reqBlocked = {
      body: { employeeId: testEmployeeId, pin: "1234" },
      ip: "127.0.0.1",
    } as any;
    const resBlocked = createMockRes();
    await kioskLogin(reqBlocked, resBlocked as any);

    expect(resBlocked.statusCode).toBe(403);
    expect(String(resBlocked.body?.message || "")).toContain("PIN bloqueado");
  });
});
