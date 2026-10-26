import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "../../services/authToken";
import { request as apiRequest, ApiHttpError } from "../../services/apiClient";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

/**
 * Contrato de transporte HTTP (spec 035, T8, AC3).
 *
 * Estas afirmaciones son las que antes quedaban implícitas en los mocks de
 * módulo (`vi.stubGlobal("fetch")`): un 401 produce `ApiHttpError` con
 * `status === 401`, un 204 produce body vacío y un body malformado produce
 * un error tipado. Con MSW se ejercitan contra el cliente real.
 */
describe("contrato HTTP de apiClient (spec 035 T8)", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    (
      window as Window & { __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean }
    ).__PORTAL_SYNC_PERF_DIAGNOSTICS__ = false;
    server.resetHandlers();
  });

  it("un 401 produce ApiHttpError con status === 401", async () => {
    server.use(
      http.get("http://localhost:4000/api/audit-logs/integrity-status", () =>
        HttpResponse.json({ message: "Sin permiso" }, { status: 401 }),
      ),
    );

    const error = await apiRequest({
      method: "GET",
      url: "/api/audit-logs/integrity-status",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiHttpError);
    expect((error as ApiHttpError).status).toBe(401);
  });

  it("un 204 produce body vacio (undefined) sin lanzar", async () => {
    server.use(
      http.get(
        "http://localhost:4000/api/audit-logs/integrity-status",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const result = await apiRequest({
      method: "GET",
      url: "/api/audit-logs/integrity-status",
    });

    expect(result).toBeUndefined();
  });

  it("un body malformado produce un error tipado (SyntaxError)", async () => {
    server.use(
      http.get(
        "http://localhost:4000/api/audit-logs/integrity-status",
        () =>
          new HttpResponse("{not json", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const error = await apiRequest({
      method: "GET",
      url: "/api/audit-logs/integrity-status",
    }).catch((e: unknown) => e);

    // El cliente no puede parsear el cuerpo: el error que propaga es tipado
    // (SyntaxError), no un fallo silencioso.
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("SyntaxError");
  });

  it("emite marcas internas de readiness solo con el diagnóstico optativo", async () => {
    const diagnosticsWindow = window as Window & {
      __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean;
    };
    diagnosticsWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = true;
    const stages: Array<{ stage: string; atMs: number }> = [];
    const captureStage = (event: Event): void => {
      stages.push((event as CustomEvent<(typeof stages)[number]>).detail);
    };
    window.addEventListener("portal:readiness-api-client-stage", captureStage);
    server.use(
      http.get("http://localhost:4000/api/health/ready", () =>
        HttpResponse.json({ success: true, data: { status: "healthy" } }),
      ),
    );

    try {
      await apiRequest({
        method: "GET",
        url: "/api/health/ready",
        retry: false,
      });
      expect(stages.map(({ stage }) => stage)).toEqual(["fetch-resolved", "read-body-resolved"]);
      expect(stages.every(({ atMs }) => Number.isFinite(atMs))).toBe(true);

      diagnosticsWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = false;
      stages.length = 0;
      await apiRequest({
        method: "GET",
        url: "/api/health/ready",
        retry: false,
      });
      expect(stages).toHaveLength(0);
    } finally {
      window.removeEventListener("portal:readiness-api-client-stage", captureStage);
      diagnosticsWindow.__PORTAL_SYNC_PERF_DIAGNOSTICS__ = false;
    }
  });
});
