import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/authService", () => ({
  authService: { getAuthHeader: () => ({ Authorization: "Bearer fixture" }) },
}));

import { holidayService } from "../../services/holidayService";
import { configService } from "../../services/configService";
import { ApiHttpError } from "../../services/apiClient";
import { jsonResponse } from "../helpers/mockResponse";

describe("holidayService and configService anti-regression", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("holidayService.syncExternalHolidays", () => {
    it("sends specified year with json content-type header", async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ total: 5, added: 3, skipped: 2 }));
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
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ total: 1, added: 1, skipped: 0 }));
      vi.stubGlobal("fetch", mockFetch);

      await holidayService.syncExternalHolidays();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/sync"),
        expect.objectContaining({
          body: JSON.stringify({ year: currentYear }),
        }),
      );
    });

    it("propaga el status del backend cuando la sincronizacion falla (spec 034 T13)", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ message: "No se pudo sincronizar" }, 500));
      vi.stubGlobal("fetch", mockFetch);

      const error = await holidayService.syncExternalHolidays(2026).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiHttpError);
      expect((error as ApiHttpError).status).toBe(500);
      expect((error as ApiHttpError).message).toBe("No se pudo sincronizar");
    });
  });

  describe("configService.fetchHealth", () => {
    it("extracts status and instanceId from wrapped payload (data property)", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: { status: "healthy", instanceId: "inst-123", uptime: 100 },
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      const health = await configService.getHealth();
      expect(health).toEqual({
        status: "healthy",
        instanceId: "inst-123",
      });
    });

    it("extracts status and instanceId from raw payload (root object)", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        jsonResponse({
          status: "degraded",
          instanceId: "inst-456",
        }),
      );
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

  describe("configService: logo y reglamento no configurados (spec 034 T13)", () => {
    it("devuelve null sin lanzar cuando no hay logo configurado (200 + null)", async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(null));
      vi.stubGlobal("fetch", mockFetch);

      await expect(configService.getPublicBrandLogo()).resolves.toBeNull();
    });

    it("devuelve null sin lanzar cuando no hay reglamento configurado (200 + null)", async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse(null));
      vi.stubGlobal("fetch", mockFetch);

      await expect(configService.getPublicCompanyPolicy()).resolves.toBeNull();
    });

    it("no cierra la sesion si el endpoint publico responde 404", async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ message: "No hay logo" }, 404));
      vi.stubGlobal("fetch", mockFetch);
      const unauthorized = vi.fn();
      window.addEventListener("unauthorized", unauthorized);

      await expect(configService.getPublicBrandLogo()).resolves.toBeNull();

      expect(unauthorized).not.toHaveBeenCalled();
      window.removeEventListener("unauthorized", unauthorized);
    });
  });

  describe("configService: uploads multipart (spec 034 T2/T13)", () => {
    it("sube el logo como multipart sin Content-Type manual", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ source: { kind: "upload", ref: "logo.png" }, width: 10, height: 20 }),
        );
      vi.stubGlobal("fetch", mockFetch);

      await configService.uploadBrandLogo(new File(["fixture"], "logo.png"));

      const init = mockFetch.mock.calls[0][1] as RequestInit;
      expect(init.body).toBeInstanceOf(FormData);
      expect(new Headers(init.headers).get("content-type")).toBeNull();
    });
  });
});
