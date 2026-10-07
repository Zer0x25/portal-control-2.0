import prisma from "./db";
import { NotFoundError } from "../utils/AppError";
import { safeJsonParse } from "../utils/configUtils";
import type { ScheduledReport } from "../generated/prisma/client";

import type { ScheduledReportData } from "../modules/emailReports";
export type { ScheduledReportData } from "../modules/emailReports";
export class ScheduledReportService {
  /**
   * Lists all scheduled reports with normalized data.
   */
  static async list() {
    const reports = await prisma.scheduledReport.findMany({
      orderBy: { createdAt: "desc" },
    });

    return reports.map((r) => this.normalize(r));
  }

  /**
   * Gets a specific scheduled report by ID.
   */
  static async getById(id: string) {
    const report = await prisma.scheduledReport.findUnique({ where: { id } });
    if (!report) return null;
    return this.normalize(report);
  }

  /**
   * Creates a new scheduled report.
   */
  static async create(data: ScheduledReportData, actorUsername: string) {
    const {
      name,
      description,
      reportType,
      frequency,
      cronExpression,
      recipients,
      filters,
      isActive,
    } = data;

    const report = await prisma.scheduledReport.create({
      data: {
        name,
        description,
        reportType,
        frequency,
        cronExpression,
        recipients: Array.isArray(recipients) ? recipients.join(",") : recipients,
        filters: filters ? JSON.stringify(filters) : null,
        isActive: isActive !== false,
        createdBy: actorUsername,
        nextRunAt: this.calculateNextRun(cronExpression),
      },
    });

    return this.normalize(report);
  }

  /**
   * Updates an existing scheduled report.
   */
  static async update(id: string, data: Partial<ScheduledReportData>) {
    const existing = await prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Reporte no encontrado");

    const report = await prisma.scheduledReport.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        reportType: data.reportType ?? existing.reportType,
        frequency: data.frequency ?? existing.frequency,
        cronExpression: data.cronExpression ?? existing.cronExpression,
        recipients: data.recipients
          ? Array.isArray(data.recipients)
            ? data.recipients.join(",")
            : data.recipients
          : existing.recipients,
        filters: data.filters ? JSON.stringify(data.filters) : existing.filters,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
        nextRunAt: data.cronExpression
          ? this.calculateNextRun(data.cronExpression)
          : existing.nextRunAt,
      },
    });

    return this.normalize(report);
  }

  /**
   * Deletes a scheduled report.
   */
  static async delete(id: string) {
    const existing = await prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Reporte no encontrado");

    await prisma.scheduledReport.delete({ where: { id } });
    return true;
  }

  /**
   * Toggles the active status of a report.
   */
  static async toggleStatus(id: string) {
    const existing = await prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Reporte no encontrado");

    const report = await prisma.scheduledReport.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return this.normalize(report);
  }

  /**
   * Normalizes report data for client consumption.
   */
  private static normalize(report: ScheduledReport) {
    return {
      ...report,
      filters: safeJsonParse(report.filters),
      recipients: report.recipients
        ? report.recipients.split(",").map((e: string) => e.trim())
        : [],
    };
  }

  /**
   * Calculates the next run time based on cron expression.
   */
  private static calculateNextRun(cronExpression: string): Date {
    const now = new Date();
    if (cronExpression.includes("0 8 * * 1")) {
      const next = new Date(now);
      next.setDate(next.getDate() + ((7 - next.getDay() + 1) % 7 || 7));
      next.setHours(8, 0, 0, 0);
      return next;
    } else if (cronExpression.includes("0 8 1 * *")) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0, 0);
      return next;
    } else {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      return next;
    }
  }
}
