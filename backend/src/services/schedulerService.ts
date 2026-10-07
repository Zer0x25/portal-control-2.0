import { systemOperationService } from "./systemOperationService";
import prisma from "./db";
import { ExportService } from "./export/ExportService";
import { EmailService } from "./EmailService";
import { createRuntimeLifecycle } from "../modules/runtime";
import { logger } from "../utils/logger";
import { closureValidationService } from "./closureValidationService";
import { holidayService } from "./HolidayService";
import { integrityMaintenanceService } from "./integrityMaintenanceService";
import { seedingJobService } from "./seedingJobService";
import { toBusinessDateChile } from "../utils/timeUtils";
import { nextReportRun, REPORT_TIMEZONE } from "../utils/reportCron";
import { AppError } from "../utils/AppError";

const emailService = new EmailService();
const exportService = new ExportService();
const disableIntegrityAudit = process.env.DISABLE_INTEGRITY_AUDIT === "true";

let lifecycle = newLifecycle();
function newLifecycle() {
  return createRuntimeLifecycle({
    after: (ms, task) => {
      const id = setTimeout(task, ms);
      return () => clearTimeout(id);
    },
    every: (ms, task) => {
      const id = setInterval(task, ms);
      return () => clearTimeout(id);
    },
    reportError: (error) => logger.error("Scheduled task failed", error),
  });
}
let initialized = false;
let stopped = false;
let revision = 0;
function startMaintenanceJobs() {
  void lifecycle.run(runMaintenance);
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    lifecycle.after(next.getTime() - now.getTime(), async () => {
      await runMaintenance();
      scheduleNext();
    });
  };
  scheduleNext();
}

async function runMaintenance() {
  try {
    if (systemOperationService.isMaintenanceModeActive()) return;
    const phase2Running = await seedingJobService.isPhase2Running();
    if (phase2Running) {
      console.warn("Seeder Fase 2 activo: mantenimiento nocturno diferido para evitar contencion.");
      return;
    }

    console.warn("🛠️ Ejecutando tareas de mantenimiento del sistema...");
    await integrityMaintenanceService.runNightlyIntegrityMaintenance();

    // Auto-closure belongs to the shared runtime runner (5 minutes, distributed lock).

    // 3. Proactive closure audit
    if (disableIntegrityAudit) {
      console.warn("Integrity audit task is paused (DISABLE_INTEGRITY_AUDIT=true).");
    } else {
      await closureValidationService.auditClosureHealth();
    }

    // 4. Proactive Holiday Sync (Checks if current year is populated)
    const disableHolidayAutosync = process.env.DISABLE_HOLIDAY_AUTOSYNC === "true";
    if (disableHolidayAutosync) {
      console.warn("Holiday autosync task is paused (DISABLE_HOLIDAY_AUTOSYNC=true).");
    } else {
      await holidayService.getHolidays();
    }

    console.warn("Daily maintenance tasks completed.");
  } catch (error) {
    console.error("Critical error during maintenance task:", error);
  }
}

interface ScheduledReportJob {
  reportId: string;
  intervalId?: NodeJS.Timeout;
}

const activeJobs: Map<string, ScheduledReportJob> = new Map();

/**
 * Initialize the scheduler - call this on server startup
 */
export async function initializeScheduler(): Promise<void> {
  console.warn("📅 Inicializando scheduler de reportes...");
  if (initialized) return;
  initialized = true;
  stopped = false;
  startMaintenanceJobs();

  try {
    const reports = await prisma.scheduledReport.findMany({
      where: { isActive: true },
    });

    for (const report of reports) {
      scheduleReport(report.id, report.cronExpression, report.nextRunAt);
    }

    console.warn(`ðŸ“… ${reports.length} reportes programados iniciados`);
  } catch (error) {
    console.error("Error initializing scheduler:", error);
  }
}

