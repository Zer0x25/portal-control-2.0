import prisma, { withDirectTransaction } from "./db";
import { normalizeShiftReportEntries } from "../modules/shiftReports";
import { redactAuditFields } from "../modules/audit";
import { Prisma, type AuditLog } from "../generated/prisma/client";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { formatDateUTCISO } from "../utils/timeUtils";
import { AppError, NotFoundError } from "../utils/AppError";
import { ConflictError, ForbiddenError } from "../utils/AppError";
import { TimeRecordService } from "./TimeRecordService";
import { ACCOUNTING_TRANSACTION_OPTIONS } from "./accountingTransaction";
import { ulid } from "ulid";

export interface LogEntry {
  id: string;
  time: string;
  annotation: string;
  timestamp: number;
  recordId?: string;
}

export interface SupplierEntry {
  id: string;
  company: string;
  licensePlate: string;
  driverName: string;
  paxCount: number;
  reason: string;
  time: string;
  timestamp: number;
}

export interface ShiftReportListParams {
  since?: string | number;
  page?: string | number;
  pageSize?: string | number;
  status?: string;
  search?: string;
  date?: string;
}

/**
 * Payload accepted by `createOrUpdate`. Mirrors the persisted `ShiftReport`
 * columns, except that `logEntries` / `supplierEntries` may arrive either as
 * pre-serialized JSON or as an array, and dates may arrive as ISO strings.
 */
type ShiftReportInput = {
  id?: string;
  folio?: string;
  shiftName: string;
  responsibleUser: string;
  startTime: string;
  endTime?: string | null;
  status?: string;
  date: string;
  logEntries?: string | LogEntry[];
  removedLogEntryIds?: string[];
  supplierEntries?: string | SupplierEntry[];
};

/**
 * Raised when a shift is opened while another one is still open. The conflicting
 * row rides along as structured data so `shiftReportController` can build a 409
 * without re-querying. The message stays `"SHIFT_START_BLOCKED"` because the
 * controller matches on it.
 */
class ShiftStartBlockedError extends AppError {
  public readonly conflictingShift: { folio: string; responsibleUser: string };

  constructor(openShift: { folio: string; responsibleUser: string }) {
    super("SHIFT_START_BLOCKED", 409, "SHIFT_START_BLOCKED");
    this.conflictingShift = {
      folio: openShift.folio,
      responsibleUser: openShift.responsibleUser,
    };
    Object.setPrototypeOf(this, ShiftStartBlockedError.prototype);
  }
}

export class ShiftReportService {
  private static async getNextFolio(tx: Prisma.TransactionClient): Promise<string> {
    // IMPORTANT: folio is stored as string, so lexicographic ORDER BY is unsafe
    // (e.g., "999" sorts before "1000"). Use numeric MAX from PostgreSQL.
    const rows = await tx.$queryRaw<Array<{ max_folio: number | null }>>`
      SELECT MAX(CAST(folio AS INTEGER)) AS max_folio
      FROM shift_reports
      WHERE folio ~ '^[0-9]+$'
    `;
    const maxFolio = rows[0]?.max_folio ?? 0;
    const nextFolioNum = maxFolio + 1;
    return String(nextFolioNum).padStart(3, "0");
  }

  /**
   * Lists all shift reports with filtering and pagination.
   */
  static async list(params: ShiftReportListParams) {
    const { since, page = 1, pageSize = 50, status, search, date } = params;
    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 50;

    const where: Prisma.ShiftReportWhereInput = { isDeleted: false };
    const andConditions: Prisma.ShiftReportWhereInput[] = [];

    if (since !== undefined && since !== "") {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        andConditions.push({ OR: [{ updatedAt: { gte: sinceDate } }, { status: "open" }] });
      }
    }

