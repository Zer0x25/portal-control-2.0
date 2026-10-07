import prisma from "./db";
import { redactAuditFields } from "../modules/audit";
import { Prisma } from "../generated/prisma/client";
import { SocketService } from "./socketService";
import { AppError } from "../utils/AppError";
import { toCaughtError } from "../utils/caughtError";

interface AuditLogEntry {
  actorUsername: string;
  action: string;
  category: string;
  severity?: string;
  outcome?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditRequest {
  user?: { username: string };
  ip?: string;
  socket?: { remoteAddress?: string };
  path?: string;
  method?: string;
  query?: unknown;
  body?: unknown;
}

/** Sortable audit log columns accepted by `getLogs`. */
const VALID_SORT_FIELDS = [
  "timestamp",
  "actorUsername",
  "action",
  "category",
  "severity",
  "outcome",
] as const;

type SortField = (typeof VALID_SORT_FIELDS)[number];

const isSortField = (value: string): value is SortField =>
  (VALID_SORT_FIELDS as readonly string[]).includes(value);

/** Fields read by `getLogsForExport` when narrowing an export request's filters. */
interface AuditLogExportParams {
  startDate?: string;
  endDate?: string;
  actor?: string;
  category?: string | string[];
  severity?: string | string[];
  outcome?: string | string[];
}

export const auditService = {
  /**
   * Creates an audit log entry in the database.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const safe = redactAuditFields(entry.action, entry.details, entry.metadata);
      const log = await prisma.auditLog.create({
        data: {
          actorUsername: entry.actorUsername,
          action: entry.action,
          category: entry.category,
          severity: entry.severity || "INFO",
          outcome: entry.outcome || "SUCCESS",
          // Prisma 7 tipa los Json con Exact<...>: se castea al tipo de
          // escritura documentado en lugar de relajar el tipo de entrada.
          details: safe.details as Prisma.InputJsonValue,
          metadata: safe.metadata as Prisma.InputJsonValue,
          ipAddress: entry.ipAddress,
        },
      });

      // Notify clients about new audit log
      SocketService.emitToAll("auditLog:created", {
        ...log,
        details: safe.details,
        metadata: safe.metadata,
      });
    } catch (error) {
      console.error("Error creating audit log:", error);
      // Don't throw - audit logging should not break main flow
    }
  },

  /**
   * Logs a system error with request context if available.
   */
  async logError(
    err: unknown,
    req?: AuditRequest,
    category: string = "SYSTEM_ERROR",
  ): Promise<void> {
    const caught = toCaughtError(err);
    const statusCode = err instanceof AppError ? err.statusCode : caught.statusCode;
    const actorUsername = req?.user?.username || "SYSTEM";
    const ipAddress = req?.ip || req?.socket?.remoteAddress;

    await this.log({
      actorUsername,
      action: "UNHANDLED_ERROR",
      category,
      severity: statusCode >= 500 ? "CRITICAL" : "ERROR",
      outcome: "FAILURE",
      details: {
        message: caught.message,
        name: err instanceof Error ? err.name : "Error",
        code: caught.code,
        stack:
          process.env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined,
      },
      metadata: {
        path: req?.path,
        method: req?.method,
        query:
          req?.query && typeof req.query === "object"
            ? Object.fromEntries(Object.entries(req.query).filter(([key]) => key !== "token"))
            : undefined,
        body:
          category === "AUTH_ERROR" || req?.path?.startsWith("/api/auth/")
            ? undefined
            : (req?.body as Record<string, unknown>),
      },
      ipAddress,
    });
  },

  /**
   * Logs a shift assignment change (create, update, delete).
   */
  async logShiftChange(
    actorUsername: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    details: AuditLogEntry["details"],
  ): Promise<void> {
    await this.log({
      actorUsername,
      action: `SHIFT_ASSIGNMENT_${action}`,
      category: "CTRL_HOURS",
      severity: action === "DELETE" ? "WARNING" : "INFO",
      outcome: "SUCCESS",
      details: {
        ...details,
        resource: "SHIFT_ASSIGNMENT",
      },
    });
  },

  /**
   * Logs a shift pattern change (create, update, delete).
   */
  async logShiftPatternChange(
    actorUsername: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    details: AuditLogEntry["details"],
  ): Promise<void> {
    await this.log({
      actorUsername,
      action: `SHIFT_PATTERN_${action}`,
      category: "OPERATIONS",
      severity: action === "DELETE" ? "WARNING" : "INFO",
      outcome: "SUCCESS",
      details: {
        ...details,
        resource: "SHIFT_PATTERN",
      },
    });
  },

  /**
   * Fetches audit logs with filtering and pagination.
   */
  async getLogs(params: {
    page?: number;
    pageSize?: number;
    cursor?: string;
    actor?: string;
    action?: string;
    category?: string | string[];
    severity?: string | string[];
    outcome?: string | string[];
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    recordId?: string;
  }) {
    const {
      page = 1,
      pageSize = 50,
      cursor,
      actor,
      action,
      category,
      severity,
      outcome,
      startDate,
      endDate,
      sortBy = "timestamp",
      sortOrder = "desc",
      recordId,
    } = params;

    const where: Prisma.AuditLogWhereInput = {};

    if (actor) {
      where.actorUsername = { contains: actor, mode: "insensitive" };
    }

    if (action) {
      where.action = { contains: action, mode: "insensitive" };
    }

    if (category) {
      if (Array.isArray(category)) {
        if (category.length > 0) where.category = { in: category };
      } else {
        where.category = category;
      }
    }

    if (severity) {
      if (Array.isArray(severity)) {
        if (severity.length > 0) where.severity = { in: severity };
      } else {
        where.severity = severity;
      }
    }

    if (outcome) {
      if (Array.isArray(outcome)) {
        if (outcome.length > 0) where.outcome = { in: outcome };
      } else {
        where.outcome = outcome;
      }
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    if (recordId) {
      where.details = { path: ["recordId"], equals: recordId };
    }

    const finalSortBy: SortField = isSortField(sortBy) ? sortBy : "timestamp";
    const finalSortOrder: Prisma.SortOrder = sortOrder === "asc" ? "asc" : "desc";

    const queryOptions: Prisma.AuditLogFindManyArgs = {
      where,
      take: pageSize,
      orderBy: [{ [finalSortBy]: finalSortOrder }, { id: finalSortOrder }],
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    } else {
      queryOptions.skip = (page - 1) * pageSize;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany(queryOptions),
      prisma.auditLog.count({ where }),
    ]);

    const mappedLogs = logs.map((log) => ({
      ...log,
      ...redactAuditFields(log.action, log.details, log.metadata),
    }));

    const nextCursor = logs.length === pageSize ? logs[logs.length - 1].id : null;

    return {
      items: mappedLogs,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
      nextCursor,
    };
  },

  /**
   * Cleans up logs older than a specified number of months.
   */
  async cleanup(months: number) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return {
      count: result.count,
      cutoffDate,
    };
  },

  /**
   * Fetches logs for export with a hard limit.
   */
  async getLogsForExport(params: AuditLogExportParams) {
    const { startDate, endDate, actor, category, severity, outcome } = params;
    const where: Prisma.AuditLogWhereInput = {};

    if (actor) where.actorUsername = { contains: actor, mode: "insensitive" };

    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      if (cats.length > 0) where.category = { in: cats };
    }

    if (severity) {
      const sevs = Array.isArray(severity) ? severity : [severity];
      if (sevs.length > 0) where.severity = { in: sevs };
    }

    if (outcome) {
      const outs = Array.isArray(outcome) ? outcome : [outcome];
      if (outs.length > 0) where.outcome = { in: outs };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 10000,
    });
    return logs.map((log) => ({
      ...log,
      ...redactAuditFields(log.action, log.details, log.metadata),
    }));
  },
};
