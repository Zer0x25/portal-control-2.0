import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", () => ({
  authService: { getAuthHeader: () => ({ Authorization: "Bearer fixture" }) },
}));

import { auditLogService } from "../../services/auditLogService";
import { ApiHttpError } from "../../services/apiClient";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Spec 034, T9: `auditLogService` migra a `apiClient` conservando el contrato
 * publico: filtros dinamicos (repetidos), mapeo de `details` y errores con
 * status numerico.
 */
describe("auditLogService sobre apiClient (spec 034 T9)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("repite los filtros con array y renombra actorUsername a actor", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1 }));

    await auditLogService.getAll({
      page: 2,
      pageSize: 25,
      filters: { category: ["access", "admin"], actorUsername: "juan" },
      sortBy: "timestamp",
      sortOrder: "desc",
    });

    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("category=access");
    expect(url).toContain("category=admin");
    expect(url).toContain("actor=juan");
    expect(url).not.toContain("actorUsername");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=25");
    expect(url).toContain("sortOrder=desc");
  });

  it("mapea los items y parsea el details serializado", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        items: [
          { id: "l1", action: "login", details: '{"ip":"10.0.0.1"}' },
          { id: "l2", action: "logout", details: "ATENCION" },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      }),
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
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Limpieza completada" }));

    const result = await auditLogService.cleanup(3);

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ months: 3 });
    expect(result.message).toBe("Limpieza completada");
  });

  it("desenvuelve el estado de integridad", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: { status: "ok", lastRunAt: null, lastCheckedCount: 10 } }),
    );

    const status = await auditLogService.getIntegrityStatus();

    expect(status.status).toBe("ok");
    expect(status.lastCheckedCount).toBe(10);
  });

  it("lanza ApiHttpError con status numerico", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Sin permiso" }, 403));

    const error = await auditLogService.verifyIntegrity().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiHttpError);
    expect((error as ApiHttpError).status).toBe(403);
  });
});