    const trimmedSearch = typeof search === "string" ? search.trim() : "";
    if (trimmedSearch) {
      andConditions.push({
        OR: [
          { folio: { contains: trimmedSearch, mode: "insensitive" } },
          { responsibleUser: { contains: trimmedSearch, mode: "insensitive" } },
          { shiftName: { contains: trimmedSearch, mode: "insensitive" } },
        ],
      });
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      andConditions.push({ date: { gte: dayStart, lt: dayEnd } });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (status) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.shiftReport.findMany({
        where,
        take: pageSizeNum,
        skip: (pageNum - 1) * pageSizeNum,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.shiftReport.count({ where }),
    ]);

    const mapped = reports.map((r) => {
      const normalized = normalizeShiftReportEntries(
        r.logEntries,
        r.supplierEntries,
        r.updatedAt.getTime(),
      );
      return {
        ...r,
        date: formatDateUTCISO(r.date),
        logEntries: normalized.logEntries,
        supplierEntries: normalized.supplierEntries,
        syncStatus: "synced",
        lastModified: r.updatedAt.getTime(),
        isDeleted: r.isDeleted || false,
      };
    });

    return {
      data: mapped,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSizeNum),
    };
  }

  /**
   * Creates or updates a shift report.
   */
  static async createOrUpdate(data: ShiftReportInput, actorUsername: string) {
    const auditEvents: AuditLog[] = [];
    const result = await withDirectTransaction(async (tx) => {
      // One transaction-scoped lock coordinates creates and updates across processes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(17017, 1)`;
      const existing = data.id ? await tx.shiftReport.findUnique({ where: { id: data.id } }) : null;
      const opens = (data.status ?? existing?.status ?? "open") === "open";
      if (opens || !existing) {
        const openShift = await tx.shiftReport.findFirst({
          where: {
            status: "open",
            isDeleted: false,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
        });
        if (openShift) return { blocked: openShift } as const;
      }
      const audit = async (entry: Parameters<typeof auditService.log>[0]) => {
        const safe = redactAuditFields(entry.action, entry.details, entry.metadata);
        const log = await tx.auditLog.create({
          data: {
            actorUsername: entry.actorUsername,
            action: entry.action,
            category: entry.category,
            severity: entry.severity ?? "INFO",
            outcome: entry.outcome ?? "SUCCESS",
            details: safe.details as Prisma.InputJsonValue,
            metadata: safe.metadata as Prisma.InputJsonValue,
          },
        });
        auditEvents.push(log);
      };

      let report;

      if (existing) {
        // --- AUDIT GRANULAR CHANGES ---
        const oldNormalized = normalizeShiftReportEntries(
          existing.logEntries,
          existing.supplierEntries,
          existing.updatedAt.getTime(),
        );
        const oldLogEntries = oldNormalized.logEntries;
        const oldSupplierEntries = oldNormalized.supplierEntries;

        const newLogRaw =
          typeof data.logEntries === "string"
            ? data.logEntries
            : JSON.stringify(Array.isArray(data.logEntries) ? data.logEntries : []);
        const newSupplierRaw =
          typeof data.supplierEntries === "string"
            ? data.supplierEntries
            : JSON.stringify(Array.isArray(data.supplierEntries) ? data.supplierEntries : []);
        const newNormalized = normalizeShiftReportEntries(newLogRaw, newSupplierRaw, Date.now());
        const newLogEntries = newNormalized.logEntries;
        const newSupplierEntries = newNormalized.supplierEntries;

        // A stale full-report save must not silently erase attendance-linked entries.
        if (
          oldLogEntries.some(
            (entry) =>
              entry.recordId &&
              !data.removedLogEntryIds?.includes(entry.id) &&
              !newLogEntries.some(
                (next) => next.id === entry.id && next.recordId === entry.recordId,
              ),
          )
        ) {
          throw new ConflictError("La bitácora cambió; recarga antes de guardar.");
        }

        // Detect Logbook Changes
        for (const entry of newLogEntries) {
          const original = oldLogEntries.find((old) => old.id === entry.id);
          if (!original) {
            await audit({
              actorUsername,
              action: "LOG_ENTRY_ADDED",
              category: "OPERATIONS",
              severity: "INFO",
              outcome: "SUCCESS",
              details: { shiftFolio: data.folio, entryId: entry.id, annotation: entry.annotation },
            });
          } else if (JSON.stringify(original) !== JSON.stringify(entry)) {
            await audit({
              actorUsername,
              action: "LOG_ENTRY_EDITED",
              category: "OPERATIONS",
              severity: "INFO",
              outcome: "SUCCESS",
              details: { shiftFolio: data.folio, entryId: entry.id },
            });
          }
        }
        for (const old of oldLogEntries) {
          if (!newLogEntries.find((n) => n.id === old.id)) {
            await audit({
              actorUsername,
              action: "LOG_ENTRY_DELETED",
              category: "OPERATIONS",
              severity: "INFO",
              outcome: "SUCCESS",
              details: { shiftFolio: data.folio, entryId: old.id },
            });
          }
        }

        // Detect Supplier Changes
        for (const entry of newSupplierEntries) {
          const original = oldSupplierEntries.find((old) => old.id === entry.id);
          if (!original) {
            await audit({
              actorUsername,
              action: "SUPPLIER_ENTRY_ADDED",
              category: "OPERATIONS",
              severity: "INFO",
              outcome: "SUCCESS",
              details: { shiftFolio: data.folio, entryId: entry.id, company: entry.company },
            });
          } else if (JSON.stringify(original) !== JSON.stringify(entry)) {
            await audit({
              actorUsername,
              action: "SUPPLIER_ENTRY_EDITED",
              category: "OPERATIONS",
              severity: "INFO",
              outcome: "SUCCESS",
              details: { shiftFolio: data.folio, entryId: entry.id },
            });
          }
        }
        for (const old of oldSupplierEntries) {
          if (!newSupplierEntries.find((n) => n.id === old.id)) {
            await audit({
              actorUsername,
              action: "SUPPLIER_ENTRY_DELETED",
              category: "OPERATIONS",
              severity: "INFO",
              outcome: "SUCCESS",
              details: { shiftFolio: data.folio, entryId: old.id },
            });
          }
        }

        report = await tx.shiftReport.update({
          where: { id: data.id },
          data: {
            shiftName: data.shiftName,
            responsibleUser: data.responsibleUser,
            startTime: data.startTime ? new Date(data.startTime) : undefined,
            endTime: data.endTime ? new Date(data.endTime) : null,
            status: data.status,
            date: new Date(data.date),
            logEntries: JSON.stringify(newLogEntries),
            supplierEntries: JSON.stringify(newSupplierEntries),
          },
        });

        if (existing.status === "open" && report.status === "closed") {
          await audit({
            actorUsername,
            action: "SHIFT_CLOSED",
            category: "OPERATIONS",
            severity: "INFO",
            outcome: "SUCCESS",
            details: { folio: report.folio, shiftId: report.id },
          });
        }
      } else {
        // CREATE
        const incomingLogRaw =
          typeof data.logEntries === "string"
            ? data.logEntries
            : JSON.stringify(Array.isArray(data.logEntries) ? data.logEntries : []);
        const incomingSupplierRaw =
          typeof data.supplierEntries === "string"
            ? data.supplierEntries
            : JSON.stringify(Array.isArray(data.supplierEntries) ? data.supplierEntries : []);
        const normalizedIncoming = normalizeShiftReportEntries(
          incomingLogRaw,
          incomingSupplierRaw,
          Date.now(),
        );

        const nextFolio = await this.getNextFolio(tx);
        report = await tx.shiftReport.create({
          data: {
            id: data.id,
            folio: nextFolio,
            shiftName: data.shiftName,
            responsibleUser: data.responsibleUser,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : null,
            status: data.status || "open",
            date: new Date(data.date),
            logEntries: JSON.stringify(normalizedIncoming.logEntries),
            supplierEntries: JSON.stringify(normalizedIncoming.supplierEntries),
          },
        });
        await audit({
          actorUsername,
          action: "SHIFT_STARTED",
          category: "OPERATIONS",
          severity: "INFO",
          outcome: "SUCCESS",
          details: { folio: report.folio, shiftId: report.id, shiftName: report.shiftName },
        });
      }

      return { report, existing } as const;
    });
    if ("blocked" in result && result.blocked) {
      await auditService.log({
        actorUsername,
        action: "SHIFT_START_BLOCKED",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "FAILURE",
        details: {
          conflictingShiftFolio: result.blocked.folio,
          responsible: result.blocked.responsibleUser,
        },
      });
      throw new ShiftStartBlockedError(result.blocked);
    }
    for (const log of auditEvents) SocketService.emitToAll("auditLog:created", log);
    const { report, existing } = result;
    const normalizedSaved = normalizeShiftReportEntries(
      report.logEntries,
      report.supplierEntries,
      report.updatedAt.getTime(),
    );
    const enriched = {
      ...report,
      date: formatDateUTCISO(report.date),
      logEntries: normalizedSaved.logEntries,
      supplierEntries: normalizedSaved.supplierEntries,
      syncStatus: "synced",
      lastModified: report.updatedAt.getTime(),
      isDeleted: report.isDeleted || false,
    };

    if (existing) {
      SocketService.emit("shiftReport:updated", enriched);
    } else {
      SocketService.emit("shiftReport:created", enriched);
    }

    return enriched;
  }

  static async addAttendanceNovelty(
    id: string,
    input: { recordId: string; annotation: string; time: string },
    actorUsername: string,
  ) {
    const result = await withDirectTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(17018, hashtext(${"accounting_lock_date"}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(17017, 1)`;
      const report = await tx.shiftReport.findFirst({ where: { id, isDeleted: false } });
      if (!report || report.status !== "open")
        throw new ConflictError("El turno ya no está abierto.");
      const firstRecord = await tx.timeRecord.findFirst({
        where: { id: input.recordId, isDeleted: false },
        select: { employeeId: true },
      });
      if (!firstRecord) throw new NotFoundError("Jornada no encontrada");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"punch:" + firstRecord.employeeId}))`;
      const record = await tx.timeRecord.findFirst({
        where: { id: input.recordId, isDeleted: false },
      });
      if (!record) throw new NotFoundError("Jornada no encontrada");
      if (await TimeRecordService.isRecordLocked(record.date, tx))
        throw new ForbiddenError("La jornada está bloqueada por cierre contable.");
      const normalized = normalizeShiftReportEntries(
        report.logEntries,
        report.supplierEntries,
        report.updatedAt.getTime(),
      );
      const entry = {
        id: ulid(),
        recordId: record.id,
        annotation: input.annotation.trim(),
        time: input.time,
        timestamp: Date.now(),
      };
      const updated = await tx.shiftReport.update({
        where: { id },
        data: { logEntries: JSON.stringify([...normalized.logEntries, entry]) },
      });
      const audit = await tx.auditLog.create({
        data: {
          actorUsername,
          action: "LOG_ENTRY_ADDED",
          category: "OPERATIONS",
          severity: "INFO",
          outcome: "SUCCESS",
          details: {
            shiftFolio: report.folio,
            entryId: entry.id,
            recordId: record.id,
            annotation: entry.annotation,
          },
        },
      });
      return { updated, entry, audit, normalized };
    }, ACCOUNTING_TRANSACTION_OPTIONS);
    SocketService.emitToAll("auditLog:created", result.audit);
    SocketService.emit("shiftReport:updated", {
      ...result.updated,
      date: formatDateUTCISO(result.updated.date),
      logEntries: [...result.normalized.logEntries, result.entry],
      supplierEntries: result.normalized.supplierEntries,
      syncStatus: "synced",
      lastModified: result.updated.updatedAt.getTime(),
    });
    return result.entry;
  }

  /**
   * Partially updates an existing shift report by ID.
   */
  static async update(id: string, data: Partial<ShiftReportInput>, actorUsername: string) {
    const existing = await prisma.shiftReport.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw new NotFoundError("Reporte de turno no encontrado");
    }
    return this.createOrUpdate(
      {
        id: existing.id,
        folio: existing.folio,
        shiftName: data.shiftName ?? existing.shiftName,
        responsibleUser: data.responsibleUser ?? existing.responsibleUser,
        startTime: data.startTime ?? existing.startTime.toISOString(),
        endTime:
          data.endTime !== undefined
            ? data.endTime
            : existing.endTime
              ? existing.endTime.toISOString()
              : null,
        status: data.status ?? existing.status,
        date: data.date ?? formatDateUTCISO(existing.date),
        logEntries: data.logEntries ?? existing.logEntries,
        removedLogEntryIds: data.removedLogEntryIds,
        supplierEntries: data.supplierEntries ?? existing.supplierEntries,
      },
      actorUsername,
    );
  }

  /**
   * Soft-deletes a shift report by ID and emits audit/socket events.
   */
  static async delete(id: string, actorUsername: string) {
    const existing = await prisma.shiftReport.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw new NotFoundError("Reporte de turno no encontrado");
    }
    await withDirectTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(17017, 1)`;
      await tx.shiftReport.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await auditService.log({
        actorUsername,
        action: "SHIFT_REPORT_DELETED",
        category: "OPERATIONS",
        severity: "WARNING",
        outcome: "SUCCESS",
        details: { shiftId: id, folio: existing.folio },
      });
    });
    SocketService.emit("shiftReport:deleted", { id, isDeleted: true });
  }
}
