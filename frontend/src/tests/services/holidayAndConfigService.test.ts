import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", () => ({
  authService: { getAuthHeader: () => ({ Authorization: "Bearer fixture" }) },
}));

import { holidayService } from "../../services/holidayService";
import { configService } from "../../services/configService";

describe("holidayService and configService anti-regression", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("holidayService.syncExternalHolidays", () => {
    it("sends specified year with json content-type header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total: 5, added: 3, skipped: 2 }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await holidayService.syncExternalHolidays(2027);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sync"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer fixture",
          }),
          body: JSON.stringify({ year: 2027 }),
        }),
      );
      expect(result).toEqual({ total: 5, added: 3, skipped: 2 });
    });

    it("defaults to current year when year argument is omitted", async () => {
      const currentYear = new Date().getFullYear();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total: 1, added: 1, skipped: 0 }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await holidayService.syncExternalHolidays();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sync"),
        expect.objectContaining({
          body: JSON.stringify({ year: currentYear }),
        }),
      );
    });

    it("throws error when sync endpoint returns non-ok status", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(holidayService.syncExternalHolidays(2026)).rejects.toThrow(
        "Error al sincronizar feriados externos",
      );
    });
  });

  describe("configService.fetchHealth", () => {
    it("extracts status and instanceId from wrapped payload (data property)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: "healthy", instanceId: "inst-123", uptime: 100 },
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const health = await configService.getHealth();
      expect(health).toEqual({
        status: "healthy",
        instanceId: "inst-123",
      });
    });

    it("extracts status and instanceId from raw payload (root object)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "degraded",
          instanceId: "inst-456",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const health = await configService.getHealth();
      expect(health).toEqual({
        status: "degraded",
        instanceId: "inst-456",
      });
    });

    it("returns null on network failure", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      const health = await configService.getHealth();
      expect(health).toBeNull();
    });
  });
});
