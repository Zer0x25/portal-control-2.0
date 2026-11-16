import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { authTokenStore } from "../../../services/authToken";
import { useMasterDataExportController } from "../../../features/configuration/hooks/useMasterDataExportController";
import { server } from "../../mocks/server";

const { addToastMock, triggerBrowserDownloadMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  triggerBrowserDownloadMock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../utils/triggerBrowserDownload", () => ({
  triggerBrowserDownload: (...args: unknown[]) => triggerBrowserDownloadMock(...args),
}));

describe("useMasterDataExportController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authTokenStore.setToken("master-jwt");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("descarga CSV via Authorization Bearer sin token en query y resetea exporting en finally", async () => {
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:4000/api/records/export", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return new HttpResponse(new Blob(["a,b"], { type: "text/csv" }), {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="nomina.csv"' },
        });
      }),
    );

    const { result } = renderHook(() => useMasterDataExportController());

    act(() => {
      result.current.handleStartDateChange("2026-03-01");
      result.current.setEndDate("2026-03-05");
    });

    await act(async () => {
      await result.current.handleExport("csv");
    });

    expect(capturedAuth).toBe("Bearer master-jwt");
    expect(capturedUrl).toContain("startDate=2026-03-01");
    expect(capturedUrl).toContain("endDate=2026-03-05");
    expect(capturedUrl).toContain("format=csv");
    expect(capturedUrl).not.toContain("token=");
    expect(triggerBrowserDownloadMock).toHaveBeenCalledWith(expect.any(Blob), "nomina.csv");
    expect(result.current.exporting).toBe(false);
    expect(addToastMock).toHaveBeenCalledWith("Descarga de CSV iniciada.", "success");
  });

  it("muestra error y libera exporting en finally cuando falla la descarga", async () => {
    server.use(
      http.get("http://localhost:4000/api/records/export", () =>
        HttpResponse.json({ message: "Export fallido" }, { status: 400 }),
      ),
    );

    const { result } = renderHook(() => useMasterDataExportController());

    act(() => {
      result.current.handleStartDateChange("2026-03-01");
      result.current.setEndDate("2026-03-05");
    });

    await act(async () => {
      await result.current.handleExport("xml");
    });

    expect(triggerBrowserDownloadMock).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining("Export fallido"), "error");
  });
});
