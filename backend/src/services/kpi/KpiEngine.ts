import { TimeRecord } from "@prisma/client";
import { ScheduleInfo } from "../schedulingService";

export interface DailyHours {
  scheduledHours: number;
  workedHours: number;
  overtimeHours: number;
  justificationType?: string;
  isDayOffWorked?: boolean;
}

export class KpiEngine {
  /**
   * Calculates the actual worked hours from a record, deducting breaks if applicable.
   */
  static calculateWorkedHours(record: TimeRecord, scheduleInfo: ScheduleInfo | null): number {
    const entrada = record.entrada ? new Date(record.entrada).getTime() : null;
    const salida = record.salida ? new Date(record.salida).getTime() : null;
    const inicioColacion = record.inicioColacion ? new Date(record.inicioColacion).getTime() : null;
    const finColacion = record.finColacion ? new Date(record.finColacion).getTime() : null;

    if (!entrada || !salida) return 0;

    let totalMillisecondsWorked = salida - entrada;

    // 1. If physical breaks exist, subtract them
    if (inicioColacion && finColacion) {
      const breakDuration = finColacion - inicioColacion;
      if (breakDuration > 0) totalMillisecondsWorked -= breakDuration;
    }
    // 1.5 Incomplete physical break: never subtract open-ended real span.
    // We intentionally fall back to contractual deduction (if configured).
    else if (inicioColacion && !finColacion) {
      if (scheduleInfo?.hasColacion && scheduleInfo.colacionMinutes) {
        const autoDeductMs = scheduleInfo.colacionMinutes * 60 * 1000;
        if (totalMillisecondsWorked > autoDeductMs) {
          totalMillisecondsWorked -= autoDeductMs;
        }
      }
    }
    // 2. Auto-deduction Logic: If NO physical break punches but schedule requires colacion
    else if (scheduleInfo?.hasColacion && scheduleInfo.colacionMinutes) {
      const autoDeductMs = scheduleInfo.colacionMinutes * 60 * 1000;

      if (totalMillisecondsWorked > autoDeductMs) {
        totalMillisecondsWorked -= autoDeductMs;
      }
    }

    return totalMillisecondsWorked > 0 ? totalMillisecondsWorked / (1000 * 60 * 60) : 0;
  }

  /**
   * Calculates the core daily metrics: scheduled, worked, and overtime.
   * Handles "Artículo 22", Holidays, and Justifications.
   */
  static calculateDailyMetrics(
    record: TimeRecord | Record<string, unknown>,
    scheduleInfo: ScheduleInfo | null,
    employeeWorkdayType: string,
  ): DailyHours {
    if (employeeWorkdayType === "Artículo 22") {
      return {
        scheduledHours: 0,
        workedHours: 0,
        overtimeHours: 0,
        justificationType: undefined,
      };
    }

    const workedHours = KpiEngine.calculateWorkedHours(record as TimeRecord, scheduleInfo);

    // Determine Justification
    let justificationType = scheduleInfo?.justificationType;

    if (record.justification) {
      try {
        const just =
          typeof record.justification === "string"
            ? JSON.parse(record.justification)
            : record.justification;
        justificationType = just.type || justificationType;
      } catch {
        // ignore parse error
      }
    }

    // Determine Scheduled Hours
    // Priority: Record override -> Schedule Info -> 0
    let scheduledHours = 0;
    if (record.scheduledHours !== undefined && record.scheduledHours !== null) {
      scheduledHours = Number(record.scheduledHours);
    } else if (scheduleInfo?.isWorkDay) {
      scheduledHours = Number(scheduleInfo.hours || 0);
    }

    if (
      (record.justification && justificationType !== "Feriado") ||
      (justificationType &&
        !record.justification &&
        justificationType !== "Feriado" &&
        !["Normal", "Atraso", "Incompleto"].includes(justificationType))
    ) {
      // 0. Admin Acknowledgement of Anomaly (Neutralize)
      if (
        justificationType === "ADM_ACK" ||
        justificationType === "Reconocida" ||
        (typeof record.justification === "string" && record.justification.includes("Reconocida"))
      ) {
        return {
          scheduledHours: parseFloat(scheduledHours.toFixed(2)),
          workedHours: parseFloat(scheduledHours.toFixed(2)),
          overtimeHours: 0,
          justificationType: "Sin Marcación - Reconocida",
        };
      }
      // Special Handling for Automatic Closure Anomaly
      // If salida is missing but status is AnomaliaManual, assume shift completed (no overtime)
      if (record.status === "AnomaliaManual" && !record.salida) {
        return {
          scheduledHours: parseFloat(scheduledHours.toFixed(2)),
          workedHours: parseFloat(scheduledHours.toFixed(2)),
          overtimeHours: 0,
          justificationType: "Sin Marcación de Salida",
        };
      }

      return {
        scheduledHours: parseFloat(scheduledHours.toFixed(2)),
        workedHours: 0,
        overtimeHours: 0,
        justificationType,
      };
    }

    let overtimeHours = workedHours - scheduledHours;

    // RULE: For long shifts (>= 11h), overtime is strictly 0.
    // Workers can punch out late, but it doesn't count as overtime.
    if (scheduledHours >= 11 && overtimeHours > 0) {
      overtimeHours = 0;
    }

    return {
      scheduledHours: parseFloat(scheduledHours.toFixed(2)),
      workedHours: parseFloat(workedHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      justificationType: undefined,
    };
  }
}
