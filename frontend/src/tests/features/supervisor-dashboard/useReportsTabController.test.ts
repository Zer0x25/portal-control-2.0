import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useReportsTabController } from "../../../features/supervisor-dashboard/hooks/useReportsTabController";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

const {
  useEmployeesMock,
  useToastsMock,
  useNavigateMock,
  addToastMock,
  triggerBrowserDownloadMock,
} = vi.hoisted(() => ({
  useEmployeesMock: vi.fn(),
  useToastsMock: vi.fn(),
  useNavigateMock: vi.fn(),
  addToastMock: vi.fn(),
  triggerBrowserDownloadMock: vi.fn(),
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

vi.mock("../../../utils/triggerBrowserDownload", () => ({
  triggerBrowserDownload: (...args: unknown[]) => triggerBrowserDownloadMock(...args),
}));

describe("useReportsTabController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("exports csv and xml via Authorization Bearer without token in URL", async () => {
    const requests: Array<{ auth: string | null; url: string }> = [];
    server.use(
      http.get("http://localhost:4000/api/records/export", ({ request }) => {
        requests.push({
          auth: request.headers.get("authorization"),
          url: request.url,
        });
        const format = new URL(request.url).searchParams.get("format") ?? "csv";
        return new HttpResponse(new Blob(["data"], { type: "text/plain" }), {
          status: 200,
          headers: { "content-disposition": `attachment; filename="reporte.${format}"` },
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

    await act(async () => {
      await result.current.handleExport("csv");
      await result.current.handleExport("xml");
    });

    expect(requests).toHaveLength(2);
    expect(requests[0].auth).toBe("Bearer token-123");
    expect(requests[0].url).toContain("format=csv");
    expect(requests[0].url).not.toContain("token=");
    expect(requests[1].auth).toBe("Bearer token-123");
    expect(requests[1].url).toContain("format=xml");
    expect(requests[1].url).not.toContain("token=");
    expect(triggerBrowserDownloadMock).toHaveBeenCalledWith(expect.any(Blob), "reporte.csv");
    expect(triggerBrowserDownloadMock).toHaveBeenCalledWith(expect.any(Blob), "reporte.xml");
  });

  it("propagates workdayType to detailed-report, excel and pdf exports", async () => {
    let detailedReportBody: unknown;
    const excelParams: URLSearchParams[] = [];
    const pdfParams: URLSearchParams[] = [];

    server.use(
      http.post("http://localhost:4000/api/kpis/detailed-report", async ({ request }) => {
        detailedReportBody = await request.json();
        return HttpResponse.json({
          summary: [{ employeeId: "e1", name: "Ana", totalHoursWorked: 8 }],
          details: {},
        });
      }),
      http.get("http://localhost:4000/api/export/report-excel", ({ request }) => {
        excelParams.push(new URL(request.url).searchParams);
        return new HttpResponse(new Blob(["mock"], { type: "application/vnd.ms-excel" }), {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="Reporte_Asistencia.xlsx"' },
        });
      }),
      http.get("http://localhost:4000/api/export/report-pdf", ({ request }) => {
        pdfParams.push(new URL(request.url).searchParams);
        return new HttpResponse(new Blob(["mock"], { type: "application/pdf" }), {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="Reporte_Asistencia.pdf"' },
        });
      }),
    );

    const { result } = renderHook(() => useReportsTabController());

    act(() => {
      result.current.handleFiltersChange({
        employeeId: "",
        area: "A1",
        workdayType: "Completa",
        startDateISO: "2026-03-01",
        endDateISO: "2026-03-05",
      });
    });

    await act(async () => {
      await result.current.handleGenerateReport();
    });

    expect(detailedReportBody).toMatchObject({
      area: "A1",
      workdayType: "Completa",
    });

    await act(async () => {
      await result.current.handleExport("excel");
      await result.current.handleExportPdfSummary();
      await result.current.handleExportPdfCompiled();
    });

    expect(excelParams[0]?.get("workdayType")).toBe("Completa");
    expect(pdfParams[0]?.get("workdayType")).toBe("Completa");
    expect(pdfParams[0]?.get("mode")).toBe("summary");
    expect(pdfParams[1]?.get("workdayType")).toBe("Completa");
    expect(pdfParams[1]?.get("mode")).toBe("compiled_detailed");
  });
});
