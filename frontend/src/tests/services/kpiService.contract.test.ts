import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "../../services/authToken";
import {
  downloadReportExcel,
  downloadReportPDF,
  getDashboardOverview,
  getDailyPlanningSummary,
  getDetailedReport,
  runKpiCalculation,
} from "../../services/kpiService";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("kpiService contracts", () => {
  beforeEach(() => {
    authTokenStore.setToken("test-token");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("normalizes dashboard overview response", async () => {
    server.use(
      http.get("http://localhost:4000/api/kpis/overview", () =>
        HttpResponse.json({
          activeShifts: 4,
          teamStatus: { present: 3, total: 10, anomaliesCount: 1 },
        }),
      ),
    );

    const result = await getDashboardOverview();

    expect(result.activeShifts).toBe(4);
    expect(result.teamStatus).toMatchObject({ present: 3, total: 10 });
    expect(result.employeeStatuses).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(result.unscheduledPresent).toEqual([]);
  });

  it("normalizes detailed report response", async () => {
    server.use(
      http.post("http://localhost:4000/api/kpis/detailed-report", () =>
        HttpResponse.json({ summary: [{ employeeId: "e1", name: "Ana" }] }),
      ),
    );

    const result = await getDetailedReport({ startDate: "2026-03-01", endDate: "2026-03-02" });

    expect(result.summary).toHaveLength(1);
    expect(result.details).toEqual({});
  });

  it("normalizes daily planning response", async () => {
    server.use(
      http.get("http://localhost:4000/api/kpis/daily-planning", () =>
        HttpResponse.json({ date: "2026-03-05" }),
      ),
    );

    const result = await getDailyPlanningSummary();

    expect(result.date).toBe("2026-03-05");
    expect(result.stats).toEqual({});
  });

  it("sends employee ids only in KPI summary payload", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:4000/api/kpis/summary", async ({ request }) => {
        capturedBody = await request.json();
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

    const body = capturedBody as { employeeIds: string[]; startDate: string; endDate: string };
    expect(body.employeeIds).toEqual(["e1", "e2"]);
  });

  it("forwards workdayType in getDetailedReport, downloadReportPDF and downloadReportExcel", async () => {
    let detailedBody: unknown;
    let pdfQuery: URLSearchParams | undefined;
    let excelQuery: URLSearchParams | undefined;

    server.use(
      http.post("http://localhost:4000/api/kpis/detailed-report", async ({ request }) => {
        detailedBody = await request.json();
        return HttpResponse.json({ summary: [], details: {} });
      }),
      http.get("http://localhost:4000/api/export/report-pdf", ({ request }) => {
        pdfQuery = new URL(request.url).searchParams;
        return new HttpResponse(new Blob(["pdf"], { type: "application/pdf" }), { status: 200 });
      }),
      http.get("http://localhost:4000/api/export/report-excel", ({ request }) => {
        excelQuery = new URL(request.url).searchParams;
        return new HttpResponse(new Blob(["xlsx"], { type: "application/vnd.ms-excel" }), {
          status: 200,
        });
      }),
    );

    await getDetailedReport({
      startDate: "2026-03-01",
      endDate: "2026-03-02",
      workdayType: "Parcial",
    });
    await downloadReportPDF({
      startDate: "2026-03-01",
      endDate: "2026-03-02",
      workdayType: "Parcial",
      mode: "summary",
    });
    await downloadReportExcel({
      startDate: "2026-03-01",
      endDate: "2026-03-02",
      workdayType: "Parcial",
      mode: "summary",
    });

    expect(detailedBody).toMatchObject({ workdayType: "Parcial" });
    expect(pdfQuery?.get("workdayType")).toBe("Parcial");
    expect(pdfQuery?.get("mode")).toBe("summary");
    expect(excelQuery?.get("workdayType")).toBe("Parcial");
    expect(excelQuery?.get("mode")).toBe("summary");
  });
});
