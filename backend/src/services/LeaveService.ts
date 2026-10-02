import prisma from "./db";
import { LeaveRecord, Prisma, TimeRecord } from "@prisma/client";
import { SocketService } from "./socketService";
import { timeRecordIntegrityService } from "./timeRecordIntegrityService";
import { addBusinessDaysChile, toBusinessDateChile } from "../utils/timeUtils";

export interface LeaveListParams {
  page?: number;
  pageSize?: number;
  since?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  showArchived?: boolean;
}

/**
 * Fields `upsert` reads from its payload.
 *
 * Fields stay optional because the controller passes the output of
 * `LeaveRecordSchema.parse(req.body)`, whose inferred type keeps them optional
 * (the project compiles with `strict: false`).
 */
export interface LeaveUpsertData {
  id?: string;
  employeeId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  notes?: string | null;
}

export class LeaveService {
  /**
   * Retrieves a paginated list of leave records with filters.
   */
  static async list(params: LeaveListParams, user: { role: string; employeeId?: string }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const { since, startDate, endDate, employeeId, showArchived } = params;
    const where: Prisma.LeaveRecordWhereInput = {};

    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gte: sinceDate };
      }
    } else {
      where.isDeleted = false;
    }

    if (startDate || endDate) {
      where.AND = [
        ...(startDate ? [{ endDate: { gte: startDate } }] : []),
        ...(endDate ? [{ startDate: { lte: endDate } }] : []),
      ];
    }

    // Role-based filtering
    if (user.role === "Usuario" && user.employeeId) {
      where.employeeId = user.employeeId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    // Archive logic
    if (!showArchived && !startDate && !endDate) {
      const today = toBusinessDateChile();
      where.endDate = { gte: today };
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
      }),
      prisma.leaveRecord.count({ where }),
    ]);

    const mapped = leaves.map((l) => ({
      ...l,
      lastModified: l.updatedAt.getTime(),
      syncStatus: "synced",
      isDeleted: l.isDeleted || false,
    }));

    return {
      items: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Creates or updates a leave record, materializing TimeRecords for the period.
   */
  static async upsert(data: LeaveUpsertData) {
    const { employeeId, type, startDate, endDate, notes, id } = data;
    const todayIso = toBusinessDateChile();

    // Rule: 7-day past limit for new records
    const limitDateIso = addBusinessDaysChile(todayIso, -7);

    if (!id && startDate < limitDateIso) {
      throw new Error("LIMIT_7_DAYS_EXCEEDED");
    }

    let leave;
    const existing = id ? await prisma.leaveRecord.findUnique({ where: { id } }) : null;

    if (existing) {
      // Incompatibility & Safety checks for updates
      if (existing.endDate < todayIso) {
        throw new Error("CANNOT_EDIT_FINALIZED");
      }

      if (
        existing.employeeId !== employeeId ||
        existing.type !== type ||
        existing.startDate !== startDate
      ) {
        throw new Error("IMMUTABLE_FIELDS_CHANGED");
      }

      if (endDate < todayIso) {
        throw new Error("INVALID_END_DATE_PAST");
      }

      // 1. Cleanup old materialized records (only if no punches)
      const materializedToArchive = await prisma.timeRecord.findMany({
        where: {
          employeeId: existing.employeeId,
          date: { gte: existing.startDate, lte: existing.endDate },
          status: existing.type,
          entrada: null,
          salida: null,
          isDeleted: false,
        },
        select: { id: true, employeeId: true },
      });

      await prisma.timeRecord.updateMany({
        where: {
          employeeId: existing.employeeId,
          date: { gte: existing.startDate, lte: existing.endDate },
          status: existing.type,
          entrada: null,
          salida: null,
          isDeleted: false,
        },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      for (const row of materializedToArchive) {
        await timeRecordIntegrityService.sealAfterMutation(prisma, row.employeeId, row.id, {
          skipAudit: true,
        });
      }

      leave = await prisma.leaveRecord.update({
        where: { id },
        data: { employeeId, type, startDate, endDate, notes: notes || null },
      });
    } else {
      leave = await prisma.leaveRecord.create({
        data: { id: id || undefined, employeeId, type, startDate, endDate, notes: notes || null },
      });
    }

    // Materialize TimeRecords
    await this.materializeDays(leave);

    SocketService.emit("leave:updated", leave);
    SocketService.emit("timeRecord:updated", { employeeId });

    return leave;
  }

  /**
   * Internal helper to materialize leave days into TimeRecords.
   */
  private static async materializeDays(leave: LeaveRecord) {
    const employee = await prisma.employee.findUnique({ where: { id: leave.employeeId } });

    const existingRecords = await prisma.timeRecord.findMany({
      where: {
        employeeId: leave.employeeId,
        date: { gte: leave.startDate, lte: leave.endDate },
      },
    });

    const existingMap = new Map<string, TimeRecord>(existingRecords.map((r) => [r.date, r]));
    const recordsToUpdate = [];
    const datesToCreate = [];

    for (
      let dateStr = leave.startDate;
      dateStr <= leave.endDate;
      dateStr = addBusinessDaysChile(dateStr, 1)
    ) {
      const existingTR = existingMap.get(dateStr);

      if (existingTR) {
        // Skip if there's already a punch (manual entry takes precedence)
        if (existingTR.entrada) continue;
        recordsToUpdate.push(existingTR);
      } else {
        datesToCreate.push(dateStr);
      }
    }

    for (const existingTR of recordsToUpdate) {
      await prisma.timeRecord.update({
        where: { id: existingTR.id },
        data: {
          status: leave.type,
          justification: JSON.stringify({
            type: leave.type,
            leaveId: leave.id,
            notes: "Autogenerado por Licencia",
          }),
          scheduledHours: 0,
        },
      });
      await timeRecordIntegrityService.sealAfterMutation(
        prisma,
        existingTR.employeeId,
        existingTR.id,
        {
          skipAudit: true,
        },
      );
    }

    for (const dateStr of datesToCreate) {
      const created = await prisma.timeRecord.create({
        data: {
          employeeId: leave.employeeId,
          employeeName: employee?.name || "Desconocido",
          date: dateStr,
          status: leave.type,
          source: "SYSTEM_LEAVE",
          justification: JSON.stringify({
            type: leave.type,
            leaveId: leave.id,
            notes: "Autogenerado por Licencia",
          }),
          scheduledHours: 0,
        },
      });
      await timeRecordIntegrityService.sealAfterMutation(prisma, created.employeeId, created.id, {
        skipAudit: true,
      });
    }
  }

  /**
   * Deletes a leave record and cleans up associated materialized TimeRecords.
   */
  static async delete(id: string) {
    const leave = await prisma.leaveRecord.findUnique({ where: { id } });
    if (!leave) throw new Error("NOT_FOUND");

    const todayIso = toBusinessDateChile();

    // Rule: 7-day past limit for deletion
    const limitDateIso = addBusinessDaysChile(todayIso, -7);

    if (leave.startDate < limitDateIso) {
      throw new Error("LIMIT_7_DAYS_EXCEEDED");
    }

    // Rule: Archive Protection with 24h Grace Period
    const isArchived = leave.endDate < todayIso;
    const isRecentlyCreated =
      Date.now() - new Date(leave.createdAt).getTime() < 24 * 60 * 60 * 1000;

    if (isArchived && !isRecentlyCreated) {
      throw new Error("ARCHIVE_PROTECTION_VIOLATED");
    }

    // Clean up future materialized records
    const futureRowsToArchive = await prisma.timeRecord.findMany({
      where: {
        employeeId: leave.employeeId,
        date: { gte: todayIso, lte: leave.endDate },
        status: leave.type,
        entrada: null,
      },
      select: { id: true, employeeId: true },
    });

    await prisma.timeRecord.updateMany({
      where: {
        employeeId: leave.employeeId,
        date: { gte: todayIso, lte: leave.endDate },
        status: leave.type,
        entrada: null,
      },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    for (const row of futureRowsToArchive) {
      await timeRecordIntegrityService.sealAfterMutation(prisma, row.employeeId, row.id, {
        skipAudit: true,
      });
    }

    // Yesterday for shortening the effective period
    const yesterdayIso = addBusinessDaysChile(todayIso, -1);

    await prisma.leaveRecord.update({
      where: { id },
      data: { endDate: yesterdayIso, isDeleted: true, deletedAt: new Date() },
    });

    SocketService.emit("leave:updated", { ...leave, endDate: yesterdayIso });
    SocketService.emit("timeRecord:updated", { employeeId: leave.employeeId });

    return true;
  }
}
