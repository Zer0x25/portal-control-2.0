import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { shiftReportService } from "../../services/shiftReportService";
import { ShiftReport } from "../../types/index";

describe("shiftReportService (MSW real network contract - AC3)", () => {
  afterEach(() => {
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

  it("getAll sends correct query params and receives parsed report list", async () => {
    let capturedUrl: string | null = null;
    let capturedAuth: string | null = null;

    server.use(
      http.get("*/api/shift-reports", ({ request }) => {
        capturedUrl = request.url;
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({
          success: true,
          data: [sampleReport],
          total: 1,
          page: 2,
          totalPages: 1,
        });
      }),
    );

    const result = await shiftReportService.getAll({ page: 2, pageSize: 10, status: "COMPLETADO" });

    expect(capturedUrl).toContain("page=2");
    expect(capturedUrl).toContain("pageSize=10");
    expect(capturedUrl).toContain("status=COMPLETADO");
    expect(capturedAuth).toBe("Bearer mock-jwt-token-xyz-123");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("rep-123");
  });

  it("save performs POST request and receives created report", async () => {
    let capturedBody: unknown = null;
    let capturedMethod: string | null = null;

    server.use(
      http.post("*/api/shift-reports", async ({ request }) => {
        capturedMethod = request.method;
        capturedBody = await request.json();
        return HttpResponse.json(sampleReport, { status: 201 });
      }),
    );

    const result = await shiftReportService.save(sampleReport);

    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toEqual(sampleReport);
    expect(result.id).toBe(sampleReport.id);
  });

  it("update sends PATCH request and returns updated report", async () => {
    const patchPayload: Partial<ShiftReport> = { status: "closed", endTime: "16:00" };
    let capturedMethod: string | null = null;
    let capturedBody: unknown = null;

    server.use(
      http.patch("*/api/shift-reports/:id", async ({ request }) => {
        capturedMethod = request.method;
        capturedBody = await request.json();
        return HttpResponse.json({ ...sampleReport, ...patchPayload });
      }),
    );

    const result = await shiftReportService.update("rep-123", patchPayload);

    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual(patchPayload);
    expect(result.status).toBe("closed");
    expect(result.endTime).toBe("16:00");
  });

  it("delete sends DELETE request and handles 204 No Content body", async () => {
    let capturedMethod: string | null = null;

    server.use(
      http.delete("*/api/shift-reports/:id", ({ request }) => {
        capturedMethod = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await shiftReportService.delete("rep-123");
    expect(capturedMethod).toBe("DELETE");
  });

  it("dispatches unauthorized window event when response status is 401", async () => {
    server.use(
      http.get("*/api/shift-reports", () => {
        return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
      }),
    );

    const eventListener = vi.fn();
    window.addEventListener("unauthorized", eventListener);

    await expect(shiftReportService.getAll()).rejects.toThrow();
    expect(eventListener).toHaveBeenCalledOnce();

    window.removeEventListener("unauthorized", eventListener);
  });

  it("propagates error message from backend when non-ok response is received in save", async () => {
    server.use(
      http.post("*/api/shift-reports", () => {
        return HttpResponse.json({ message: "El turno ya se encuentra cerrado" }, { status: 400 });
      }),
    );

    await expect(shiftReportService.save(sampleReport)).rejects.toThrow(
      "El turno ya se encuentra cerrado",
    );
  });

  it("handles malformed JSON body by throwing", async () => {
    server.use(
      http.get("*/api/shift-reports", () => {
        return new HttpResponse("invalid-json{", {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    await expect(shiftReportService.getAll()).rejects.toThrow();
  });
});