/** Schedule by cron, checking the persisted due time instead of fixed-day intervals. */
export function scheduleReport(
  reportId: string,
  cronExpression: string,
  due?: Date | null,
): boolean {
  if (stopped) return false;
  cancelReport(reportId);
  try {
    const next = due ?? nextReportRun(cronExpression, new Date());
    const job: ScheduledReportJob = { reportId };
    const arm = (at: Date) => {
      const delay = Math.max(0, at.getTime() - Date.now());
      // Node timers overflow beyond ~24.8 days: wake in chunks, keep the same due time.
      job.intervalId = setTimeout(
        async () => {
          if (stopped || activeJobs.get(reportId) !== job) return;
          if (Date.now() < at.getTime()) {
            arm(at);
            return;
          }
          await lifecycle.run(async () => {
            try {
              await executeReport(reportId, true);
            } finally {
              if (!stopped && activeJobs.get(reportId) === job) {
                const report = await prisma.scheduledReport.findUnique({ where: { id: reportId } });
                if (!report?.isActive) {
                  cancelReport(reportId);
                  return;
                }
                const now = new Date();
                arm(
                  report.nextRunAt && report.nextRunAt > now
                    ? report.nextRunAt
                    : nextReportRun(report.cronExpression, now),
                );
              }
            }
          });
        },
        Math.min(delay, 2147483647),
      );
    };
    // Validate even when a persisted nextRunAt exists.
    nextReportRun(cronExpression, new Date());
    activeJobs.set(reportId, job);
    arm(next);
    return true;
  } catch (error) {
    logger.error("No se pudo programar el reporte", { reportId, error });
    return false;
  }
}

/**
 * Cancel a scheduled report
 */
export function cancelReport(reportId: string): boolean {
  const job = activeJobs.get(reportId);
  if (job) {
    clearTimeout(job.intervalId);
    activeJobs.delete(reportId);
    console.warn(`ðŸ“… Report ${reportId} cancelled`);
    return true;
  }
  return false;
}

/**
 * Execute a scheduled report
 */
const executingReports = new Set<string>();
const reportExecutions = new Set<Promise<void>>();
export function openSchedulerRuntime(): void {
  if (reportExecutions.size) throw new AppError("Reportes aún drenando", 409, "CONFLICT");
  stopped = false;
}
export async function executeReport(reportId: string, onlyDue = false): Promise<void> {
  if (stopped || systemOperationService.isMaintenanceModeActive()) {
    throw new AppError("Scheduler no disponible por mantenimiento o cierre", 409, "CONFLICT");
  }
  const pending = Promise.resolve().then(() => executeReportWork(reportId, onlyDue));
  reportExecutions.add(pending);
  try {
    await pending;
  } finally {
    reportExecutions.delete(pending);
  }
}
async function executeReportWork(reportId: string, onlyDue: boolean): Promise<void> {
  if (executingReports.has(reportId)) throw new AppError("Reporte en ejecución", 409, "CONFLICT");
  executingReports.add(reportId);
  try {
    const report = await prisma.scheduledReport.findUnique({ where: { id: reportId } });
    if (!report?.isActive) {
      cancelReport(reportId);
      throw new AppError("Reporte no encontrado o inactivo", 404, "NOT_FOUND");
    }
    if (onlyDue && report.nextRunAt && report.nextRunAt > new Date()) return;
    const nextRunAt = nextReportRun(report.cronExpression, new Date());
    // Only timer-driven occurrences have a due-time token shared by every process.
    if (onlyDue) {
      const claim = await prisma.scheduledReport.updateMany({
        where: {
          id: reportId,
          isActive: true,
          cronExpression: report.cronExpression,
          nextRunAt: report.nextRunAt,
        },
        data: { nextRunAt },
      });
      if (claim.count !== 1) return;
    }
    let delivered = false;
    try {
      const filters = report.filters ? JSON.parse(report.filters) : {};
      const recipients = report.recipients
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const reportBuffer = await exportService.generateReportPDF(report.reportType, filters);
      const subject = `Reporte Programado: ${report.name}`;
      const body = `<h2>Reporte Automático: ${report.name}</h2>
        <p>Se adjunta el reporte generado automáticamente.</p>
        <p><strong>Tipo:</strong> ${getReportTypeName(report.reportType)}</p>
        <p><strong>Frecuencia:</strong> ${getFrequencyName(report.frequency)}</p>
        <p><strong>Generado:</strong> ${new Date().toLocaleString("es-CL", { timeZone: REPORT_TIMEZONE })}</p>`;
      const extension = reportBuffer.subarray(0, 5).toString("ascii") === "%PDF-" ? "pdf" : "txt";
      const filename = `${report.name.replace(/\s+/g, "_")}_${toBusinessDateChile()}.${extension}`;
      if (recipients.length === 0) throw new Error("Reporte sin destinatarios");
      for (const recipient of recipients) {
        const result = await emailService.sendEmailWithAttachment(
          recipient,
          subject,
          body,
          reportBuffer,
          filename,
        );
        if (!result.success) throw new Error("No se pudo entregar el reporte");
      }
      delivered = true;
    } finally {
      // A concurrent edit/toggle owns its newly calculated schedule.
      await prisma.scheduledReport.updateMany({
        where: {
          id: reportId,
          isActive: true,
          cronExpression: report.cronExpression,
          nextRunAt: onlyDue ? nextRunAt : report.nextRunAt,
        },
        data: { ...(delivered ? { lastRunAt: new Date() } : {}), nextRunAt },
      });
    }
  } finally {
    executingReports.delete(reportId);
  }
}

