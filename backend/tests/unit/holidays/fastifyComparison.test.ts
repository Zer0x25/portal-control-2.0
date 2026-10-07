import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import express from "express";
import request from "supertest";
import { holidayQueryPlugin } from "../../../src/modules/holidays/http/fastify";
import { createGetHolidays } from "../../../src/modules/holidays/application/getHolidays";
import { holidayService } from "../../../src/services/HolidayService";
import holidayRoutes from "../../../src/routes/holidayRoutes";
import { errorHandler } from "../../../src/middleware/errorHandler";
import { AuthError } from "../../../src/utils/AppError";
import { mapHttpError } from "../../../src/utils/httpError";

vi.mock("../../../src/services/HolidayService", () => ({
  holidayService: { getHolidays: vi.fn() },
}));
vi.mock("../../../src/services/auditService", () => ({
  auditService: { logError: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../../../src/middleware/authMiddleware", () => ({
  authenticateToken: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization !== "Bearer fixture") {
      return res
        .status(401)
        .json({ success: false, code: "UNAUTHORIZED", message: "Auth required" });
    }
    next();
  },
  authorizeSupervisor: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

describe("Express router vs Fastify pilot: same holiday use case", () => {
  let fastify: FastifyInstance;
  let app: express.Express;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const instant = new Date("2026-01-01T02:00:00Z");
    query = vi.fn(
      createGetHolidays({
        repository: {
          list: async () => [
            {
              id: "1",
              date: "2026-01-01",
              name: "Año Nuevo",
              type: "Nacional",
              createdAt: instant,
              updatedAt: instant,
            },
          ],
          count: async () => 21,
          countYear: async () => 1,
        },
        clock: { businessDate: () => "2025-12-31", year: () => 2026 },
        autosyncEnabled: () => false,
        sync: async () => {},
      }),
    );
    vi.mocked(holidayService.getHolidays).mockImplementation(query);
    app = express();
    app.use("/api/holidays", holidayRoutes);
    app.use(errorHandler);
    fastify = Fastify({ logger: false });
    await fastify.register(holidayQueryPlugin, {
      getHolidays: query,
      authenticate: async (req) => {
        if (req.headers.authorization !== "Bearer fixture") {
          throw new AuthError("Auth required");
        }
      },
      mapError: (error) => mapHttpError(error),
    });
  });

  afterEach(async () => {
    await fastify.close();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    "",
    "?page=2&pageSize=10&search=A%C3%B1o&showArchived=true",
    "?since=1767232800000",
    "?page=1&pageSize=10",
  ])("matches status, body and input mapping for %s", async (suffix) => {
    const url = `/api/holidays${suffix}`;
    const legacy = await request(app).get(url).set("Authorization", "Bearer fixture");
    const pilot = await fastify.inject({
      method: "GET",
      url,
      headers: { authorization: "Bearer fixture" },
    });
    expect(pilot.statusCode).toBe(legacy.status);
    expect(pilot.json()).toEqual(legacy.body);
    expect(query.mock.calls).toHaveLength(2);
    expect(query.mock.calls[1]).toEqual(query.mock.calls[0]);
  });

  it("rejects missing authentication before calling the use case", async () => {
    const legacy = await request(app).get("/api/holidays");
    const pilot = await fastify.inject({ method: "GET", url: "/api/holidays" });
    expect(pilot.statusCode).toBe(401);
    expect(pilot.json()).toEqual(legacy.body);
    expect(query).not.toHaveBeenCalled();
  });

  it("preserves failure status and payload", async () => {
    query.mockRejectedValue(new Error("Provider unavailable"));
    const legacy = await request(app).get("/api/holidays").set("Authorization", "Bearer fixture");
    const pilot = await fastify.inject({
      method: "GET",
      url: "/api/holidays",
      headers: { authorization: "Bearer fixture" },
    });
    expect(pilot.statusCode).toBe(500);
    expect(pilot.json()).toEqual(legacy.body);
  });
});
