import prisma, { withDirectTransaction } from "./db";
import { hasReportTarget } from "../utils/reportTarget";
import { NotFoundError, ValidationError } from "../utils/AppError";
import { safeJsonParse } from "../utils/configUtils";
import type { ScheduledReport, Prisma } from "../generated/prisma/client";
import { requestContext } from "../utils/context";
import { SocketService } from "./socketService";
import { nextReportRun } from "../utils/reportCron";
import type { ScheduledReportData } from "../modules/emailReports";
export type { ScheduledReportData } from "../modules/emailReports";

export class ScheduledReportService {
  private static async mutate<T>(
    operation: "create" | "update" | "delete",
    write: (tx: Prisma.TransactionClient) => Promise<{ report: ScheduledReport; value: T }>,
    actor = requestContext.getStore()?.username || "SYSTEM",
  ): Promise<T> {
    const result = await withDirectTransaction(async (tx) => {
      const { report, value } = await write(tx);
      const audit = await tx.auditLog.create({
        data: {
          actorUsername: actor,
          action: `SCHEDULEDREPORT_${operation.toUpperCase()}`,
          category: "DATA",
          severity: "INFO",
          outcome: "SUCCESS",
          details: { model: "ScheduledReport", operation, id: report.id },
        },
      });
      return { value, audit };
    });
    SocketService.emitToAll("auditLog:created", result.audit);
    return result.value;
  }
  private static async locked(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM scheduled_reports WHERE id = ${id} FOR UPDATE`;
    const report = await tx.scheduledReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundError("Reporte no encontrado");
    return report;
  }
  static async list() {
    return (await prisma.scheduledReport.findMany({ orderBy: { createdAt: "desc" } })).map(
      (report) => this.normalize(report),
    );
  }
  static async getById(id: string) {
    const report = await prisma.scheduledReport.findUnique({ where: { id } });
    return report ? this.normalize(report) : null;
  }
  static async create(data: ScheduledReportData, actorUsername: string) {
    return this.mutate(
      "create",
      async (tx) => {
        const report = await tx.scheduledReport.create({
          data: {
            name: data.name,
            description: data.description,
            reportType: data.reportType,
            frequency: data.frequency,
            cronExpression: data.cronExpression,
            recipients: Array.isArray(data.recipients)
              ? data.recipients.join(",")
              : data.recipients,
            filters: data.filters == null ? null : JSON.stringify(data.filters),
            isActive: data.isActive !== false,
            createdBy: actorUsername,
            nextRunAt: nextReportRun(data.cronExpression, new Date()),
          },
        });
        return { report, value: this.normalize(report) };
      },
      actorUsername,
    );
  }
  static async update(id: string, data: Partial<ScheduledReportData>) {
    return this.mutate("update", async (tx) => {
      const existing = await this.locked(tx, id);
      if (
        !hasReportTarget(
          data.reportType ?? existing.reportType,
          data.filters === undefined ? safeJsonParse(existing.filters) : data.filters,
        )
      )
        throw new ValidationError("El reporte de turno requiere shiftReportId");
      const report = await tx.scheduledReport.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          reportType: data.reportType,
          frequency: data.frequency,
          cronExpression: data.cronExpression,
          recipients:
            data.recipients === undefined
              ? undefined
              : Array.isArray(data.recipients)
                ? data.recipients.join(",")
                : data.recipients,
          filters:
            data.filters === undefined
              ? undefined
              : data.filters === null
                ? null
                : JSON.stringify(data.filters),
          isActive: data.isActive,
          nextRunAt:
            data.cronExpression !== undefined || (data.isActive === true && !existing.isActive)
              ? nextReportRun(data.cronExpression ?? existing.cronExpression, new Date())
              : undefined,
        },
      });
      return { report, value: this.normalize(report) };
    });
  }
  static async delete(id: string) {
    return this.mutate("delete", async (tx) => {
      await this.locked(tx, id);
      const report = await tx.scheduledReport.delete({ where: { id } });
      return { report, value: true };
    });
  }
  static async toggleStatus(id: string) {
    return this.mutate("update", async (tx) => {
      const existing = await this.locked(tx, id);
      const report = await tx.scheduledReport.update({
        where: { id },
        data: {
          isActive: !existing.isActive,
          nextRunAt: !existing.isActive
            ? nextReportRun(existing.cronExpression, new Date())
            : undefined,
        },
      });
      return { report, value: this.normalize(report) };
    });
  }
  private static normalize(report: ScheduledReport) {
    return {
      ...report,
      filters: safeJsonParse(report.filters),
      recipients: report.recipients
        ? report.recipients.split(",").map((email) => email.trim())
        : [],
    };
  }
}
