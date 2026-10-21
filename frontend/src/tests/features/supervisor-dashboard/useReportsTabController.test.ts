import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { useReportsTabController } from "../../../features/supervisor-dashboard/hooks/useReportsTabController";

const { useEmployeesMock, useToastsMock, useNavigateMock, addToastMock } = vi.hoisted(() => ({
  useEmployeesMock: vi.fn(),
  useToastsMock: vi.fn(),
  useNavigateMock: vi.fn(),
  addToastMock: vi.fn(),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => useEmployeesMock(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => useToastsMock(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => useNavigateMock,
}));

describe("useReportsTabController (MSW)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates team report and stores summary data", async () => {
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    let capturedFilter: unknown = null;
    server.use(
      http.post("*/api/kpis/detailed-report", async ({ request }) => {
        capturedFilter = await request.json();
        return HttpResponse.json({
          summary: [{ employeeId: "e1", name: "Ana", totalHoursWorked: 8 }],
          details: {},
        });
      }),
    );

    const { result } = renderHook(() => useReportsTabController());

    act(() => {
      result.current.handleFiltersChange({
        employeeId: "",
        area: "A1",
        workdayType: "",
        startDateISO: "2026-03-01",
        endDateISO: "2026-03-05",
      });
    });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(capturedFilter).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      area: "A1",
    });
    expect(result.current.isSingleEmployeeReport).toBe(false);
    expect(result.current.sortedReportData).toHaveLength(1);
  });

  it("opens pdf mode modal when server-pdf export is requested in team mode", async () => {
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    server.use(
      http.post("*/api/kpis/detailed-report", () => {
        return HttpResponse.json({
          summary: [{ employeeId: "e1", name: "Ana", totalHoursWorked: 8 }],
          details: {},
        });
      }),
    );

    const { result } = renderHook(() => useReportsTabController());

    act(() => {
      result.current.handleFiltersChange({
        employeeId: "",
        area: "",
        workdayType: "",
        startDateISO: "2026-03-01",
        endDateISO: "2026-03-05",
      });
    });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    await act(async () => {
      await result.current.handleExport("server-pdf");
    });

    expect(result.current.showPdfModeModal).toBe(true);
  });
});
