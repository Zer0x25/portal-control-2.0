import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import {
  getKpiSummary,
  getDashboardOverview,
  getDailyPlanningSummary,
  getDetailedReport,
} from "../../src/controllers/kpiController";
import { errorHandler } from "../../src/middleware/errorHandler";
import { kpiService } from "../../src/services/kpiService";

// Mock the kpiService
vi.mock("../../src/services/kpiService", () => ({
  kpiService: {
    getKpiSummary: vi.fn(),
    getDashboardOverview: vi.fn(),
    getDailyPlanningSummary: vi.fn(),
    getDetailedReport: vi.fn(),
  },
}));

// Setup Express app
const app = express();
app.use(express.json());

// Routes to test controller methods
app.post("/kpi/summary", getKpiSummary);
app.get("/kpi/dashboard", getDashboardOverview);
app.get("/kpi/daily", getDailyPlanningSummary);
app.post("/kpi/detailed", getDetailedReport);

// Error handler middleware
app.use(errorHandler);

describe("KPI Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /kpi/dashboard (getDashboardOverview)", () => {
    it("should return 200 and dashboard overview stats", async () => {
      const mockStats = { today: 10 };
      vi.mocked(kpiService.getDashboardOverview).mockResolvedValue(mockStats as any);

      const res = await request(app).get("/kpi/dashboard");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(kpiService.getDashboardOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /kpi/daily (getDailyPlanningSummary)", () => {
    it("should return 200 and daily planning stats", async () => {
      const mockStats = { planned: 20 };
      vi.mocked(kpiService.getDailyPlanningSummary).mockResolvedValue(mockStats as any);

      const res = await request(app).get("/kpi/daily");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(kpiService.getDailyPlanningSummary).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /kpi/detailed (getDetailedReport)", () => {
    it("should return 400 if startDate and (endDate or endDateExclusive) are missing", async () => {
      const res = await request(app).post("/kpi/detailed").send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 if date range is invalid", async () => {
      const res = await request(app).post("/kpi/detailed").send({
        startDate: "2023-12-31",
        endDate: "2023-01-01",
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 200 and report on successful request", async () => {
      const mockReport = { rows: [] };
      vi.mocked(kpiService.getDetailedReport).mockResolvedValue(mockReport as any);

      const res = await request(app).post("/kpi/detailed").send({
        startDate: "2023-01-01",
        endDate: "2023-01-31",
        area: "Sales",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockReport);
      expect(kpiService.getDetailedReport).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2023-01-01",
          endDate: "2023-01-31",
          area: "Sales",
        }),
      );
    });
  });

  describe("POST /kpi/summary (getKpiSummary)", () => {
    it("should return 400 if startDate and (endDate or endDateExclusive) are missing", async () => {
      const res = await request(app).post("/kpi/summary").send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.message).toBe("startDate and (endDate or endDateExclusive) are required");
    });

    it("should return 400 if startDate is after endDate", async () => {
      const res = await request(app).post("/kpi/summary").send({
        startDate: "2023-12-31",
        endDateExclusive: "2023-01-01", // Or endDate
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.message).toBe("La fecha de inicio debe ser anterior a la fecha de término");
    });

    it("should return 400 if date range exceeds max allowed years", async () => {
      const res = await request(app).post("/kpi/summary").send({
        startDate: "2020-01-01",
        endDate: "2022-01-01", // Exceeds 1 year for multiple/all employees
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.message).toContain("El rango de fechas no puede exceder 1 año");
    });

    it("should allow up to 5 years range if a single employeeId is provided", async () => {
      vi.mocked(kpiService.getKpiSummary).mockResolvedValue({ someStat: 1 } as any);

      const res = await request(app)
        .post("/kpi/summary")
        .send({
          startDate: "2019-01-01",
          endDate: "2022-01-01", // 3 years
          employeeIds: ["emp-1"],
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ someStat: 1 });
      expect(kpiService.getKpiSummary).toHaveBeenCalledTimes(1);
    });

    it("should return 200 and stats on successful request", async () => {
      const mockStats = { total: 100 };
      vi.mocked(kpiService.getKpiSummary).mockResolvedValue(mockStats as any);

      const res = await request(app).post("/kpi/summary").send({
        startDate: "2023-01-01",
        endDate: "2023-01-31",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockStats);
      expect(kpiService.getKpiSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2023-01-01",
          endDate: "2023-01-31",
        }),
      );
    });
  });
});