/**
 * Get human-readable report type name
 */
function getReportTypeName(type: string): string {
  const types: Record<string, string> = {
    attendance_summary: "Resumen de Asistencia",
    overtime: "Horas Extras",
    anomalies: "Anomalías Detectadas",
    shift_coverage: "Cobertura de Turnos",
  };
  return types[type] || type;
}

/**
 * Get human-readable frequency name
 */
function getFrequencyName(frequency: string): string {
  const frequencies: Record<string, string> = {
    daily: "Diario",
    weekly: "Semanal",
    monthly: "Mensual",
  };
  return frequencies[frequency] || frequency;
}

/**
 * Refresh all scheduled jobs (call after report updates)
 */
export async function refreshScheduler(): Promise<void> {
  if (stopped || !initialized) return;
  const current = ++revision;
  // Stop all current jobs
  for (const [, job] of activeJobs) {
    clearTimeout(job.intervalId);
  }
  activeJobs.clear();

  // Reinitialize
  try {
    const reports = await prisma.scheduledReport.findMany({ where: { isActive: true } });
    if (stopped || current !== revision) return;
    for (const report of reports)
      scheduleReport(report.id, report.cronExpression, report.nextRunAt);
  } catch (error) {
    logger.error("Error refreshing scheduler", error);
  }
}

export async function stopScheduler(): Promise<void> {
  stopped = true;
  revision++;
  for (const job of activeJobs.values()) clearTimeout(job.intervalId);
  activeJobs.clear();
  await lifecycle.stop(async () => {
    await Promise.allSettled(reportExecutions);
  });
  initialized = false;
  lifecycle = newLifecycle();
}

/**
 * Get status of all scheduled jobs
 */
export function getSchedulerStatus(): { reportId: string; isRunning: boolean }[] {
  return Array.from(activeJobs.entries()).map(([reportId]) => ({
    reportId,
    isRunning: true,
  }));
}

/**
 * Manually trigger a report execution (for testing)
 */
export async function triggerReport(
  reportId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await executeReport(reportId);
    return { success: true, message: "Reporte ejecutado exitosamente" };
  } catch (error: unknown) {
    logger.error("Error al ejecutar reporte", { reportId, error });
    return { success: false, message: "Error al ejecutar reporte" };
  }
}
