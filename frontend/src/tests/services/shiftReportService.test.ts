import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", () => ({
  authService: {
    getAuthHeader: () => ({ Authorization: "Bearer test-token" }),
  },
}));

import { shiftReportService } from "../../services/shiftReportService";
import { ShiftReport } from "../../types/index";

describe("shiftReportService HTTP timeouts and abort signals (anti-regression)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const sampleReport: ShiftReport = {
    id: "rep-123",
    folio: "FOL-001",
    date: "2026-10-14",
    shiftName: "MAÑANA",
    responsibleUser: "operador",
    startTime: "08:00",
    status: "open",
    logEntries: [],
    supplierEntries: [],
    reportCreatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastModified: Date.now(),
    syncStatus: "synced",
    isDeleted: false,
  };

  it("getAll attaches an AbortSignal with timeout to fetch options", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], total: 0, page: 1, totalPages: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await shiftReportService.getAll({ page: 2, pageSize: 10, status: "COMPLETADO" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
    expect(url).toContain("status=COMPLETADO");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("save attaches an AbortSignal with timeout to POST request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => sampleReport,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await shiftReportService.save(sampleReport);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/shift-reports");
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual(sampleReport);
    expect(result).toEqual(sampleReport);
  });

  it("update attaches an AbortSignal with timeout to PATCH request", async () => {
    const patchPayload: Partial<ShiftReport> = { status: "closed", endTime: "16:00" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleReport, ...patchPayload }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await shiftReportService.update("rep-123", patchPayload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/shift-reports/rep-123");
    expect(init.method).toBe("PATCH");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual(patchPayload);
    expect(result.status).toBe("closed");
    expect(result.endTime).toBe("16:00");
  });

  it("delete attaches an AbortSignal with timeout to DELETE request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await shiftReportService.delete("rep-123");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/shift-reports/rep-123");
    expect(init.method).toBe("DELETE");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("dispatches unauthorized window event when response status is 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const eventListener = vi.fn();
    window.addEventListener("unauthorized", eventListener);

    await expect(shiftReportService.getAll()).rejects.toThrow();
    expect(eventListener).toHaveBeenCalledOnce();

    window.removeEventListener("unauthorized", eventListener);
  });

  it("propagates error message from backend when non-ok response is received in save", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "El turno ya se encuentra cerrado" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(shiftReportService.save(sampleReport)).rejects.toThrow(
      "El turno ya se encuentra cerrado",
    );
  });
});
