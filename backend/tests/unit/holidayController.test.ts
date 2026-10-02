import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { getHolidays } from "../../src/controllers/holidayController";
import { errorHandler } from "../../src/middleware/errorHandler";
import { holidayService } from "../../src/services/HolidayService";

// Mock the holidayService
vi.mock("../../src/services/HolidayService", () => ({
  holidayService: {
    getHolidays: vi.fn(),
    syncExternalHolidays: vi.fn(),
    upsertHoliday: vi.fn(),
    deleteHoliday: vi.fn(),
    bulkUpsertHolidays: vi.fn(),
  },
}));

import { AuthRequest } from "../../src/middleware/authMiddleware";
import {
  syncExternalHolidays,
  createHoliday,
  deleteHoliday,
  createBulkHolidays,
} from "../../src/controllers/holidayController";

// Setup Express app
const app = express();
app.use(express.json());

// Auth middleware mock
const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization !== "Bearer none") {
    (req as AuthRequest).user = {
      id: "user-1",
      username: "testuser",
      role: "admin",
      permissions: [],
      type: "admin",
      active: true,
      lastLogin: new Date(),
    };
  }
  next();
};

// Routes to test controller methods
app.get("/holidays", getHolidays);
app.post("/holidays/sync", mockAuth, syncExternalHolidays);
app.post("/holidays", mockAuth, createHoliday);
app.delete("/holidays/:id", mockAuth, deleteHoliday);
app.post("/holidays/bulk", mockAuth, createBulkHolidays);

// Error handler middleware
app.use(errorHandler);

