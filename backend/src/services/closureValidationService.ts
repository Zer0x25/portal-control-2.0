import prisma from "./db";
import { securityAuditService } from "./securityAuditService";
import { schedulingService } from "./schedulingService";
import { safeJsonParse } from "../utils/configUtils";
import {
  addBusinessDaysChile,
  getChileDateISO,
  getMonthEndBusinessDateChile,
} from "../utils/timeUtils";

export interface AnomalyItem {
  id: string;
  employeeName: string;
  date: string;
  status: string;
  employeeId?: string;
  employeeWorkdayType?: string;
  employeeArea?: string;
  employeePosition?: string;
  reason?: string;
  justification?: string | null;
}

export interface PendingCorrectionItem {
  id: string;
  employeeId: string;
  timeRecordId: string;
  recordField: string;
  createdAt: Date;
}

export interface BlockingItems {
  anomalies: AnomalyItem[];
  pendingCorrections: PendingCorrectionItem[];
  total: number;
}

export class ClosureValidationService {
  private async applyAccountingAutoClosure(actorUsername: string): Promise<{
    applied: boolean;
    closureCandidate: string;
    currentLockDate: string | null;
  }> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let targetMonth = month - 2;
    let targetYear = year;
    if (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const monthEnd = getMonthEndBusinessDateChile(targetYear, targetMonth);
    const lockConfig = await prisma.systemConfig.findUnique({
      where: { key: "accounting_lock_date" },
    });

    const currentLockDate = safeJsonParse<string>(lockConfig?.value);
    const closureCandidate = monthEnd;

    if (currentLockDate && closureCandidate <= currentLockDate) {
      return {
        applied: false,
        closureCandidate,
        currentLockDate,
      };
    }

    const manualValidation = await this.validateManualClosure(closureCandidate);

    await prisma.systemConfig.upsert({
      where: { key: "accounting_lock_date" },
      update: { value: JSON.stringify(closureCandidate) },
      create: { key: "accounting_lock_date", value: JSON.stringify(closureCandidate) },
    });

    await prisma.auditLog.create({
      data: {
        actorUsername,
        category: "CTRL_HOURS",
        action: manualValidation.allowed
          ? "CIERRE_CONTABLE_AUTOMATICO_APLICADO"
          : "CIERRE_CONTABLE_AUTOMATICO_CON_ANOMALIAS",
        details: manualValidation.allowed
          ? `Cierre contable automático aplicado hasta ${closureCandidate}.`
          : `Cierre contable automático aplicado hasta ${closureCandidate} con anomalías pendientes.`,
        severity: manualValidation.allowed ? "INFO" : "WARNING",
        metadata: JSON.stringify(manualValidation.details || { lockDate: closureCandidate }),
      },
    });

    return {
      applied: true,
      closureCandidate,
      currentLockDate: currentLockDate || null,
    };
  }

