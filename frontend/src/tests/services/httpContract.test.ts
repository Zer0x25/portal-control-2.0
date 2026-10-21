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
});
