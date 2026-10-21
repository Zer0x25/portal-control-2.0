import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "../../services/authToken";
import { correctionService } from "../../services/correctionService";
import { ApiHttpError } from "../../services/apiClient";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("correctionService sobre apiClient (spec 034 T9)", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("mapea createdAt/updatedAt y conserva el total en getAll", async () => {
    server.use(
      http.get("http://localhost:4000/api/corrections", () =>
        HttpResponse.json({
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
      ),
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
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:4000/api/corrections", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ requests: [], total: 0 });
      }),
    );

    await correctionService.getAll({ since: 10, limit: 5, offset: 0, status: "pending" });

    expect(capturedUrl).toContain("since=10");
    expect(capturedUrl).toContain("limit=5");
    expect(capturedUrl).toContain("status=pending");
    expect(capturedUrl).not.toContain("offset=");
  });

  it("hace POST del cuerpo en create y mapea la respuesta", async () => {
    let capturedMethod = "";
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:4000/api/corrections", async ({ request }) => {
        capturedMethod = request.method;
        capturedBody = await request.json();
        return HttpResponse.json({
          employeeId: "e1",
          timeRecordId: "t1",
          recordField: "salida",
          requestedValue: "2026-01-01T18:00:00.000Z",
          reason: "prueba",
          createdAt: "2026-01-02T03:04:05.000Z",
        });
      }),
    );

    const created = await correctionService.create({
      employeeId: "e1",
      timeRecordId: "t1",
      recordField: "salida",
      requestedValue: "2026-01-01T18:00:00.000Z",
      reason: "prueba",
    } as never);

    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toMatchObject({ employeeId: "e1", reason: "prueba" });
    expect(created.createdAt).toBe(Date.parse("2026-01-02T03:04:05.000Z"));
  });

  it("hace PATCH sobre /api/corrections/{id}/status", async () => {
    let capturedMethod = "";
    let capturedUrl = "";
    let capturedBody: unknown;
    server.use(
      http.patch("http://localhost:4000/api/corrections/c9/status", async ({ request }) => {
        capturedMethod = request.method;
        capturedUrl = request.url;
        capturedBody = await request.json();
        return HttpResponse.json({
          employeeId: "e1",
          timeRecordId: "t1",
          recordField: "salida",
          requestedValue: "2026-01-01T18:00:00.000Z",
          reason: "prueba",
          createdAt: "2026-01-02T03:04:05.000Z",
        });
      }),
    );

    await correctionService.updateStatus("c9", "approved", "admin", "ok");

    expect(capturedUrl).toContain("/api/corrections/c9/status");
    expect(capturedMethod).toBe("PATCH");
    expect(capturedBody).toEqual({
      status: "approved",
      resolvedBy: "admin",
      rejectionReason: "ok",
    });
  });

  it("devuelve las estadisticas del backend", async () => {
    server.use(
      http.get("http://localhost:4000/api/corrections/stats", () =>
        HttpResponse.json({ pending: 2, approved: 5, rejected: 1 }),
      ),
    );

    await expect(correctionService.getStats()).resolves.toEqual({
      pending: 2,
      approved: 5,
      rejected: 1,
    });
  });

  it("extrae la lista del historial", async () => {
    server.use(
      http.get("http://localhost:4000/api/corrections/c9/history", () =>
        HttpResponse.json({ data: [{ id: "h1" }] }),
      ),
    );

    await expect(correctionService.getHistory("c9")).resolves.toEqual([{ id: "h1" }]);
  });

  it("lanza ApiHttpError con status numerico", async () => {
    server.use(
      http.get("http://localhost:4000/api/corrections/stats", () =>
        HttpResponse.json({ message: "No encontrado" }, { status: 404 }),
      ),
    );

    const error = await correctionService.getStats().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiHttpError);
    expect((error as ApiHttpError).status).toBe(404);
  });
});