describe("Holiday Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /holidays (getHolidays)", () => {
    it("should return 200 and holidays list with default parameters", async () => {
      const mockHolidays = { items: [], total: 0 };
      vi.mocked(holidayService.getHolidays).mockResolvedValue(mockHolidays as any);

      const res = await request(app).get("/holidays");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockHolidays);
      expect(holidayService.getHolidays).toHaveBeenCalledWith({
        since: undefined,
        page: undefined,
        pageSize: undefined,
        search: undefined,
        showArchived: false,
      });
    });

    it("should parse query parameters correctly", async () => {
      const mockHolidays = { items: [{ id: "1", name: "Test Holiday" }], total: 1 };
      vi.mocked(holidayService.getHolidays).mockResolvedValue(mockHolidays as any);

      const res = await request(app).get("/holidays").query({
        since: "2023-01-01",
        page: "2",
        pageSize: "10",
        search: "Test",
        showArchived: "true",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockHolidays);
      expect(holidayService.getHolidays).toHaveBeenCalledWith({
        since: "2023-01-01",
        page: 2,
        pageSize: 10,
        search: "Test",
        showArchived: true,
      });
    });
  });

  describe("POST /holidays/sync (syncExternalHolidays)", () => {
    it("should call syncExternalHolidays with provided year and user username", async () => {
      const mockResult = { count: 10 };
      vi.mocked(holidayService.syncExternalHolidays).mockResolvedValue(mockResult as any);

      const res = await request(app).post("/holidays/sync").send({ year: 2024 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(holidayService.syncExternalHolidays).toHaveBeenCalledWith(2024, "testuser");
    });

    it("should call syncExternalHolidays with undefined year if not provided", async () => {
      const mockResult = { count: 5 };
      vi.mocked(holidayService.syncExternalHolidays).mockResolvedValue(mockResult as any);

      const res = await request(app).post("/holidays/sync").send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(holidayService.syncExternalHolidays).toHaveBeenCalledWith(undefined, "testuser");
    });

    it("should default to 'System' if req.user is not available", async () => {
      const mockResult = { count: 0 };
      vi.mocked(holidayService.syncExternalHolidays).mockResolvedValue(mockResult as any);

      const res = await request(app)
        .post("/holidays/sync")
        .set("Authorization", "Bearer none")
        .send({ year: 2024 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(holidayService.syncExternalHolidays).toHaveBeenCalledWith(2024, "System");
    });
  });

  describe("POST /holidays (createHoliday)", () => {
    it("should call upsertHoliday with req.body and username, and return 201", async () => {
      const mockBody = { date: "2024-12-25", name: "Christmas" };
      const mockResult = { id: "1", ...mockBody };
      vi.mocked(holidayService.upsertHoliday).mockResolvedValue(mockResult as any);

      const res = await request(app).post("/holidays").send(mockBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResult);
      expect(holidayService.upsertHoliday).toHaveBeenCalledWith(mockBody, "testuser");
    });

    it("should default to 'System' if req.user is not available", async () => {
      const mockBody = { date: "2024-12-25", name: "Christmas" };
      const mockResult = { id: "1", ...mockBody };
      vi.mocked(holidayService.upsertHoliday).mockResolvedValue(mockResult as any);

      const res = await request(app)
        .post("/holidays")
        .set("Authorization", "Bearer none")
        .send(mockBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockResult);
      expect(holidayService.upsertHoliday).toHaveBeenCalledWith(mockBody, "System");
    });
  });

  describe("DELETE /holidays/:id (deleteHoliday)", () => {
    it("should call deleteHoliday with id and username, and return 204", async () => {
      vi.mocked(holidayService.deleteHoliday).mockResolvedValue(undefined);

      const res = await request(app).delete("/holidays/test-id-123");

      expect(res.status).toBe(204);
      expect(holidayService.deleteHoliday).toHaveBeenCalledWith("test-id-123", "testuser");
    });

    it("should default to 'System' if req.user is not available", async () => {
      vi.mocked(holidayService.deleteHoliday).mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/holidays/test-id-123")
        .set("Authorization", "Bearer none");

      expect(res.status).toBe(204);
      expect(holidayService.deleteHoliday).toHaveBeenCalledWith("test-id-123", "System");
    });

    it("should return ValidationError if id is invalid/missing in params", async () => {
      // Because we use `app.delete("/holidays/:id")`, express might not match `/holidays/` to this route.
      // But if it somehow does (or if we explicitly hit a route where id is not string), test the validation error block
      // To strictly test the validation error, we can directly invoke the controller if express routing prevents it,
      // but let's see if we can trigger it via supertest. Actually, let's just make a mock route for it or test it directly.
      // However, a missing ID in `/holidays/:id` results in a 404 from Express.
      // Let's create a temporary route just to trigger the validation logic, or we can mock req.params.
      // For simplicity and completeness, we will test the error response format if a ValidationError is thrown.

      const appWithLooseRoute = express();
      appWithLooseRoute.use(express.json());
      appWithLooseRoute.delete("/loose-holidays", mockAuth, deleteHoliday);
      appWithLooseRoute.use(errorHandler);

      const res = await request(appWithLooseRoute).delete("/loose-holidays");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.message).toBe("ID inválido");
    });
  });

  describe("POST /holidays/bulk (createBulkHolidays)", () => {
    it("should call bulkUpsertHolidays with req.body and username, and return 201 with count", async () => {
      const mockBody = [{ date: "2024-12-25", name: "Christmas" }];
      vi.mocked(holidayService.bulkUpsertHolidays).mockResolvedValue(5);

      const res = await request(app).post("/holidays/bulk").send(mockBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ count: 5 });
      expect(holidayService.bulkUpsertHolidays).toHaveBeenCalledWith(mockBody, "testuser");
    });

    it("should default to 'System' if req.user is not available", async () => {
      const mockBody = [{ date: "2024-12-25", name: "Christmas" }];
      vi.mocked(holidayService.bulkUpsertHolidays).mockResolvedValue(2);

      const res = await request(app)
        .post("/holidays/bulk")
        .set("Authorization", "Bearer none")
        .send(mockBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ count: 2 });
      expect(holidayService.bulkUpsertHolidays).toHaveBeenCalledWith(mockBody, "System");
    });
  });
});
