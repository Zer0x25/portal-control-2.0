import { afterEach, expect, it, vi } from "vitest";
vi.mock("../../services/authToken", () => ({
  authTokenStore: {
    getToken: () => "fixture",
    setToken: vi.fn(),
    removeToken: vi.fn(),
    getAuthHeader: () => ({ Authorization: "Bearer fixture" }),
  },
}));
vi.mock("../../services/authService", () => ({
  authService: { getAuthHeader: () => ({ Authorization: "Bearer fixture" }) },
}));
import { meterService } from "../../services/meterService";

afterEach(() => vi.unstubAllGlobals());

it("omite filtros vacíos del query para evitar 400 del backend (min(1))", async () => {
  const request = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } }),
  });
  vi.stubGlobal("fetch", request);

  await meterService.getPaginated(1, 50, { meterId: "", startDate: "", endDate: "" });

  const url = String(request.mock.calls[0][0]);
  expect(url).toContain("page=1");
  expect(url).toContain("pageSize=50");
  expect(url).not.toContain("meterId=");
  expect(url).not.toContain("startDate=");
  expect(url).not.toContain("endDate=");
});

it("conserva filtros con valor y recorta espacios", async () => {
  const request = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } }),
  });
  vi.stubGlobal("fetch", request);

  await meterService.getPaginated(2, 25, {
    meterId: "  m-01 ",
    startDate: "2026-10-01",
    month: "",
  });

  const url = String(request.mock.calls[0][0]);
  expect(url).toContain("meterId=m-01");
  expect(url).toContain("startDate=2026-10-01");
  expect(url).not.toContain("month=");
  expect(url).not.toContain("endDate=");
});
