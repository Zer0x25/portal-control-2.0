import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../services/authToken";
import { shiftReportService } from "../../services/shiftReportService";
import { ShiftReport } from "../../types/index";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("shiftReportService HTTP timeouts and abort signals (anti-regression)", () => {
  beforeEach(() => {
    authTokenStore.setToken("test-token");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
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

  it("getAll envia los filtros por query", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:4000/api/shift-reports", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ data: [], total: 0, page: 1, totalPages: 1 });
      }),
    );

    await shiftReportService.getAll({ page: 2, pageSize: 10, status: "COMPLETADO" });

    expect(capturedUrl).toContain("page=2");
    expect(capturedUrl).toContain("pageSize=10");
    expect(capturedUrl).toContain("status=COMPLETADO");
  });

  it("save envia POST con el body del reporte", async () => {
    let capturedMethod = "";
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:4000/api/shift-reports", async ({ request }) => {
        capturedMethod = request.method;
        capturedBody = await request.json();
        return HttpResponse.json(sampleReport, { status: 201 });
      }),
    );

    const result = await shiftReportService.save(sampleReport);

    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toEqual(sampleReport);
    expect(result).toEqual(sampleReport);
  });

  it("update envia PATCH con el payload parcial", async () => {
    const patchPayload: Partial<ShiftReport> = { status: "closed", endTime: "16:00" };
    let capturedMethod = "";
    let capturedUrl = "";
    let capturedBody: unknown;
    server.use(
      http.patch("http://localhost:4000/api/shift-reports/rep-123", async ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        capturedBody = await request.json();
        return HttpResponse.json({ ...sampleReport, ...patchPayload });
      }),
    );

    const result = await shiftReportService.update("rep-123", patchPayload);

    expect(capturedUrl).toContain("/shift-reports/rep-123");
    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual(patchPayload);
    expect(result.status).toBe("closed");
    expect(result.endTime).toBe("16:00");
  });

  it("delete envia DELETE al endpoint del reporte", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    server.use(
      http.delete("http://localhost:4000/api/shift-reports/rep-123", ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await shiftReportService.delete("rep-123");

    expect(capturedUrl).toContain("/shift-reports/rep-123");
    expect(capturedMethod).toBe("DELETE");
  });

  it("dispatches unauthorized window event cuando el backend responde 401", async () => {
    server.use(
      http.get("http://localhost:4000/api/shift-reports", () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
      ),
    );

    const eventListener = vi.fn();
    window.addEventListener("unauthorized", eventListener);

    await expect(shiftReportService.getAll()).rejects.toThrow();

    expect(eventListener).toHaveBeenCalledOnce();

    window.removeEventListener("unauthorized", eventListener);
  });

  it("propaga el mensaje del backend cuando la respuesta no es ok en save", async () => {
    server.use(
      http.post("http://localhost:4000/api/shift-reports", () =>
        HttpResponse.json({ message: "El turno ya se encuentra cerrado" }, { status: 400 }),
      ),
    );

    await expect(shiftReportService.save(sampleReport)).rejects.toThrow(
      "El turno ya se encuentra cerrado",
    );
  });
});
