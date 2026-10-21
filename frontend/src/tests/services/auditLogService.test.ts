import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "../../services/authToken";
import { auditLogService } from "../../services/auditLogService";
import { ApiHttpError } from "../../services/apiClient";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("auditLogService sobre apiClient (spec 034 T9)", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("repite los filtros con array y renombra actorUsername a actor", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:4000/api/audit-logs", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ items: [], total: 0, page: 1 });
      }),
    );

    await auditLogService.getAll({
      page: 2,
      pageSize: 25,
      filters: { category: ["access", "admin"], actorUsername: "juan" },
      sortBy: "timestamp",
      sortOrder: "desc",
    });

    expect(capturedUrl).toContain("category=access");
    expect(capturedUrl).toContain("category=admin");
    expect(capturedUrl).toContain("actor=juan");
    expect(capturedUrl).not.toContain("actorUsername");
    expect(capturedUrl).toContain("page=2");
    expect(capturedUrl).toContain("pageSize=25");
    expect(capturedUrl).toContain("sortOrder=desc");
  });

  it("mapea los items y parsea el details serializado", async () => {
    server.use(
      http.get("http://localhost:4000/api/audit-logs", () =>
        HttpResponse.json({
          items: [
            { id: "l1", action: "login", details: '{"ip":"10.0.0.1"}' },
            { id: "l2", action: "logout", details: "ATENCION" },
          ],
          total: 2,
          page: 1,
          totalPages: 1,
        }),
      ),
    );

    const result = await auditLogService.getAll({ page: 1, pageSize: 50, filters: {} });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].details).toEqual({ ip: "10.0.0.1" });
    // Un details que no es JSON se envuelve para encajar en el schema.
    expect(result.data[1].details).toEqual({ message: "ATENCION" });
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("envia los meses en el cuerpo de cleanup", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:4000/api/audit-logs/cleanup", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: "Limpieza completada" });
      }),
    );

    const result = await auditLogService.cleanup(3);

    expect(capturedBody).toEqual({ months: 3 });
    expect(result.message).toBe("Limpieza completada");
  });

  it("desenvuelve el estado de integridad", async () => {
    server.use(
      http.get("http://localhost:4000/api/audit-logs/integrity-status", () =>
        HttpResponse.json({ data: { status: "ok", lastRunAt: null, lastCheckedCount: 10 } }),
      ),
    );

    const status = await auditLogService.getIntegrityStatus();

    expect(status.status).toBe("ok");
    expect(status.lastCheckedCount).toBe(10);
  });

  it("lanza ApiHttpError con status numerico", async () => {
    server.use(
      http.get("http://localhost:4000/api/audit-logs/verify-integrity", () =>
        HttpResponse.json({ message: "Sin permiso" }, { status: 403 }),
      ),
    );

    const error = await auditLogService.verifyIntegrity().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiHttpError);
    expect((error as ApiHttpError).status).toBe(403);
  });
});
