import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import bcryptjs from "bcryptjs";
import prisma from "../../src/services/db";
import { ulid } from "ulid";
import { login } from "../../src/controllers/authController";
import { AuthService } from "../../src/services/AuthService";
import { loginRateLimiter } from "../../src/middleware/loginLimiter";
import { validate } from "../../src/middleware/validate";
import { LoginSchema } from "../../src/models/schemas/auth-user.schemas";
import { errorHandler } from "../../src/middleware/errorHandler";

const app = express();
app.use(express.json());
app.post("/login", loginRateLimiter, validate(LoginSchema), login);
app.use(errorHandler);

// Anti-regresión caza-bugs 2026-10-04: el límite de 1 sesión para Usuario se
// evadía con logins concurrentes (count→evict→insert: todos evictan la misma
// fila y todos insertan). 3 logins simultáneos deben dejar 1 sola sesión.
describe("Session limit race", () => {
  const userId = ulid();
  const username = `it_sessrace_${ulid().toLowerCase()}`;
  const password = "sess-race-123";

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        id: userId,
        username,
        passwordHash: bcryptjs.hashSync(password, 10),
        role: "Usuario",
      },
    });
    // Una sesión previa: los 3 logins concurrentes ven cupo lleno desde el inicio.
    await AuthService.createSession(userId, username, "Usuario", null, "seed-agent");
  });

  afterAll(async () => {
    await prisma.activeSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("3 logins concurrentes dejan 1 sola sesión activa", async () => {
    const results = await Promise.all(
      [1, 2, 3].map(() => request(app).post("/login").send({ username, password })),
    );
    for (const r of results) expect(r.status).toBe(200);

    const count = await prisma.activeSession.count({ where: { userId } });
    expect(count).toBe(1);
  }, 60000);
});
