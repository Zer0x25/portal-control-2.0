import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useReportsTabController } from "../../../features/supervisor-dashboard/hooks/useReportsTabController";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

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

describe("useReportsTabController", () => {
  beforeEach(() => {
    authTokenStore.setToken("token-123");
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    server.use(
      http.post("http://localhost:4000/api/kpis/detailed-report", () =>
        HttpResponse.json({
          summary: [{ employeeId: "e1", name: "Ana", totalHoursWorked: 8 }],
          details: {},
        }),
      ),
      http.get(
        "http://localhost:4000/api/export/report-pdf",
        () =>
          new HttpResponse(new Blob(["mock"], { type: "application/pdf" }), {
            status: 200,
            headers: { "content-disposition": 'attachment; filename="Reporte_Asistencia.pdf"' },
          }),
      ),
      http.get(
        "http://localhost:4000/api/export/report-excel",
        () =>
          new HttpResponse(new Blob(["mock"], { type: "application/vnd.ms-excel" }), {
            status: 200,
            headers: { "content-disposition": 'attachment; filename="Reporte_Asistencia.xlsx"' },
          }),
      ),
    );
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("generates team report and stores summary data", async () => {
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

    expect(result.current.isSingleEmployeeReport).toBe(false);
    expect(result.current.sortedReportData).toHaveLength(1);
  });

  it("opens pdf mode modal when server-pdf export is requested in team mode", async () => {
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
