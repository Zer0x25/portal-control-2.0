import { randomUUID } from "node:crypto";
import prisma, { withDirectTransaction } from "./db";
import { parseBusinessDateCL, formatBusinessDateCL } from "../utils/timePolicy";
import { AuthError } from "../utils/AppError";
import { Prisma } from "../generated/prisma/client";
import { SocketService } from "./socketService";
import type { MeterReadingSchema } from "../models/schemas/meter.schemas";
import type { z } from "zod";

/**
 * One reading as accepted by `bulkCreate`. Inferred from the Zod schema so the
 * service contract cannot drift from the validation the controller applies.
 */
type MeterReadingInput = z.infer<typeof MeterReadingSchema>;

export interface MeterListParams {
  since?: string | number;
  month?: string;
  page?: string | number;
  pageSize?: string | number;
  meterId?: string;
  startDate?: string;
  endDate?: string;
}

function nextBusinessDate(date: string): string {
  const utc = new Date(`${date}T12:00:00Z`);
  utc.setUTCDate(utc.getUTCDate() + 1);
  return utc.toISOString().slice(0, 10);
}

function businessDayStart(date: string): Date {
  const candidate = parseBusinessDateCL(date);
  if (formatBusinessDateCL(candidate) === date) return candidate;
  let low = candidate.getTime(),
    high = low + 3 * 3600000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (formatBusinessDateCL(new Date(mid)) < date) low = mid;
    else high = mid;
  }
  return new Date(high);
}

export class MeterService {
  /**
   * Retrieves a list of meter readings with optional filtering and pagination.
   */
  static async list(params: MeterListParams) {
    const { since, page, pageSize, meterId, month } = params;
    let { startDate, endDate } = params;
    if (month) {
      startDate = `${month}-01`;
      const [year, m] = month.split("-").map(Number);
      const last = new Date(0);
      last.setUTCFullYear(year, m, 0);
      last.setUTCHours(12, 0, 0, 0);
      endDate = last.toISOString().slice(0, 10);
    }
    const where: Prisma.MeterReadingWhereInput = {};

    if (since !== undefined) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.timestamp = { gte: sinceDate };
      }
    }

    if (meterId) {
      where.meterConfigId = meterId;
    }

    if (startDate || endDate) {
      const timestampFilter: Prisma.DateTimeFilter = {};
      if (since !== undefined) timestampFilter.gte = new Date(Number(since));
      if (startDate) {
        const start = businessDayStart(startDate);
        timestampFilter.gte =
          since !== undefined ? new Date(Math.max(Number(since), start.getTime())) : start;
      }
      if (endDate) timestampFilter.lt = businessDayStart(nextBusinessDate(endDate));
      where.timestamp = timestampFilter;
    }

    const isPaginated = page !== undefined && pageSize !== undefined;
    const take = isPaginated ? Number(pageSize) : undefined;
    const skip = isPaginated ? (Number(page) - 1) * Number(pageSize) : undefined;

    const [readings, total] = await Promise.all([
      prisma.meterReading.findMany({
        where,
        orderBy: [{ timestamp: "desc" }, { id: "desc" }],
        take,
        skip,
      }),
      prisma.meterReading.count({ where }),
    ]);

    const mapped = readings.map((r) => ({
      ...r,
      lastModified: r.timestamp.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    }));

    return {
      items: mapped,
      total,
      isPaginated,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: isPaginated ? Math.ceil(total / Number(pageSize)) : 1,
    };
  }

  /**
   * Creates multiple meter readings in bulk.
   */
  static async bulkCreate(readings: MeterReadingInput[], actorUsername: string) {
    if (!actorUsername?.trim()) throw new AuthError();
    const inputs = readings.map((r) => ({
      id: randomUUID(),
      meterConfigId: r.meterConfigId,
      authorUsername: actorUsername,
      value: r.value,
      isRecharge: r.isRecharge ?? false,
      notes: r.notes || null,
    }));
    const { created, audits } = await withDirectTransaction(async (tx) => {
      if (!inputs.length) return { created: [], audits: [] };
      const rows = await tx.meterReading.createManyAndReturn({ data: inputs });
      const byId = new Map(rows.map((row) => [row.id, row]));
      // SQL RETURNING does not guarantee input order; preserve the HTTP batch order.
      const created = inputs.map((input) => {
        const row = byId.get(input.id);
        if (!row) throw new Error("Missing inserted meter reading");
        return row;
      });
      const audits = await tx.auditLog.createManyAndReturn({
        data: created.map((row) => ({
          actorUsername,
          action: "METERREADING_CREATE",
          category: "DATA",
          severity: "INFO",
          outcome: "SUCCESS",
          details: { model: "MeterReading", operation: "create", id: row.id },
        })),
      });
      return { created, audits };
    });
    for (const audit of audits) SocketService.emitToAll("auditLog:created", audit);

    const enriched = created.map((r) => ({
      ...r,
      lastModified: r.timestamp.getTime(),
      syncStatus: "synced",
      isDeleted: false,
    }));

    SocketService.emit("meter:updated", { count: created.length });

    return enriched;
  }
}
