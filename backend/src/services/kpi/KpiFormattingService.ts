import { Employee, TimeRecord } from "@prisma/client";
import {
  DailyMetric,
  EnrichedRecord,
  KpiSummaryAccumulator,
  KpiSummaryDetails,
  PeriodStats,
} from "./types";

export class KpiFormattingService {
  buildSummaryResponse(
    summary: KpiSummaryAccumulator,
    details: KpiSummaryDetails,
    startDate: string,
    endDate: string,
    employeeCount: number,
  ) {
    const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
    const numberOfWeeks = Math.max(1, (Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1) / 7);
    const avgWeeklyHours =
      employeeCount > 0 ? summary.totalWorkedHours / numberOfWeeks / employeeCount : 0;
    const totalScheduled = summary.totalScheduledWorkdays;

    const unjustifiedAbsenceRate =
      totalScheduled > 0 ? (summary.absenceCount / totalScheduled) * 100 : 0;
    const vacationRate = totalScheduled > 0 ? (summary.vacationCount / totalScheduled) * 100 : 0;
    const medicalLeaveRate =
      totalScheduled > 0 ? (summary.medicalLeaveCount / totalScheduled) * 100 : 0;
    const specialPermitRate =
      totalScheduled > 0 ? (summary.specialPermitCount / totalScheduled) * 100 : 0;

    const justifiedAbsenceRate = vacationRate + medicalLeaveRate + specialPermitRate;
    const totalAbsenteeismRate = unjustifiedAbsenceRate + justifiedAbsenceRate;
    const tardinessRate = totalScheduled > 0 ? (summary.tardinessCount / totalScheduled) * 100 : 0;
    const overtimePercentage =
      summary.totalWorkedHours > 0
        ? (summary.totalOvertimeHours / summary.totalWorkedHours) * 100
        : 0;

    return {
      kpis: {
        ...summary,
        avgWeeklyHours: this.round2(avgWeeklyHours),
        tardinessRate: this.round2(tardinessRate),
        unjustifiedAbsenceRate: this.round2(unjustifiedAbsenceRate),
        justifiedAbsenceRate: this.round2(justifiedAbsenceRate),
        vacationRate: this.round2(vacationRate),
        medicalLeaveRate: this.round2(medicalLeaveRate),
        specialPermitRate: this.round2(specialPermitRate),
        totalAbsenteeismRate: this.round2(totalAbsenteeismRate),
        absenceRate: this.round2(unjustifiedAbsenceRate),
        overtimePercentage: this.round2(overtimePercentage),
      },
      kpiDetails: details,
    };
  }

  buildDetailedReport(employees: Employee[], allEmpStats: PeriodStats[]) {
    const summary: {
      employeeId: string;
      name: string;
      totalHoursWorked: number;
      totalHoursScheduled: number;
      differenceHours: number;
      absenceDays: number;
      tardinessIncidents: number;
      scheduledDays: number;
      workedDays: number;
    }[] = [];
    const details: Record<string, DailyMetric[]> = {};

    for (let idx = 0; idx < allEmpStats.length; idx++) {
      const empStats = allEmpStats[idx];
      const emp = employees[idx];
      details[emp.id] = empStats.details;

      const totalHoursScheduled = empStats.details.reduce((s, d) => s + d.scheduledHours, 0);
      summary.push({
        employeeId: emp.id,
        name: emp.name,
        totalHoursWorked: this.round2(empStats.workedHours),
        totalHoursScheduled: this.round2(totalHoursScheduled),
        differenceHours: this.round2(empStats.workedHours - totalHoursScheduled),
        absenceDays: empStats.absenceCount,
        tardinessIncidents: empStats.tardinessCount,
        scheduledDays: empStats.scheduledWorkdays,
        workedDays: empStats.details.filter((d) => d.workedHours > 0).length,
      });
    }

    return { summary, details };
  }

  getEmployeeClockingStatus(record: TimeRecord | null | undefined): string {
    if (!record || !record.status) return "fuera";
    switch (record.status) {
      case "AnomaliaManual":
        return "jornada_terminada_anomalia";
      case "Completado":
        return "terminada";
      case "Laborando":
      case "Colacion":
        if (record.finColacion) return "en_jornada_post_colacion";
        if (record.inicioColacion) return "en_colacion";
        if (record.entrada) return "en_jornada";
        return "fuera";
      default:
        return "fuera";
    }
  }

  enrichRecord(rec: TimeRecord): EnrichedRecord {
    return {
      ...rec,
      entradaTimestamp: rec.entrada ? new Date(rec.entrada).getTime() : null,
      inicioColacionTimestamp: rec.inicioColacion ? new Date(rec.inicioColacion).getTime() : null,
      finColacionTimestamp: rec.finColacion ? new Date(rec.finColacion).getTime() : null,
      salidaTimestamp: rec.salida ? new Date(rec.salida).getTime() : null,
      justification: rec.justification
        ? typeof rec.justification === "string"
          ? JSON.parse(rec.justification)
          : rec.justification
        : null,
    };
  }

  private round2(n: number) {
    return parseFloat(n.toFixed(2));
  }
}