  /**
   * Audits a date range for items that block an accounting closure.
   * @param startDate YYYY-MM-DD
   * @param endDate YYYY-MM-DD
   */
  async getBlockingItems(startDate: string, endDate: string): Promise<BlockingItems> {
    // 1. Find explicit anomalies in the range
    // Note: manual anomalies are blocking items
    const persistedAnomalies: AnomalyItem[] = await prisma.timeRecord.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["AnomaliaManual", "SinMarcajeTurnoAsignado"],
        },
        isDeleted: false,
      },
      select: {
        id: true,
        employeeId: true,
        employeeName: true,
        employeeArea: true,
        employeePosition: true,
        employeeWorkdayType: true,
        date: true,
        status: true,
        justification: true,
      },
    });

    const filteredAnomalies = persistedAnomalies.filter((anomaly) => {
      // If the anomaly is "acknowledged" (Reconocida), it should not block closure
      if (anomaly.justification) {
        try {
          const just = JSON.parse(anomaly.justification);
          if (
            just.type === "ADM_ACK" ||
            just.type === "Reconocida" ||
            just.resolution === "SHIFT_HOURS_ACK" ||
            just.resolution === "ABSENCE_MARK" ||
            just.resolution === "PERMIT_MARK" ||
            just.resolution === "DAY_OFF_MARK" ||
            just.resolution === "VACATION_MARK" ||
            anomaly.justification.includes("Reconocida")
          ) {
            return false; // Valid/Acknowledged anomaly -> Not blocking
          }
        } catch {
          // If parsing fails, treat as blocking unless string contains 'Reconocida'
          if (anomaly.justification.includes("Reconocida")) return false;
        }
      }
      return true;
    });

    // 1.b Missing mark anomalies: assigned workday with no TimeRecord
    const activeEmployees = await prisma.employee.findMany({
      where: { status: "Activo" },
      select: {
        id: true,
        name: true,
        area: true,
        position: true,
        workdayType: true,
      },
    });
    const employeeIds = activeEmployees.map((e) => e.id);

    const todayChile = getChileDateISO();
    const missingMarksEndDate =
      endDate < todayChile ? endDate : addBusinessDaysChile(todayChile, -1);
    const canEvaluateMissingMarks = startDate <= missingMarksEndDate;

    const recordsInRangeForAbsenceCheck =
      employeeIds.length === 0 || !canEvaluateMissingMarks
        ? []
        : await prisma.timeRecord.findMany({
            where: {
              date: { gte: startDate, lte: missingMarksEndDate },
              employeeId: { in: employeeIds },
              isDeleted: false,
            },
            select: { employeeId: true, date: true },
          });

    const existingRecordKeys = new Set(
      recordsInRangeForAbsenceCheck.map((r) => `${r.employeeId}|${r.date}`),
    );

    const scheduleMatrix =
      employeeIds.length === 0 || !canEvaluateMissingMarks
        ? {}
        : await schedulingService.getCalendarMatrix(startDate, missingMarksEndDate, employeeIds);

    const missingMarkAnomalies: AnomalyItem[] = [];
    for (const employee of activeEmployees) {
      const employeeSchedule = scheduleMatrix[employee.id] || {};
      for (const [date, scheduleInfo] of Object.entries(employeeSchedule)) {
        const hasRecord = existingRecordKeys.has(`${employee.id}|${date}`);
        const isBlockingMissingRecord =
          !hasRecord &&
          !!scheduleInfo?.isWorkDay &&
          !scheduleInfo?.isHoliday &&
          !scheduleInfo?.justificationType;

        if (isBlockingMissingRecord) {
          missingMarkAnomalies.push({
            id: `MISSING-${employee.id}-${date}`,
            employeeId: employee.id,
            employeeName: employee.name,
            employeeArea: employee.area,
            employeePosition: employee.position,
            employeeWorkdayType: employee.workdayType,
            date,
            status: "SinMarcajeTurnoAsignado",
            reason: "NO_TIME_RECORD_WITH_ASSIGNED_SHIFT",
          });
        }
      }
    }

    const anomalies = [...filteredAnomalies, ...missingMarkAnomalies];

    // 2. Find pending correction requests for records in the range
    // We find records in the range first, then look for pending corrections for those IDs
    const recordsInRange = await prisma.timeRecord.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        isDeleted: false,
      },
      select: { id: true },
    });
    const recordIds = recordsInRange.map((r) => r.id);

    const pendingCorrections: PendingCorrectionItem[] = await prisma.correctionRequest.findMany({
      where: {
        status: "pending",
        timeRecordId: { in: recordIds },
        isDeleted: false,
      },
      select: {
        id: true,
        employeeId: true,
        timeRecordId: true,
        recordField: true,
        createdAt: true,
      },
    });

    return {
      anomalies,
      pendingCorrections,
      total: anomalies.length + pendingCorrections.length,
    };
  }

  /**
   * Helper to validate if a specific lock date can be applied
   * @param newLockDate YYYY-MM-DD
   */
  async validateManualClosure(
    newLockDate: string,
  ): Promise<{ allowed: boolean; details?: BlockingItems }> {
    // Validate only the pending incremental window since last accounting lock.
    // Previous locked periods are already sealed/reviewed and should not block again.
    const lockConfig = await prisma.systemConfig.findUnique({
      where: { key: "accounting_lock_date" },
      select: { value: true },
    });
    const currentLockDate = safeJsonParse<string>(lockConfig?.value);
    const startDate =
      currentLockDate && currentLockDate < newLockDate
        ? addBusinessDaysChile(currentLockDate, 1)
        : "2000-01-01";

    const blocks = await this.getBlockingItems(startDate, newLockDate);

    return {
      allowed: blocks.total === 0,
      details: blocks,
    };
  }

  /**
   * Proactively audits periods that should be locked soon.
   * Generates critical audit logs if blockers are found.
   */
  async auditClosureHealth(): Promise<void> {
    console.warn("--- Iniciando Auditoría Proactiva de Salud de Cierre (Digital Seal) ---");

    // 1. Verify integrity of existing seals (Digital Seal Check)
    await securityAuditService.verifyDigitalSealIntegrity();
    await securityAuditService.verifyFullChainIntegrity();

    const now = new Date();
    const isFirstOfMonth = now.getDate() === 1;
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Rule: On the 1st of the month, we auto-close everything older than the previous month.
    // Example: On March 1st, January (month - 2) is closed.
    let targetMonth = month - 2;
    let targetYear = year;
    if (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const monthEnd = getMonthEndBusinessDateChile(targetYear, targetMonth);

    const blocks = await this.getBlockingItems(monthStart, monthEnd);

    if (blocks.total > 0) {
      console.warn(
        `[!] Audit detectó ${blocks.total} bloqueadores para el periodo ${targetYear}-${targetMonth}`,
      );

      await prisma.auditLog.create({
        data: {
          category: "SEGURIDAD",
          action: "DETECCION_BLOQUEO_PROACTIVA",
          details: `ATENCIÓN: El periodo ${targetYear}-${targetMonth} contiene ${blocks.total} ítems pendientes. El cierre incondicional se aplicará en el primer día del mes.`,
          severity: "WARNING",
          metadata: JSON.stringify(blocks),
        },
      });
    }

    // 2. Automatic closure triggered on the 1st of each month (Unconditional)
    if (isFirstOfMonth) {
      await this.applyAccountingAutoClosure("SYSTEM");
    }
  }

  async triggerAccountingAutoClosureNow(actorUsername: string): Promise<{
    applied: boolean;
    closureCandidate: string;
    currentLockDate: string | null;
  }> {
    return this.applyAccountingAutoClosure(actorUsername);
  }
}

export const closureValidationService = new ClosureValidationService();
