import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReportsTabController } from "../../../features/supervisor-dashboard/hooks/useReportsTabController";

const { useEmployeesMock, useToastsMock, useNavigateMock, getDetailedReportMock, addToastMock } =
  vi.hoisted(() => ({
    useEmployeesMock: vi.fn(),
    useToastsMock: vi.fn(),
    useNavigateMock: vi.fn(),
    getDetailedReportMock: vi.fn(),
    addToastMock: vi.fn(),
  }));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => useEmployeesMock(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => useToastsMock(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => useNavigateMock,
}));

vi.mock("../../../services/kpiService", () => ({
  getDetailedReport: (...args: unknown[]) => getDetailedReportMock(...args),
  downloadReportExcel: vi.fn(),
  downloadReportPDF: vi.fn(),
}));

vi.mock("../../../services/authService", () => ({
  authService: { getToken: () => "token-123" },
}));

describe("useReportsTabController", () => {
  it("generates team report and stores summary data", async () => {
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    getDetailedReportMock.mockResolvedValue({
      summary: [{ employeeId: "e1", name: "Ana", totalHoursWorked: 8 }],
      details: {},
    });

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

    expect(getDetailedReportMock).toHaveBeenCalledWith({
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      employeeIds: undefined,
      area: "A1",
    });
    expect(result.current.isSingleEmployeeReport).toBe(false);
    expect(result.current.sortedReportData).toHaveLength(1);
  });

  it("opens pdf mode modal when server-pdf export is requested in team mode", async () => {
    useEmployeesMock.mockReturnValue({ activeEmployees: [] });
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    getDetailedReportMock.mockResolvedValue({
      summary: [{ employeeId: "e1", name: "Ana", totalHoursWorked: 8 }],
      details: {},
    });

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
