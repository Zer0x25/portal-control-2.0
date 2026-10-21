import { afterEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { meterService } from "../../services/meterService";

afterEach(() => {
  vi.restoreAllMocks();
});

it("omite filtros vacíos del query para evitar 400 del backend (min(1)) (MSW real network)", async () => {
  let capturedUrl: string | null = null;

  server.use(
    http.get("*/api/meters", ({ request }) => {
      capturedUrl = request.url;
      return HttpResponse.json({
        data: [],
        pagination: { total: 0, page: 1, totalPages: 1 },
      });
    }),
  );

  await meterService.getPaginated(1, 50, { meterId: "", startDate: "", endDate: "" });

  expect(capturedUrl).not.toBeNull();
  expect(capturedUrl).toContain("page=1");
  expect(capturedUrl).toContain("pageSize=50");
  expect(capturedUrl).not.toContain("meterId=");
  expect(capturedUrl).not.toContain("startDate=");
  expect(capturedUrl).not.toContain("endDate=");
});

it("conserva filtros con valor y recorta espacios (MSW real network)", async () => {
  let capturedUrl: string | null = null;

  server.use(
    http.get("*/api/meters", ({ request }) => {
      capturedUrl = request.url;
      return HttpResponse.json({
        data: [],
        pagination: { total: 0, page: 1, totalPages: 1 },
      });
    }),
  );

  await meterService.getPaginated(2, 25, {
    meterId: "  m-01 ",
    startDate: "2026-10-01",
    month: "",
  });

  expect(capturedUrl).not.toBeNull();
  expect(capturedUrl).toContain("meterId=m-01");
  expect(capturedUrl).toContain("startDate=2026-10-01");
  expect(capturedUrl).not.toContain("month=");
  expect(capturedUrl).not.toContain("endDate=");
});
