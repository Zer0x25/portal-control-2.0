import prisma from "./db";
import { ExportService } from "./export/ExportService";
import { EmailService } from "./EmailService";
import { processAutoClosures } from "./autoCloseService";
import { closureValidationService } from "./closureValidationService";
import { holidayService } from "./HolidayService";
import { integrityMaintenanceService } from "./integrityMaintenanceService";
import { seedingJobService } from "./seedingJobService";
import { toBusinessDateChile } from "../utils/timeUtils";
import { toCaughtError } from "../utils/caughtError";

const emailService = new EmailService();
const exportService = new ExportService();
const disableIntegrityAudit = process.env.DISABLE_INTEGRITY_AUDIT === "true";

// System Maintenance Job (Runs daily at 00:00)
function startMaintenanceJobs() {
  const scheduleNextRun = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(now.getDate() + 1);
    nextRun.setHours(0, 0, 0, 0);

    const msUntilNextRun = nextRun.getTime() - now.getTime();
    console.warn(
      `📅 Siguiente mantenimiento programado para las 00:00 (${Math.round(msUntilNextRun / 3600000)}h restantes)`,
    );

    setTimeout(async () => {
      await runMaintenance();
      scheduleNextRun();
    }, msUntilNextRun);
  };

  // Run immediately on startup to ensure data integrity
  runMaintenance();

  // Initialize the cycle
  scheduleNextRun();
}

/**
 * Hourly Auto-Closure Job
 * Ensures shifts exceeding 14h are closed promptly.
 */
function startAutoCloseJob() {
  const HOURLY_INTERVAL = 60 * 60 * 1000;
  console.warn("🕒 Inicializando job de cierre automático de jornadas (Frecuencia: 1h)...");

  setInterval(async () => {
    try {
      await processAutoClosures();
    } catch (error) {
      console.error("Error in hourly auto-closure job:", error);
    }
  }, HOURLY_INTERVAL);

  // Run once on startup
  processAutoClosures().catch((err) => console.error("Initial auto-close failed:", err));
}

async function runMaintenance() {
  try {
    const phase2Running = await seedingJobService.isPhase2Running();
    if (phase2Running) {
      console.warn("Seeder Fase 2 activo: mantenimiento nocturno diferido para evitar contencion.");
      return;
    }

    console.warn("🛠️ Ejecutando tareas de mantenimiento del sistema...");
    await integrityMaintenanceService.runNightlyIntegrityMaintenance();

    // 2. Daily Maintenance (Shift auto-closure is now handled by an hourly job)

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
  intervalId: NodeJS.Timeout;
}

const activeJobs: Map<string, ScheduledReportJob> = new Map();

/**
 * Initialize the scheduler - call this on server startup
 */
export async function initializeScheduler(): Promise<void> {
  console.warn("📅 Inicializando scheduler de reportes...");
  startMaintenanceJobs();
  startAutoCloseJob();

  try {
    const reports = await prisma.scheduledReport.findMany({
      where: { isActive: true },
    });

    for (const report of reports) {
      scheduleReport(report.id, report.frequency);
    }

    console.warn(`ðŸ“… ${reports.length} reportes programados iniciados`);
  } catch (error) {
    console.error("Error initializing scheduler:", error);
  }
}

/**
 * Get interval in milliseconds based on frequency
 */
function getIntervalMs(frequency: string): number {
  switch (frequency) {
    case "daily":
      return 24 * 60 * 60 * 1000; // 24 hours
    case "weekly":
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    case "monthly":
      return 30 * 24 * 60 * 60 * 1000; // ~30 days
    default:
      return 24 * 60 * 60 * 1000; // default to daily
  }
}

/**
 * Schedule a single report using setInterval
 */
export function scheduleReport(reportId: string, frequency: string): boolean {
  try {
    // Cancel existing job if any
    cancelReport(reportId);

    const intervalMs = getIntervalMs(frequency);

    const intervalId = setInterval(async () => {
      await executeReport(reportId);
    }, intervalMs);

    activeJobs.set(reportId, { reportId, intervalId });
    console.warn(`ðŸ“… Report ${reportId} scheduled with frequency: ${frequency}`);

    return true;
  } catch (error) {
    console.error(`Error scheduling report ${reportId}:`, error);
    return false;
  }
}

/**
 * Cancel a scheduled report
 */
export function cancelReport(reportId: string): boolean {
  const job = activeJobs.get(reportId);
  if (job) {
    clearInterval(job.intervalId);
    activeJobs.delete(reportId);
    console.warn(`ðŸ“… Report ${reportId} cancelled`);
    return true;
  }
  return false;
}

/**
 * Execute a scheduled report
 */
export async function executeReport(reportId: string): Promise<void> {
  console.warn(`ðŸ“Š Executing scheduled report: ${reportId}`);

  try {
    const report = await prisma.scheduledReport.findUnique({
      where: { id: reportId },
    });

    if (!report || !report.isActive) {
      console.warn(`Report ${reportId} not found or inactive`);
      cancelReport(reportId);
      return;
    }

    const filters = report.filters ? JSON.parse(report.filters) : {};
    const recipients = report.recipients.split(",").map((e) => e.trim());

    // Generate the report
    const reportBuffer = await exportService.generateReportPDF(report.reportType, filters);

    // Send email with attachment
    const subject = `Reporte Programado: ${report.name}`;
    const body = `
            <h2>Reporte AutomÃ¡tico: ${report.name}</h2>
            <p>Se adjunta el reporte generado automÃ¡ticamente.</p>
            <p><strong>Tipo:</strong> ${getReportTypeName(report.reportType)}</p>
            <p><strong>Frecuencia:</strong> ${getFrequencyName(report.frequency)}</p>
            <p><strong>Generado:</strong> ${new Date().toLocaleString("es-CL")}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Este es un correo automÃ¡tico del sistema de gestiÃ³n de turnos.</p>
        `;

    const filename = `${report.name.replace(/\s+/g, "_")}_${toBusinessDateChile()}.txt`;

    // Send to all recipients
    for (const recipient of recipients) {
      await emailService.sendEmailWithAttachment(recipient, subject, body, reportBuffer, filename);
    }

    // Update last run time and calculate next run
    await prisma.scheduledReport.update({
      where: { id: reportId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(report.frequency),
      },
    });

    console.warn(`âœ… Report ${report.name} sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error(`Error executing report ${reportId}:`, error);
  }
}

/**
 * Get human-readable report type name
 */
function getReportTypeName(type: string): string {
  const types: Record<string, string> = {
    attendance_summary: "Resumen de Asistencia",
    overtime: "Horas Extras",
    anomalies: "AnomalÃ­as Detectadas",
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
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency: string): Date {
  const now = new Date();
  const intervalMs = getIntervalMs(frequency);
  return new Date(now.getTime() + intervalMs);
}

/**
 * Refresh all scheduled jobs (call after report updates)
 */
export async function refreshScheduler(): Promise<void> {
  // Stop all current jobs
  for (const [, job] of activeJobs) {
    clearInterval(job.intervalId);
  }
  activeJobs.clear();

  // Reinitialize
  await initializeScheduler();
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
    const caught = toCaughtError(error);
    return { success: false, message: caught.message || "Error al ejecutar reporte" };
  }
}
