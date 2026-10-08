import prisma, { withDirectTransaction } from "./db";
import { AppError, ValidationError } from "../utils/AppError";
import { LeaveRecord, Prisma, TimeRecord } from "../generated/prisma/client";
import { SocketService } from "./socketService";
import { timeRecordIntegrityService } from "./timeRecordIntegrityService";
import {
  addBusinessDaysChile,
  toBusinessDateChile,
  formatDateUTCISO,
  parseDateOnlyUTC,
} from "../utils/timeUtils";

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

function hasPunch(record: TimeRecord): boolean {
  return !!(record.entrada || record.inicioColacion || record.finColacion || record.salida);
}

function materializingLeaveId(record: TimeRecord): string | undefined {
  try {
    const justification: unknown = JSON.parse(record.justification || "null");
    if (
      typeof justification === "object" &&
      justification !== null &&
      "leaveId" in justification &&
      typeof justification.leaveId === "string"
    )
      return justification.leaveId;
  } catch {
    // Manual or malformed justification is not evidence of leave ownership.
  }
  return undefined;
}

function belongsToLeave(record: TimeRecord, leaveId: string): boolean {
  return materializingLeaveId(record) === leaveId;
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
    if (
      !employeeId ||
      !type ||
      !startDate ||
      !endDate ||
      startDate > endDate ||
      formatDateUTCISO(parseDateOnlyUTC(startDate)) !== startDate ||
      formatDateUTCISO(parseDateOnlyUTC(endDate)) !== endDate
    ) {
      throw new ValidationError("El rango de la ausencia es inválido.");
    }
    const todayIso = toBusinessDateChile();
    const limitDateIso = addBusinessDaysChile(todayIso, -7);
    const leave = await withDirectTransaction(
      async (tx) => {
        // Serializes leave create/update/delete for this employee, including empty ranges.
        const employees = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM employees WHERE id = ${employeeId} FOR UPDATE`;
        if (!employees.length) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
        const existing = id ? await tx.leaveRecord.findUnique({ where: { id } }) : null;
        if (existing) {
          if (existing.isDeleted || existing.endDate < todayIso)
            throw new Error("CANNOT_EDIT_FINALIZED");
          if (
            existing.employeeId !== employeeId ||
            existing.type !== type ||
            existing.startDate !== startDate
          ) {
            throw new Error("IMMUTABLE_FIELDS_CHANGED");
          }
          if (endDate < todayIso) throw new Error("INVALID_END_DATE_PAST");
        } else if (startDate < limitDateIso) {
          throw new Error("LIMIT_7_DAYS_EXCEEDED");
        }
        const overlap = await tx.leaveRecord.findFirst({
          where: {
            employeeId,
            isDeleted: false,
            ...(existing ? { id: { not: existing.id } } : {}),
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        });
        if (overlap)
          throw new AppError(
            "La ausencia se superpone con otra ausencia activa.",
            409,
            "LEAVE_OVERLAP",
          );

        const lastDate = existing && existing.endDate > endDate ? existing.endDate : endDate;
        // Prevent a concurrent punch from changing rows between inspection and mutation.
        await tx.$queryRaw`SELECT id FROM time_records
        WHERE employee_id = ${employeeId} AND date >= ${startDate} AND date <= ${lastDate}
        ORDER BY id FOR UPDATE`;
        if (existing && endDate < existing.endDate) {
          await this.archiveDays(tx, existing, endDate, false);
        }
        const saved = existing
          ? await tx.leaveRecord.update({ where: { id }, data: { endDate, notes: notes || null } })
          : await tx.leaveRecord.create({
              data: {
                id: id || undefined,
                employeeId,
                type,
                startDate,
                endDate,
                notes: notes || null,
              },
            });
        await this.materializeDays(tx, saved);
        return saved;
      },
      { timeout: 60000 },
    );
    SocketService.emit("leave:updated", leave);
    SocketService.emit("timeRecord:updated", { employeeId });
    return leave;
  }

  private static async archiveDays(
    tx: Prisma.TransactionClient,
    leave: LeaveRecord,
    boundary: string,
    inclusive: boolean,
  ) {
    const rows = await tx.timeRecord.findMany({
      where: {
        employeeId: leave.employeeId,
        date: { ...(inclusive ? { gte: boundary } : { gt: boundary }), lte: leave.endDate },
        isDeleted: false,
      },
    });
    const removable = rows.filter((row) => !hasPunch(row) && belongsToLeave(row, leave.id));
    if (!removable.length) return;
    await tx.timeRecord.updateMany({
      where: { id: { in: removable.map((row) => row.id) } },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    for (const row of removable) {
      await timeRecordIntegrityService.sealAfterMutation(tx, row.employeeId, row.id, {
        skipAudit: true,
      });
    }
  }

  /**
   * Internal helper to materialize leave days into TimeRecords.
   */
  private static async materializeDays(tx: Prisma.TransactionClient, leave: LeaveRecord) {
    const employee = await tx.employee.findUnique({ where: { id: leave.employeeId } });

    const existingRecords = await tx.timeRecord.findMany({
      where: {
        employeeId: leave.employeeId,
        date: { gte: leave.startDate, lte: leave.endDate },
      },
    });

    const priorLeaveIds = [
      ...new Set(
        existingRecords
          .filter((row) => row.isDeleted)
          .map(materializingLeaveId)
          .filter((id): id is string => typeof id === "string" && id !== leave.id),
      ),
    ];
    const priorLeaves = priorLeaveIds.length
      ? await tx.leaveRecord.findMany({ where: { id: { in: priorLeaveIds } } })
      : [];
    const priorMap = new Map(priorLeaves.map((prior) => [prior.id, prior]));

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
        if (hasPunch(existingTR)) continue;
        if (existingTR.isDeleted && !belongsToLeave(existingTR, leave.id)) {
          const prior = priorMap.get(materializingLeaveId(existingTR));
          if (
            !prior ||
            prior.employeeId !== existingTR.employeeId ||
            (!prior.isDeleted &&
              existingTR.date >= prior.startDate &&
              existingTR.date <= prior.endDate)
          )
            continue;
        }
        recordsToUpdate.push(existingTR);
      } else {
        datesToCreate.push(dateStr);
      }
    }

    for (const existingTR of recordsToUpdate) {
      await tx.timeRecord.update({
        where: { id: existingTR.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          status: leave.type,
          justification: JSON.stringify({
            type: leave.type,
            leaveId: leave.id,
            notes: "Autogenerado por Licencia",
          }),
          scheduledHours: 0,
        },
      });
      await timeRecordIntegrityService.sealAfterMutation(tx, existingTR.employeeId, existingTR.id, {
        skipAudit: true,
      });
    }

    for (const dateStr of datesToCreate) {
      const created = await tx.timeRecord.create({
        data: {
          employeeId: leave.employeeId,
          employeeName: employee?.name || "Desconocido",
          date: dateStr,
          isDeleted: false,
          deletedAt: null,
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
      await timeRecordIntegrityService.sealAfterMutation(tx, created.employeeId, created.id, {
        skipAudit: true,
      });
    }
  }

  /**
   * Deletes a leave record and cleans up associated materialized TimeRecords.
   */
  static async delete(id: string) {
    const todayIso = toBusinessDateChile();
    const leave = await withDirectTransaction(
      async (tx) => {
        const initial = await tx.leaveRecord.findUnique({ where: { id } });
        if (!initial) throw new Error("NOT_FOUND");
        await tx.$queryRaw`SELECT id FROM employees WHERE id = ${initial.employeeId} FOR UPDATE`;
        const current = await tx.leaveRecord.findUnique({ where: { id } });
        if (!current) throw new Error("NOT_FOUND");
        if (current.startDate < addBusinessDaysChile(todayIso, -7))
          throw new Error("LIMIT_7_DAYS_EXCEEDED");
        const isArchived = current.endDate < todayIso;
        const isRecentlyCreated = Date.now() - current.createdAt.getTime() < 24 * 60 * 60 * 1000;
        if (isArchived && !isRecentlyCreated) throw new Error("ARCHIVE_PROTECTION_VIOLATED");
        if (current.isDeleted) return current;
        await tx.$queryRaw`SELECT id FROM time_records
        WHERE employee_id = ${current.employeeId} AND date >= ${todayIso} AND date <= ${current.endDate}
        ORDER BY id FOR UPDATE`;
        await this.archiveDays(tx, current, todayIso, true);
        return tx.leaveRecord.update({
          where: { id },
          data: {
            endDate: addBusinessDaysChile(todayIso, -1),
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      },
      { timeout: 60000 },
    );
    SocketService.emit("leave:updated", leave);
    SocketService.emit("timeRecord:updated", { employeeId: leave.employeeId });
    return true;
  }
}
