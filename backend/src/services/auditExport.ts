import { redactAuditFields, type AuditQuery } from "../modules/audit";
import type { ExcelHttpStream } from "../utils/httpStream";
export async function streamAuditExport(res: ExcelHttpStream, filters: AuditQuery) {
  const { startDate, endDate, format = "json", actor, category, severity, outcome } = filters;
  const { streamExportService } = await import("./export/StreamExportService");
  const whereClauses: string[] = [];
  const params: (string | string[] | Date)[] = [];
  let paramIndex = 1;

  if (actor) {
    whereClauses.push(`actor_username ILIKE $${paramIndex}`);
    params.push(`%${actor}%`);
    paramIndex++;
  }

  if (category) {
    const cats = Array.isArray(category) ? category : [category];
    whereClauses.push(`category = ANY($${paramIndex})`);
    params.push(cats);
    paramIndex++;
  }

  if (severity) {
    const sevs = Array.isArray(severity) ? severity : [severity];
    whereClauses.push(`severity = ANY($${paramIndex})`);
    params.push(sevs);
    paramIndex++;
  }

  if (outcome) {
    const outs = Array.isArray(outcome) ? outcome : [outcome];
    whereClauses.push(`outcome = ANY($${paramIndex})`);
    params.push(outs);
    paramIndex++;
  }

  if (startDate) {
    whereClauses.push(`timestamp >= $${paramIndex}`);
    params.push(new Date(startDate));
    paramIndex++;
  }

  if (endDate) {
    const end = new Date(endDate);
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

  const project = (row: Record<string, unknown>) => ({
    ...row,
    ...redactAuditFields(
      typeof row.action === "string" ? row.action : "",
      row.details,
      row.metadata,
    ),
  });
  if (format === "csv") {
    return await streamExportService.streamQueryToCSV(
      res,
      query,
      params,
      headers,
      filename,
      project,
    );
  } else {
    return await streamExportService.streamQueryToXML(
      res,
      query,
      params,
      "AuditLogs",
      "Log",
      filename,
      project,
    );
  }
}
