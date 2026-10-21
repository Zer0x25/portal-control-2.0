import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authTokenStore } from "../../services/authToken";
import { meterService } from "../../services/meterService";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("meterService sobre apiClient (spec 034 T9)", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("omite filtros vacíos del query para evitar 400 del backend (min(1))", async () => {
    server.use(
      http.get("http://localhost:4000/api/meters", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.has("meterId")).toBe(false);
        expect(url.searchParams.has("startDate")).toBe(false);
        expect(url.searchParams.has("endDate")).toBe(false);
        return HttpResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } });
      }),
    );

    // Se ejecuta el service; el handler de arriba verifica los filtros.
    await meterService.getPaginated(1, 50, { meterId: "", startDate: "", endDate: "" });
  });

  it("conserva filtros con valor y recorta espacios", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:4000/api/meters", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } });
      }),
    );

    await meterService.getPaginated(2, 25, {
      meterId: "  m-01 ",
      startDate: "2026-10-01",
      month: "",
    });

    expect(capturedUrl).toContain("meterId=m-01");
    expect(capturedUrl).toContain("startDate=2026-10-01");
    expect(capturedUrl).not.toContain("month=");
    expect(capturedUrl).not.toContain("endDate=");
    expect(capturedUrl).toContain("page=2");
    expect(capturedUrl).toContain("pageSize=25");
  });
});
