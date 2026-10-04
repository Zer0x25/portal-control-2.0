import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { kioskLogin } from "../../src/controllers/authController";
import { loginRateLimiter } from "../../src/middleware/loginLimiter";
import { validate } from "../../src/middleware/validate";
import { KioskLoginSchema } from "../../src/models/schemas/auth-user.schemas";
import { errorHandler } from "../../src/middleware/errorHandler";

const app = express();
app.use(express.json());
app.post("/kiosk-login", loginRateLimiter, validate(KioskLoginSchema), kioskLogin);
app.use(errorHandler);

// Anti-regresión caza-bugs 2026-10-04: /kiosk-login no tenía throttle
// (el limiter solo miraba `username`; kiosco manda `employeeId`). PIN de 4
// dígitos + enumeración de IDs sin freno por IP. En dev el budget es 30/min:
// 35 PINs erróneos deben toparse con al menos un 429.
describe("Kiosk login rate limit", () => {
  const testEmployeeId = `it-kioskrl-emp-${ulid()}`;

  beforeAll(async () => {
    await prisma.employee.create({
      data: {
        id: testEmployeeId,
        name: "Kiosk RateLimit Employee",
        rut: `84${String(Date.now()).slice(-7)}-1`,
        position: "Operator",
        area: "Ops",
        workdayType: "Ordinaria",
        status: "Activo",
        pin: "2468",
      },
    });
  });

  afterAll(async () => {
    await prisma.employee.deleteMany({ where: { id: testEmployeeId } });
  });

  it("fuerza bruta de PIN se topa con 429", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 35; i++) {
      const res = await request(app)
        .post("/kiosk-login")
        .send({ employeeId: testEmployeeId, pin: "0000" });
      codes.push(res.status);
    }
    expect(codes).toContain(429);
  }, 60000);
});
