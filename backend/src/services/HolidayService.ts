import prisma from "./db";
import { Prisma } from "../generated/prisma/client";
import { ulid } from "ulid";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { toBusinessDateChile } from "../utils/timeUtils";

/** Payload fields `upsertHoliday` reads. */
export interface HolidayUpsertData {
  id?: string;
  date: string;
  name: string;
  type?: string | null;
}

/** Row shape of a bulk import; same fields as an upsert payload. */
export interface BulkHolidayInput {
  id?: string;
  date: string;
  name: string;
  type?: string | null;
}

export class HolidayService {
  /**
   * Obtiene los feriados del sistema, permitiendo filtrado delta.
   */
  async getHolidays(
    options: {
      since?: string;
      page?: number;
      pageSize?: number;
      search?: string;
      showArchived?: boolean;
    } = {},
  ) {
    const { since, page, pageSize, search, showArchived } = options;
    const where: Prisma.HolidayWhereInput = {};
    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gte: sinceDate };
      }
    }
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { type: { contains: search.trim(), mode: "insensitive" } },
      ];
    }
    if (!showArchived && !since) {
      const today = toBusinessDateChile();
      where.date = { gte: today };
    }

    const isPaginated = page !== undefined && pageSize !== undefined;
    const queryArgs: Prisma.HolidayFindManyArgs = { where, orderBy: { date: "desc" } };
    if (isPaginated) {
      queryArgs.skip = (page - 1) * pageSize;
      queryArgs.take = pageSize;
    }

    let holidays = await prisma.holiday.findMany(queryArgs);

    // Auto-sync: Si no hay feriados para el año actual, sincronizar automáticamente
    const disableHolidayAutosync = process.env.DISABLE_HOLIDAY_AUTOSYNC === "true";
    if (!since && !disableHolidayAutosync) {
      const currentYearPrefix = `${new Date().getFullYear()}-`;
      const hasCurrentYearHolidays =
        (await prisma.holiday.count({
          where: { date: { startsWith: currentYearPrefix } },
        })) > 0;

      if (!hasCurrentYearHolidays) {
        console.warn(
          `📦 [HolidayService] Auto-syncing holidays for ${new Date().getFullYear()}...`,
        );
        await this.syncExternalHolidays(new Date().getFullYear());
        holidays = await prisma.holiday.findMany(queryArgs);
      }
    } else if (!since && disableHolidayAutosync) {
      console.warn(`📦 [HolidayService] Auto-sync skipped (DISABLE_HOLIDAY_AUTOSYNC=true).`);
    }

    const enriched = holidays.map((h) => ({
      ...h,
      lastModified: h.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    }));

    if (!isPaginated) return enriched;

    const total = await prisma.holiday.count({ where });
    return {
      data: enriched,
      meta: {
        total,
        page: page || 1,
        pageSize: pageSize || enriched.length,
        totalPages: pageSize ? Math.ceil(total / pageSize) : 1,
      },
    };
  }

  /**
   * Sincroniza feriados desde la API externa (Boostr).
   */
  async syncExternalHolidays(year?: number, actorUsername: string = "SYSTEM") {
    const targetYear = year || new Date().getFullYear();
    const apiUrl = `https://api.boostr.cl/holidays/${targetYear}.json`;
    console.warn(`[HolidayService] Fetching holidays for ${targetYear} from Boostr...`);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "N/A");
        console.error(`[HolidayService] API Error ${response.status}:`, errorText);
        throw new Error(`API de Boostr respondió con status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`API de Boostr no devolvió JSON (${contentType || "N/A"})`);
      }

      const result = await response.json();
      if (result.status !== "success" || !Array.isArray(result.data)) {
        console.error("[HolidayService] Invalid API response format:", result);
        throw new Error("Formato de respuesta de API de Boostr inválido");
      }

      const data = result.data;
      const syncResults = [];

      // Procesamiento secuencial para evitar saturar el pool de conexiones
      // ya que cada upsert gatilla una transacción de auditoría vía prisma.$extends
      for (const item of data) {
        const h = await prisma.holiday.upsert({
          where: { date: item.date },
          update: {
            name: item.title,
            type: item.inalienable ? "Nacional" : "Regional",
          },
          create: {
            id: ulid(),
            date: item.date,
            name: item.title,
            type: item.inalienable ? "Nacional" : "Regional",
          },
        });
        syncResults.push(h);
      }

      await auditService.log({
        actorUsername,
        action: "HOLIDAY_SYNC",
        category: "OPERATIONS",
        details: { count: syncResults.length, year: targetYear },
      });

      SocketService.emit("holiday:updated", { type: "sync", count: syncResults.length });
      return { success: true, total: syncResults.length, year: targetYear };
    } catch (error: unknown) {
      console.error("[HolidayService] Sync failed:", error);
      throw error;
    }
  }

  /**
   * Crea o actualiza un feriado manualmente.
   */
  async upsertHoliday(data: HolidayUpsertData, actorUsername: string) {
    const holiday = await prisma.holiday.upsert({
      where: { date: data.date },
      update: {
        name: data.name,
        type: data.type || "Nacional",
      },
      create: {
        id: data.id || ulid(),
        date: data.date,
        name: data.name,
        type: data.type || "Nacional",
      },
    });

    await auditService.log({
      actorUsername,
      action: "HOLIDAY_UPSERT",
      category: "OPERATIONS",
      details: { date: holiday.date, name: holiday.name },
    });

    SocketService.emit("holiday:updated", holiday);
    return holiday;
  }

  /**
   * Elimina un feriado.
   */
  async deleteHoliday(id: string, actorUsername: string) {
    const holiday = await prisma.holiday.findUnique({
      where: { id },
      select: { date: true, name: true },
    });
    await prisma.holiday.delete({ where: { id } });

    await auditService.log({
      actorUsername,
      action: "HOLIDAY_DELETE",
      category: "OPERATIONS",
      severity: "WARNING",
      details: { id, date: holiday?.date, name: holiday?.name },
    });

    SocketService.emit("holiday:updated", { id, isDeleted: true });
  }

  /**
   * Creación masiva de feriados (Upsert).
   */
  async bulkUpsertHolidays(holidays: BulkHolidayInput[], actorUsername: string) {
    const results = await Promise.all(
      holidays.map((h) =>
        prisma.holiday.upsert({
          where: { date: h.date },
          update: {
            name: h.name,
            type: h.type || "Nacional",
          },
          create: {
            id: h.id || ulid(),
            date: h.date,
            name: h.name,
            type: h.type || "Nacional",
          },
        }),
      ),
    );

    await auditService.log({
      actorUsername,
      action: "HOLIDAY_BULK_UPSERT",
      category: "OPERATIONS",
      details: { count: results.length },
    });

    SocketService.emit("holiday:updated", { type: "bulk", count: results.length });
    return results.length;
  }
}

export const holidayService = new HolidayService();
