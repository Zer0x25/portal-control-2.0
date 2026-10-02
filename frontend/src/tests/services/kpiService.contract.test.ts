import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDashboardOverview,
  getDailyPlanningSummary,
  getDetailedReport,
  runKpiCalculation,
} from "../../services/kpiService";

vi.mock("../../services/authService", () => ({
  authService: {
    getAuthHeader: () => ({ Authorization: "Bearer test-token" }),
  },
}));

describe("kpiService contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes dashboard overview response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activeShifts: 4,
          teamStatus: {
            present: 3,
            total: 10,
            anomalies: [{ id: "r1" }],
            presentRecords: [{ id: "r2" }],
          },
        }),
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ summary: [{ employeeId: "e1", name: "Ana" }] }),
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ date: "2026-03-05" }),
      }),
    );

    const result = await getDailyPlanningSummary();

    expect(result.date).toBe("2026-03-05");
    expect(result.stats).toEqual({});
  });

  it("sends employee ids only in KPI summary payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kpis: {}, kpiDetails: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await runKpiCalculation({
      filters: {
        employees: [{ id: "e1" }, { id: "e2" }],
        startDate: "2026-03-01",
        endDate: "2026-03-02",
      },
    });

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body as string) as {
      employeeIds: string[];
      startDate: string;
      endDate: string;
    };
    expect(body.employeeIds).toEqual(["e1", "e2"]);
  });
});
