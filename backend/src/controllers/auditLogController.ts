import { Request, Response } from "express";
import { auditService } from "../services/auditService";
import { securityAuditService } from "../services/securityAuditService";
import { integrityStatusService } from "../services/integrityStatusService";
import { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../utils/AppError";

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const {
    page,
    pageSize,
    cursor,
    actor,
    action,
    category,
    severity,
    outcome,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    recordId,
  } = req.query;

  const result = await auditService.getLogs({
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    cursor: cursor as string,
    actor: actor as string,
    action: action as string,
    category: category as string | string[],
    severity: severity as string | string[],
    outcome: outcome as string | string[],
    startDate: startDate as string,
    endDate: endDate as string,
    sortBy: sortBy as string,
    sortOrder: sortOrder as "asc" | "desc",
    recordId: recordId as string,
  });

  res.json({
    success: true,
    data: result,
  });
});

export const cleanupAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { months = 6 } = req.body;
  const result = await auditService.cleanup(Number(months));

  res.json({
    success: true,
    data: {
      message: `Se han eliminado ${result.count} registros anteriores a ${result.cutoffDate.toISOString()}`,
      count: result.count,
      cutoffDate: result.cutoffDate,
    },
  });
});

export const createAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { action, details, category, severity, outcome } = req.body;
  const actorUsername = (req as AuthRequest).user?.username || "SYSTEM";

  await auditService.log({
    actorUsername,
    action,
    category,
    severity,
    outcome,
    details,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, message: "Log creado exitosamente" });
});
export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format = "json", actor, category, severity, outcome } = req.query;

    // Native Streaming for CSV/XML (Requires direct SQL for performance in large datasets)
    // We keep the raw query here as it is highly specialized for streaming export performance
    // but moved the JSON part (small exports) to the service.
    if (format === "csv" || format === "xml") {
      const { streamExportService } = await import("../services/export/StreamExportService");

      const whereClauses: string[] = [];
      const params: (string | string[] | Date)[] = [];
      let paramIndex = 1;

      if (actor) {
        whereClauses.push(`actor_username ILIKE $${paramIndex}`);
        params.push(`%${actor}%`);
        paramIndex++;
      }

      if (category) {
        const cats = Array.isArray(category) ? (category as string[]) : [category as string];
        whereClauses.push(`category = ANY($${paramIndex})`);
        params.push(cats);
        paramIndex++;
      }

      if (severity) {
        const sevs = Array.isArray(severity) ? (severity as string[]) : [severity as string];
        whereClauses.push(`severity = ANY($${paramIndex})`);
        params.push(sevs);
        paramIndex++;
      }

      if (outcome) {
        const outs = Array.isArray(outcome) ? (outcome as string[]) : [outcome as string];
        whereClauses.push(`outcome = ANY($${paramIndex})`);
        params.push(outs);
        paramIndex++;
      }

      if (startDate) {
        whereClauses.push(`timestamp >= $${paramIndex}`);
        params.push(new Date(startDate as string));
        paramIndex++;
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        whereClauses.push(`timestamp <= $${paramIndex}`);
        params.push(end);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

      const query = `
        SELECT 
          id,
          timestamp,
          actor_username as "actorUsername",
          action,
          category,
          severity,
          outcome,
          details,
          ip_address as "ipAddress",
          metadata
        FROM audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
      `;

      const headers = [
        "id",
        "timestamp",
        "actorUsername",
        "action",
        "category",
        "severity",
        "outcome",
        "details",
        "ipAddress",
        "metadata",
      ];

      const filename = `audit_logs_${startDate || "all"}_${endDate || "all"}.${format}`;

      if (format === "csv") {
        return await streamExportService.streamQueryToCSV(res, query, params, headers, filename);
      } else {
        return await streamExportService.streamQueryToXML(
          res,
          query,
          params,
          "AuditLogs",
          "Log",
          filename,
        );
      }
    }

    // JSON format delegation
    const logs = await auditService.getLogsForExport(req.query);
    res.json(logs);
  } catch {
    if (!res.headersSent) {
      throw new AppError("Error al exportar logs de auditoría", 500, "AUDIT_EXPORT_ERROR");
    } else {
      res.end();
    }
  }
});

export const verifyIntegrity = asyncHandler(async (req: Request, res: Response) => {
  console.warn("[🛡️] Iniciando verificación manual de integridad...");
  await securityAuditService.verifyFullChainIntegrity();

  res.json({
    success: true,
    data: {
      message:
        "Auditoría criptográfica completada. Los resultados se han registrado en la bitácora.",
    },
  });
});

export const getIntegrityStatus = asyncHandler(async (_req: Request, res: Response) => {
  const snapshot = integrityStatusService.getSnapshot();
  res.json({
    success: true,
    data: snapshot,
  });
});
