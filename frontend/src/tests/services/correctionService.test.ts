import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", () => ({
  authService: { getAuthHeader: () => ({ Authorization: "Bearer fixture" }) },
}));

import { correctionService } from "../../services/correctionService";
import { ApiHttpError } from "../../services/apiClient";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Spec 034, T9: `correctionService` migra a `apiClient` conservando el
 * contrato publico (mapeo de fechas, forma de la respuesta y errores con
 * status numerico).
 */
describe("correctionService sobre apiClient (spec 034 T9)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("mapea createdAt/updatedAt y conserva el total en getAll", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        requests: [
          {
            employeeId: "e1",
            timeRecordId: "t1",
            recordField: "entrada",
            requestedValue: "2026-01-01T08:00:00.000Z",
            reason: "olvido",
            createdAt: "2026-01-02T03:04:05.000Z",
            updatedAt: "2026-01-03T03:04:05.000Z",
          },
        ],
        total: 1,
      }),
    );

    const result = await correctionService.getAll({ since: 10, status: "pending" });

    expect(result.total).toBe(1);
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].createdAt).toBe(Date.parse("2026-01-02T03:04:05.000Z"));
    expect(result.requests[0].lastModified).toBe(Date.parse("2026-01-03T03:04:05.000Z"));
    expect(result.requests[0].syncStatus).toBe("synced");
    expect(result.requests[0].isDeleted).toBe(false);
  });

  it("envia los filtros en la query y omite los valores vacios", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ requests: [], total: 0 }));

    await correctionService.getAll({ since: 10, limit: 5, offset: 0, status: "pending" });

    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("since=10");
    expect(url).toContain("limit=5");
    expect(url).toContain("status=pending");
    expect(url).not.toContain("offset=");
  });

  it("hace POST del cuerpo en create y mapea la respuesta", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        employeeId: "e1",
        timeRecordId: "t1",
        recordField: "salida",
        requestedValue: "2026-01-01T18:00:00.000Z",
        reason: "prueba",
        createdAt: "2026-01-02T03:04:05.000Z",
      }),
    );

    const created = await correctionService.create({
      employeeId: "e1",
      timeRecordId: "t1",
      recordField: "salida",
      requestedValue: "2026-01-01T18:00:00.000Z",
      reason: "prueba",
    } as never);

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ employeeId: "e1", reason: "prueba" });
    expect(created.createdAt).toBe(Date.parse("2026-01-02T03:04:05.000Z"));
  });

  it("hace PATCH sobre /api/corrections/{id}/status", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        employeeId: "e1",
        timeRecordId: "t1",
        recordField: "salida",
        requestedValue: "2026-01-01T18:00:00.000Z",
        reason: "prueba",
        createdAt: "2026-01-02T03:04:05.000Z",
      }),
    );

    await correctionService.updateStatus("c9", "approved", "admin", "ok");

    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(url).toContain("/api/corrections/c9/status");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      status: "approved",
      resolvedBy: "admin",
      rejectionReason: "ok",
    });
  });

  it("devuelve las estadisticas del backend", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ pending: 2, approved: 5, rejected: 1 }));

    await expect(correctionService.getStats()).resolves.toEqual({
      pending: 2,
      approved: 5,
      rejected: 1,
    });
  });

  it("extrae la lista del historial", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [{ id: "h1" }] }));

    await expect(correctionService.getHistory("c9")).resolves.toEqual([{ id: "h1" }]);
  });

  it("lanza ApiHttpError con status numerico", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "No encontrado" }, 404));

    const error = await correctionService.getStats().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiHttpError);
    expect((error as ApiHttpError).status).toBe(404);
  });
});
