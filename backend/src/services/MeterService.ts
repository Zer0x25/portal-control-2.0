import prisma from "./db";
import { Prisma } from "@prisma/client";
import { SocketService } from "./socketService";
import type { MeterReadingSchema } from "../models/schemas/meter.schemas";
import type { z } from "zod";

/**
 * One reading as accepted by `bulkCreate`. Inferred from the Zod schema so the
 * service contract cannot drift from the validation the controller applies.
 */
type MeterReadingInput = z.infer<typeof MeterReadingSchema>;

export interface MeterListParams {
  since?: string;
  page?: string | number;
  pageSize?: string | number;
  meterId?: string;
  startDate?: string;
  endDate?: string;
}

export class MeterService {
  /**
   * Retrieves a list of meter readings with optional filtering and pagination.
   */
  static async list(params: MeterListParams) {
    const { since, page, pageSize, meterId, startDate, endDate } = params;
    const where: Prisma.MeterReadingWhereInput = {};

    if (since) {
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
      if (startDate) {
        timestampFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        timestampFilter.lte = end;
      }
      where.timestamp = {
        ...((where.timestamp as Prisma.DateTimeFilter) || {}),
        ...timestampFilter,
      };
    }

    const isPaginated = page !== undefined && pageSize !== undefined;
    const take = isPaginated ? Number(pageSize) : undefined;
    const skip = isPaginated ? (Number(page) - 1) * Number(pageSize) : undefined;

    const [readings, total] = await Promise.all([
      prisma.meterReading.findMany({
        where,
        orderBy: { timestamp: "desc" },
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
  static async bulkCreate(readings: MeterReadingInput[]) {
    const created = await Promise.all(
      readings.map((r) =>
        prisma.meterReading.create({
          data: {
            meterConfigId: r.meterConfigId,
            authorUsername: r.authorUsername,
            value: r.value,
            isRecharge: r.isRecharge ?? false,
            notes: r.notes || null,
          },
        }),
      ),
    );

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
