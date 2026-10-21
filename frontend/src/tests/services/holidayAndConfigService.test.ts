import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { holidayService } from "../../services/holidayService";
import { configService } from "../../services/configService";

describe("holidayService and configService anti-regression (MSW real network - AC3)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("holidayService.syncExternalHolidays", () => {
    it("sends specified year with json content-type header", async () => {
      let capturedBody: unknown = null;
      let capturedContentType: string | null = null;

      server.use(
        http.post("*/api/holidays/sync", async ({ request }) => {
          capturedContentType = request.headers.get("content-type");
          capturedBody = await request.json();
          return HttpResponse.json({ total: 5, added: 3, skipped: 2 });
        }),
      );

      const result = await holidayService.syncExternalHolidays(2027);

      expect(capturedContentType).toContain("application/json");
      expect(capturedBody).toEqual({ year: 2027 });
      expect(result).toEqual({ total: 5, added: 3, skipped: 2 });
    });

    it("defaults to current year when year argument is omitted", async () => {
      const currentYear = new Date().getFullYear();
      let capturedBody: unknown = null;

      server.use(
        http.post("*/api/holidays/sync", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ total: 1, added: 1, skipped: 0 });
        }),
      );

      await holidayService.syncExternalHolidays();

      expect(capturedBody).toEqual({ year: currentYear });
    });

    it("throws error when sync endpoint returns non-ok status", async () => {
      server.use(
        http.post("*/api/holidays/sync", () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      await expect(holidayService.syncExternalHolidays(2026)).rejects.toThrow(
        "Error al sincronizar feriados externos",
      );
    });
  });

  describe("configService.fetchHealth", () => {
    it("extracts status and instanceId from wrapped payload (data property)", async () => {
      server.use(
        http.get("*/health", () => {
          return HttpResponse.json({
            success: true,
            data: { status: "healthy", instanceId: "inst-123", uptime: 100 },
          });
        }),
      );

      const health = await configService.getHealth();
      expect(health).toEqual({
        status: "healthy",
        instanceId: "inst-123",
      });
    });

    it("extracts status and instanceId from raw payload (root object)", async () => {
      server.use(
        http.get("*/health", () => {
          return HttpResponse.json({
            status: "degraded",
            instanceId: "inst-456",
          });
        }),
      );

      const health = await configService.getHealth();
      expect(health).toEqual({
        status: "degraded",
        instanceId: "inst-456",
      });
    });

    it("returns null on network failure", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      server.use(
        http.get("*/health", () => {
          return HttpResponse.error();
        }),
      );

      const health = await configService.getHealth();
      expect(health).toBeNull();
    });
  });
});
