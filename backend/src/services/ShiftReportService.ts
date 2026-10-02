import prisma from "./db";
import { Prisma } from "@prisma/client";
import { SocketService } from "./socketService";
import { auditService } from "./auditService";
import { formatDateUTCISO } from "../utils/timeUtils";
import { AppError } from "../utils/AppError";

export interface LogEntry {
  id: string;
  time: string;
  annotation: string;
  timestamp: number;
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
  since?: string;
  page?: string | number;
  pageSize?: string | number;
  status?: string;
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
  private static async getNextFolio(): Promise<string> {
    // IMPORTANT: folio is stored as string, so lexicographic ORDER BY is unsafe
    // (e.g., "999" sorts before "1000"). Use numeric MAX from PostgreSQL.
    const rows = await prisma.$queryRaw<Array<{ max_folio: number | null }>>`
      SELECT MAX(CAST(folio AS INTEGER)) AS max_folio
      FROM shift_reports
      WHERE folio ~ '^[0-9]+$'
    `;
    const maxFolio = rows[0]?.max_folio ?? 0;
    const nextFolioNum = maxFolio + 1;
    return String(nextFolioNum).padStart(3, "0");
  }

  private static toNumberTimestamp(value: unknown, fallback: number): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
      const parsedDate = new Date(value).getTime();
      if (Number.isFinite(parsedDate)) return parsedDate;
    }
    return fallback;
  }

  private static toTimeString(value: unknown, timestamp: number): string {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  private static normalizeLogEntry(entry: unknown, idx: number, fallbackTs: number): LogEntry {
    const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const timestamp = this.toNumberTimestamp(e.timestamp, fallbackTs + idx);
    const annotationRaw = e.annotation ?? e.detail ?? e.notes ?? e.message;
    const annotation =
      typeof annotationRaw === "string" && annotationRaw.trim().length > 0
        ? annotationRaw.trim()
        : "Novedad sin detalle";

    return {
      id:
        typeof e.id === "string" && e.id.trim().length > 0
          ? e.id
          : `legacy-log-${timestamp}-${idx}`,
      time: this.toTimeString(e.time, timestamp),
      annotation,
      timestamp,
    };
  }

  private static normalizeSupplierEntry(
    entry: unknown,
    idx: number,
    fallbackTs: number,
  ): SupplierEntry {
    const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const timestamp = this.toNumberTimestamp(e.timestamp, fallbackTs + idx);

    return {
      id:
        typeof e.id === "string" && e.id.trim().length > 0
          ? e.id
          : `legacy-supplier-${timestamp}-${idx}`,
      time: this.toTimeString(e.time, timestamp),
      licensePlate:
        typeof e.licensePlate === "string" && e.licensePlate.trim().length > 0
          ? e.licensePlate.trim()
          : "N/A",
      driverName:
        typeof e.driverName === "string" && e.driverName.trim().length > 0
          ? e.driverName.trim()
          : "N/A",
      paxCount: typeof e.paxCount === "number" && Number.isFinite(e.paxCount) ? e.paxCount : 0,
      company:
        typeof e.company === "string" && e.company.trim().length > 0 ? e.company.trim() : "N/A",
      reason: typeof e.reason === "string" && e.reason.trim().length > 0 ? e.reason.trim() : "N/A",
      timestamp,
    };
  }

  private static normalizeEntries(
    logEntriesRaw: string,
    supplierEntriesRaw: string,
    fallbackTs: number,
  ) {
    let parsedLogEntries: unknown[] = [];
    let parsedSupplierEntries: unknown[] = [];

    try {
      parsedLogEntries = JSON.parse(logEntriesRaw || "[]");
      if (!Array.isArray(parsedLogEntries)) parsedLogEntries = [];
    } catch {
      parsedLogEntries = [];
    }

    try {
      parsedSupplierEntries = JSON.parse(supplierEntriesRaw || "[]");
      if (!Array.isArray(parsedSupplierEntries)) parsedSupplierEntries = [];
    } catch {
      parsedSupplierEntries = [];
    }

    const logEntries = parsedLogEntries
      .map((entry, idx) => this.normalizeLogEntry(entry, idx, fallbackTs))
      .sort((a, b) => a.timestamp - b.timestamp);

    const supplierEntries = parsedSupplierEntries
      .map((entry, idx) => this.normalizeSupplierEntry(entry, idx, fallbackTs))
      .sort((a, b) => a.timestamp - b.timestamp);

    return { logEntries, supplierEntries };
  }

  /**
   * Lists all shift reports with filtering and pagination.
   */
  static async list(params: ShiftReportListParams) {
    const { since, page = 1, pageSize = 50, status } = params;
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);

    const where: Prisma.ShiftReportWhereInput = { isDeleted: false };

    if (since) {
      const sinceDate = new Date(Number(since));
      if (!isNaN(sinceDate.getTime())) {
        where.OR = [{ updatedAt: { gte: sinceDate } }, { status: "open" }];
      }
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
      const normalized = this.normalizeEntries(
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
    const existing = await prisma.shiftReport.findUnique({
      where: { id: data.id },
    });

    let report;

    if (existing) {
      // --- AUDIT GRANULAR CHANGES ---
      const oldNormalized = this.normalizeEntries(
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
      const newNormalized = this.normalizeEntries(newLogRaw, newSupplierRaw, Date.now());
      const newLogEntries = newNormalized.logEntries;
      const newSupplierEntries = newNormalized.supplierEntries;

      // Detect Logbook Changes
      for (const entry of newLogEntries) {
        const original = oldLogEntries.find((old) => old.id === entry.id);
        if (!original) {
          await auditService.log({
            actorUsername,
            action: "LOG_ENTRY_ADDED",
            category: "OPERATIONS",
            severity: "INFO",
            outcome: "SUCCESS",
            details: { shiftFolio: data.folio, entryId: entry.id, annotation: entry.annotation },
          });
        } else if (JSON.stringify(original) !== JSON.stringify(entry)) {
          await auditService.log({
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
          await auditService.log({
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
          await auditService.log({
            actorUsername,
            action: "SUPPLIER_ENTRY_ADDED",
            category: "OPERATIONS",
            severity: "INFO",
            outcome: "SUCCESS",
            details: { shiftFolio: data.folio, entryId: entry.id, company: entry.company },
          });
        } else if (JSON.stringify(original) !== JSON.stringify(entry)) {
          await auditService.log({
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
          await auditService.log({
            actorUsername,
            action: "SUPPLIER_ENTRY_DELETED",
            category: "OPERATIONS",
            severity: "INFO",
            outcome: "SUCCESS",
            details: { shiftFolio: data.folio, entryId: old.id },
          });
        }
      }

      report = await prisma.shiftReport.update({
        where: { id: data.id },
        data: {
          folio: data.folio,
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
        await auditService.log({
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
      const openShift = await prisma.shiftReport.findFirst({
        where: { status: "open" },
      });

      if (openShift) {
        await auditService.log({
          actorUsername,
          action: "SHIFT_START_BLOCKED",
          category: "OPERATIONS",
          severity: "WARNING",
          outcome: "FAILURE",
          details: {
            conflictingShiftFolio: openShift.folio,
            responsible: openShift.responsibleUser,
          },
        });
        const error = new ShiftStartBlockedError(openShift);
        throw error;
      }

      const incomingLogRaw =
        typeof data.logEntries === "string"
          ? data.logEntries
          : JSON.stringify(Array.isArray(data.logEntries) ? data.logEntries : []);
      const incomingSupplierRaw =
        typeof data.supplierEntries === "string"
          ? data.supplierEntries
          : JSON.stringify(Array.isArray(data.supplierEntries) ? data.supplierEntries : []);
      const normalizedIncoming = this.normalizeEntries(
        incomingLogRaw,
        incomingSupplierRaw,
        Date.now(),
      );

      // Folio generation is race-prone if two creates happen in parallel.
      // Retry on unique-folio collisions to guarantee eventual creation.
      const MAX_FOLIO_RETRIES = 5;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < MAX_FOLIO_RETRIES; attempt++) {
        const nextFolio = await this.getNextFolio();
        try {
          report = await prisma.shiftReport.create({
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
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            continue;
          }
          throw error;
        }
      }
      if (!report && lastError) throw lastError;

      await auditService.log({
        actorUsername,
        action: "SHIFT_STARTED",
        category: "OPERATIONS",
        severity: "INFO",
        outcome: "SUCCESS",
        details: { folio: report.folio, shiftId: report.id, shiftName: report.shiftName },
      });
    }

    const normalizedSaved = this.normalizeEntries(
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
}
