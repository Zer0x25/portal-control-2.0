import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AddressInfo } from "net";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import app from "../../src/app";

describe("Correction Request HTTP Contract", () => {
  const employeeId = ulid();
  const userId = ulid();
  const timeRecordId = ulid();
  const username = `it_corr_http_${ulid().toLowerCase()}`;
  const previousJwtSecret = process.env.JWT_SECRET;
  let baseUrl = "";
  let token = "";
  let server: ReturnType<typeof app.listen> | null = null;

  beforeAll(async () => {
    process.env.JWT_SECRET = "integration-test-secret";

    await prisma.employee.create({
      data: {
        id: employeeId,
        name: "Correction HTTP Employee",
        rut: `77${Date.now()}-7`,
        position: "Operator",
        area: "Ops",
        workdayType: "Normal",
        status: "Activo",
      },
    });

    await prisma.user.create({
      data: {
        id: userId,
        username,
        passwordHash: "dummy",
        role: "Usuario",
        employeeId,
      },
    });

    await prisma.timeRecord.create({
      data: {
        id: timeRecordId,
        employeeId,
        employeeName: "Correction HTTP Employee",
        employeePosition: "Operator",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: "2026-03-04",
        entrada: "2026-03-04T08:00:00.000Z",
        status: "AnomaliaManual",
        source: "TEST_SUITE",
      },
    });

    token = jwt.sign(
      { id: userId, username, role: "Usuario", employeeId },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );

    await prisma.activeSession.create({
      data: {
        userId,
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        deviceInfo: "vitest-correction-http-contract",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await prisma.activeSession.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({
      where: { actorUsername: { in: [username, username.toUpperCase()] } },
    });
    await prisma.correctionRequest.deleteMany({
      where: { employeeId },
    });
    await prisma.timeRecord.deleteMany({ where: { id: timeRecordId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.employee.deleteMany({ where: { id: employeeId } });

    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it("rejects correction requests with ambiguous requestedValue over HTTP", async () => {
    const response = await fetch(`${baseUrl}/api/corrections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        employeeId,
        timeRecordId,
        recordField: "entrada",
        currentValue: "2026-03-04T08:00:00.000Z",
        requestedValue: "07:55",
        reason: "Formato ambiguo",
      }),
    });

    const payload = (await response.json()) as {
      code?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.errors?.some((error) => error.field === "requestedValue")).toBe(true);
  });
});
