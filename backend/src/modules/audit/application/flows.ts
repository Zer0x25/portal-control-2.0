import { AppError } from "../../../utils/AppError";
import type { AuditDependencies, AuditEntry, AuditQuery, AuditSink } from "./contracts";
export function createAuditFlows<List, Snapshot, Json, Sink extends AuditSink>(
  deps: AuditDependencies<List, Snapshot, Json, Sink>,
) {
  const exportError = () =>
    new AppError("Error al exportar logs de auditoría", 500, "AUDIT_EXPORT_ERROR");
  return {
    async list(query: AuditQuery) {
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
      } = query;
      return {
        success: true,
        data: await deps.list({
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
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
        }),
      };
    },
    async create(input: AuditEntry, context: { username?: string; ip?: string }) {
      const { action, details, category, severity, outcome } = input;
      await deps.log({
        actorUsername: context.username || "SYSTEM",
        action,
        category,
        severity,
        outcome,
        details,
        ipAddress: context.ip,
      });
      return { success: true, message: "Log creado exitosamente" };
    },
    async cleanup(input: { months?: string | number }) {
      const { months = 6 } = input;
      const result = await deps.cleanup(Number(months));
      return {
        success: true,
        data: {
          message: `Se han eliminado ${result.count} registros anteriores a ${result.cutoffDate.toISOString()}`,
          count: result.count,
          cutoffDate: result.cutoffDate,
        },
      };
    },
    status() {
      return { success: true, data: deps.snapshot() };
    },
    async verify() {
      await deps.verify();
      return {
        success: true,
        data: {
          message:
            "Auditoría criptográfica completada. Los resultados se han registrado en la bitácora.",
        },
      };
    },
    async exportJson(query: AuditQuery) {
      try {
        return await deps.exportJson(query);
      } catch {
        throw exportError();
      }
    },
    async exportStream(sink: Sink, query: AuditQuery) {
      try {
        await deps.exportStream(sink, query);
      } catch {
        // An ended native stream has already committed its logical response.
        if (!sink.headersSent && !sink.writableEnded) throw exportError();
        sink.end();
      }
    },
  };
}
export type AuditFlows<Sink extends AuditSink = AuditSink> = ReturnType<
  typeof createAuditFlows<unknown, unknown, unknown, Sink>
>;
