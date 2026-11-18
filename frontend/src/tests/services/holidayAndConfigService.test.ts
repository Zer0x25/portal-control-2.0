import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../services/authToken";
import { holidayService } from "../../services/holidayService";
import { leaveService } from "../../services/leaveService";
import { configService } from "../../services/configService";
import { ApiHttpError } from "../../services/apiClient";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("holidayService and configService anti-regression", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  describe("holidayService.syncExternalHolidays", () => {
    it("sends specified year with json content-type header", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      let capturedContentType: string | null = null;
      server.use(
        http.post("http://localhost:4000/api/holidays/sync", async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          capturedContentType = request.headers.get("content-type");
          return HttpResponse.json({ success: true, total: 5, year: 2027 });
        }),
      );

      const result = await holidayService.syncExternalHolidays(2027);

      expect(capturedUrl).toContain("/sync");
      expect(capturedContentType).toContain("application/json");
      expect(capturedBody).toEqual({ year: 2027 });
      expect(result).toEqual({ success: true, total: 5, year: 2027 });
    });

    it("defaults to current year when year argument is omitted", async () => {
      let capturedBody: unknown;
      server.use(
        http.post("http://localhost:4000/api/holidays/sync", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ success: true, total: 1, year: new Date().getFullYear() });
        }),
      );

      const currentYear = new Date().getFullYear();
      await holidayService.syncExternalHolidays();

      expect(capturedBody).toEqual({ year: currentYear });
    });

    it("propaga el status del backend cuando la sincronizacion falla (spec 034 T13)", async () => {
      server.use(
        http.post("http://localhost:4000/api/holidays/sync", () =>
          HttpResponse.json({ message: "No se pudo sincronizar" }, { status: 500 }),
        ),
      );

      const error = await holidayService.syncExternalHolidays(2026).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiHttpError);
      expect((error as ApiHttpError).status).toBe(500);
      expect((error as ApiHttpError).message).toBe("No se pudo sincronizar");
    });
  });

  describe("holidayService.create & update with isRenounceable", () => {
    it("sends isRenounceable flag on create and update", async () => {
      const capturedBodies: unknown[] = [];
      server.use(
        http.post("http://localhost:4000/api/holidays", async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          capturedBodies.push(body);
          return HttpResponse.json({
            id: body.id ?? "h-1",
            name: body.name,
            date: body.date,
            type: body.type,
            isRenounceable: Boolean(body.isRenounceable),
            lastModified: 1,
            syncStatus: "synced",
            isDeleted: false,
          });
        }),
      );

      const created = await holidayService.create({
        name: "Navidad",
        date: "2026-12-25",
        type: "Nacional",
        isRenounceable: true,
      });
      expect(created.isRenounceable).toBe(true);

      const updated = await holidayService.update("h-1", { isRenounceable: false });
      expect(updated.isRenounceable).toBe(false);
      expect(capturedBodies).toEqual([
        { name: "Navidad", date: "2026-12-25", type: "Nacional", isRenounceable: true },
        { id: "h-1", isRenounceable: false },
      ]);
    });
  });

  describe("leaveService.getLeaves filters", () => {
    it("forwards type and search query params to GET /api/leaves", async () => {
      let capturedSearchParams: URLSearchParams | null = null;
      server.use(
        http.get("http://localhost:4000/api/leaves", ({ request }) => {
          capturedSearchParams = new URL(request.url).searchParams;
          return HttpResponse.json({
            data: [],
            meta: { total: 0, page: 1, pageSize: 50, totalPages: 1 },
          });
        }),
      );

      await leaveService.getLeaves({
        page: 1,
        pageSize: 50,
        type: "Vacaciones",
        search: "Ana",
      });

      expect(capturedSearchParams?.get("type")).toBe("Vacaciones");
      expect(capturedSearchParams?.get("search")).toBe("Ana");
    });
  });

  describe("configService.getHealth", () => {
    it("extracts status and instanceId from wrapped payload (data property)", async () => {
      server.use(
        http.get("http://localhost:4000/api/health", () =>
          HttpResponse.json({
            success: true,
            data: { status: "healthy", instanceId: "inst-123", uptime: 100 },
          }),
        ),
      );

      const health = await configService.getHealth();
      expect(health).toEqual({ status: "healthy", instanceId: "inst-123" });
    });

    it("extracts status and instanceId from raw payload (root object)", async () => {
      server.use(
        http.get("http://localhost:4000/api/health", () =>
          HttpResponse.json({ status: "degraded", instanceId: "inst-456" }),
        ),
      );

      const health = await configService.getHealth();
      expect(health).toEqual({ status: "degraded", instanceId: "inst-456" });
    });

    it("returns null on network failure", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      server.use(http.get("http://localhost:4000/api/health", () => HttpResponse.error()));

      const health = await configService.getHealth();
      expect(health).toBeNull();
    });
  });

  describe("configService: logo y reglamento no configurados (spec 034 T13)", () => {
    it("devuelve null sin lanzar cuando no hay logo configurado (200 + null)", async () => {
      server.use(
        http.get("http://localhost:4000/api/configs/public/brand-logo", () =>
          HttpResponse.json(null),
        ),
      );

      await expect(configService.getPublicBrandLogo()).resolves.toBeNull();
    });

    it("devuelve null sin lanzar cuando no hay reglamento configurado (200 + null)", async () => {
      server.use(
        http.get("http://localhost:4000/api/configs/public/company-policy", () =>
          HttpResponse.json(null),
        ),
      );

      await expect(configService.getPublicCompanyPolicy()).resolves.toBeNull();
    });

    it("no cierra la sesion si el endpoint publico responde 404", async () => {
      server.use(
        http.get("http://localhost:4000/api/configs/public/brand-logo", () =>
          HttpResponse.json({ message: "No hay logo" }, { status: 404 }),
        ),
      );
      const unauthorized = vi.fn();
      window.addEventListener("unauthorized", unauthorized);

      await expect(configService.getPublicBrandLogo()).resolves.toBeNull();

      expect(unauthorized).not.toHaveBeenCalled();
      window.removeEventListener("unauthorized", unauthorized);
    });
  });

  describe("configService: uploads multipart (spec 034 T2/T13)", () => {
    it("sube el logo como multipart sin Content-Type manual", async () => {
      let capturedContentType: string | null = null;
      server.use(
        http.post("http://localhost:4000/api/configs/brand-logo", async ({ request }) => {
          capturedContentType = request.headers.get("content-type");
          return HttpResponse.json({
            source: { kind: "upload", ref: "logo.png" },
            width: 10,
            height: 20,
          });
        }),
      );

      await configService.uploadBrandLogo(new File(["fixture"], "logo.png"));

      // El boundary lo fija el transporte (no el cliente): enviarlo a mano rompe el upload.
      expect(capturedContentType).toMatch(/boundary=/);
    });
  });
});
