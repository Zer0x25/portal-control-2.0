import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/errorHandler";
import { Prisma } from "../../src/generated/prisma/client";

vi.mock("../../src/services/auditService", () => ({
  auditService: { logError: vi.fn().mockResolvedValue(undefined) },
}));

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
  return res;
}

const req = { method: "GET", path: "/api/employees", headers: {}, ip: "127.0.0.1" };

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("db unreachable", {
    code,
    clientVersion: "7.0.0",
  });
}

describe("errorHandler: BD inalcanzable es 503 (caos PgBouncer)", () => {
  it.each(["P1001", "P1002", "P2024"])("mapea %s a SERVICE_UNAVAILABLE", (code) => {
    const res = mockRes();
    errorHandler(prismaError(code), req as never, res as never, (() => {}) as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ success: false, code: "SERVICE_UNAVAILABLE" });
  });

  it("otros errores Prisma siguen en 500 DATABASE_ERROR", () => {
    const res = mockRes();
    errorHandler(prismaError("P2001"), req as never, res as never, (() => {}) as never);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ success: false, code: "DATABASE_ERROR" });
  });
});
