import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import {
  getDashboardOverview,
  getDailyPlanningSummary,
  getDetailedReport,
  runKpiCalculation,
} from "../../services/kpiService";

describe("kpiService contracts (MSW real network - AC3)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes dashboard overview response", async () => {
    server.use(
      http.get("*/api/kpis/overview", () => {
        return HttpResponse.json({
          activeShifts: 4,
          teamStatus: {
            present: 3,
            total: 10,
            anomaliesCount: 1,
          },
        });
      }),
    );

    const result = await getDashboardOverview();

    expect(result.activeShifts).toBe(4);
    expect(result.teamStatus).toMatchObject({
      present: 3,
      total: 10,
    });
    expect(result.employeeStatuses).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(result.unscheduledPresent).toEqual([]);
  });

  it("normalizes detailed report response", async () => {
    server.use(
      http.post("*/api/kpis/detailed-report", () => {
        return HttpResponse.json({ summary: [{ employeeId: "e1", name: "Ana" }] });
      }),
    );

    const result = await getDetailedReport({
      startDate: "2026-03-01",
      endDate: "2026-03-02",
    });

    expect(result.summary).toHaveLength(1);
    expect(result.details).toEqual({});
  });

  it("normalizes daily planning response", async () => {
    server.use(
      http.get("*/api/kpis/daily-planning", () => {
        return HttpResponse.json({ date: "2026-03-05" });
      }),
    );

    const result = await getDailyPlanningSummary();

    expect(result.date).toBe("2026-03-05");
    expect(result.stats).toEqual({});
  });

  it("sends employee ids only in KPI summary payload", async () => {
    let capturedBody: { employeeIds?: string[]; startDate?: string; endDate?: string } | null =
      null;

    server.use(
      http.post("*/api/kpis/summary", async ({ request }) => {
        capturedBody = (await request.json()) as typeof capturedBody;
        return HttpResponse.json({ kpis: {}, kpiDetails: {} });
      }),
    );

    await runKpiCalculation({
      filters: {
        employees: [{ id: "e1" }, { id: "e2" }],
        startDate: "2026-03-01",
        endDate: "2026-03-02",
      },
    });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.employeeIds).toEqual(["e1", "e2"]);
  });
});
