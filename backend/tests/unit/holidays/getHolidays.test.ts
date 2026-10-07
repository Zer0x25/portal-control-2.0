import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HolidayService } from "../../../src/services/HolidayService";
import prisma from "../../../src/services/db";
import { auditService } from "../../../src/services/auditService";
import { SocketService } from "../../../src/services/socketService";
import type { Holiday } from "../../../src/generated/prisma/client";

vi.mock("../../../src/services/db", () => ({
  default: { holiday: { findMany: vi.fn(), count: vi.fn(), upsert: vi.fn() } },
}));
vi.mock("../../../src/services/auditService", () => ({
  auditService: { log: vi.fn() },
}));
vi.mock("../../../src/services/socketService", () => ({
  SocketService: { emit: vi.fn() },
}));
vi.mock("ulid", () => ({ ulid: () => "holiday-fixture-id" }));

const fixedInstant = new Date("2026-01-01T02:00:00Z");

function holiday(date: string, name = "Feriado", type = "Nacional"): Holiday {
  return { id: date, date, name, type, createdAt: fixedInstant, updatedAt: fixedInstant };
}

function enriched(row: Holiday) {
  return {
    ...row,
    lastModified: row.updatedAt.getTime(),
    syncStatus: "synced",
    isDeleted: false,
  };
}

describe("HolidayService.getHolidays: caracterización B1–B6", () => {
  let service: HolidayService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedInstant);
    vi.stubEnv("TZ", "UTC");
    vi.stubEnv("DISABLE_HOLIDAY_AUTOSYNC", "true");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected external request")));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    service = new HolidayService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("B1: consulta no paginada filtra por día chileno y conserva orden y metadatos", async () => {
    // Prisma aplica el filtro/orden; este test caracteriza el contrato que recibe.
    const rows = [holiday("2026-01-01", "Año Nuevo"), holiday("2025-12-31")];
    vi.mocked(prisma.holiday.findMany).mockResolvedValue(rows);

    expect(await service.getHolidays()).toEqual(rows.map(enriched));
    expect(prisma.holiday.findMany).toHaveBeenCalledWith({
      where: { date: { gte: "2025-12-31" } },
      orderBy: { date: "desc" },
    });
    expect(prisma.holiday.count).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("B2: búsqueda y archivados conservan offset, límite y total filtrado", async () => {
    const row = holiday("2024-01-01", "Año Nuevo");
    const where = {
      OR: [
        { name: { contains: "Año", mode: "insensitive" } },
        { type: { contains: "Año", mode: "insensitive" } },
      ],
    };
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([row]);
    vi.mocked(prisma.holiday.count).mockResolvedValue(21);

    expect(
      await service.getHolidays({ page: 2, pageSize: 10, search: "  Año  ", showArchived: true }),
    ).toEqual({
      data: [enriched(row)],
      meta: { total: 21, page: 2, pageSize: 10, totalPages: 3 },
    });
    expect(prisma.holiday.findMany).toHaveBeenCalledWith({
      where,
      orderBy: { date: "desc" },
      skip: 10,
      take: 10,
    });
    expect(prisma.holiday.count).toHaveBeenCalledWith({ where });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("B3: delta filtra updatedAt, incluye fechas pasadas y omite autosync", async () => {
    vi.stubEnv("DISABLE_HOLIDAY_AUTOSYNC", "false");
    const row = holiday("2024-01-01");
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([row]);

    expect(await service.getHolidays({ since: String(fixedInstant.getTime()) })).toEqual([
      enriched(row),
    ]);
    expect(prisma.holiday.findMany).toHaveBeenCalledWith({
      where: { updatedAt: { gte: fixedInstant } },
      orderBy: { date: "desc" },
    });
    expect(prisma.holiday.count).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("B4: autosync usa año del host, preserva efectos y repite consulta con los filtros", async () => {
    vi.stubEnv("DISABLE_HOLIDAY_AUTOSYNC", "false");
    const row = holiday("2026-01-01", "Año Nuevo");
    vi.mocked(prisma.holiday.findMany).mockResolvedValueOnce([]).mockResolvedValueOnce([row]);
    vi.mocked(prisma.holiday.count).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    vi.mocked(prisma.holiday.upsert).mockResolvedValue(row);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: [{ date: row.date, title: row.name, inalienable: true }],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    const query = {
      where: { date: { gte: "2025-12-31" } },
      orderBy: { date: "desc" },
      skip: 0,
      take: 10,
    };

    expect(await service.getHolidays({ page: 1, pageSize: 10 })).toEqual({
      data: [enriched(row)],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    });
    expect(prisma.holiday.count).toHaveBeenNthCalledWith(1, {
      where: { date: { startsWith: "2026-" } },
    });
    expect(fetch).toHaveBeenCalledExactlyOnceWith("https://api.boostr.cl/holidays/2026.json");
    expect(prisma.holiday.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.holiday.findMany).toHaveBeenNthCalledWith(1, query);
    expect(prisma.holiday.findMany).toHaveBeenNthCalledWith(2, query);
    expect(prisma.holiday.count).toHaveBeenNthCalledWith(2, { where: query.where });
    expect(prisma.holiday.upsert).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith({
      actorUsername: "SYSTEM",
      action: "HOLIDAY_SYNC",
      category: "OPERATIONS",
      details: { count: 1, year: 2026 },
    });
    expect(SocketService.emit).toHaveBeenCalledWith("holiday:updated", { type: "sync", count: 1 });
  });

  it.each([
    { condition: "año presente", disabled: "false", expectedCountCalls: 1 },
    { condition: "autosync deshabilitado", disabled: "true", expectedCountCalls: 0 },
  ])("B5: $condition no inicia sincronización", async ({ disabled, expectedCountCalls }) => {
    vi.stubEnv("DISABLE_HOLIDAY_AUTOSYNC", disabled);
    const row = holiday("2026-01-01");
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([row]);
    vi.mocked(prisma.holiday.count).mockResolvedValue(1);

    expect(await service.getHolidays()).toEqual([enriched(row)]);
    expect(prisma.holiday.count).toHaveBeenCalledTimes(expectedCountCalls);
    expect(fetch).not.toHaveBeenCalled();
    expect(prisma.holiday.upsert).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
    expect(SocketService.emit).not.toHaveBeenCalled();
  });

  it("B6: fallo del proveedor propaga el error original sin segunda lectura ni efectos de éxito", async () => {
    vi.stubEnv("DISABLE_HOLIDAY_AUTOSYNC", "false");
    const failure = new Error("Provider unavailable");
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([]);
    vi.mocked(prisma.holiday.count).mockResolvedValue(0);
    vi.mocked(fetch).mockRejectedValue(failure);

    await expect(service.getHolidays()).rejects.toBe(failure);
    expect(fetch).toHaveBeenCalledExactlyOnceWith("https://api.boostr.cl/holidays/2026.json");
    expect(prisma.holiday.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.holiday.upsert).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
    expect(SocketService.emit).not.toHaveBeenCalled();
  });
});
