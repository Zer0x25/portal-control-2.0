import { Employee } from "@prisma/client";
import { KpiSummaryAccumulator, KpiSummaryDetails, PeriodStats } from "./types";

export class KpiAggregationService {
  createSummaryAccumulator(): KpiSummaryAccumulator {
    return {
      totalWorkedHours: 0,
      totalOvertimeHours: 0,
      totalScheduledWorkdays: 0,
      tardinessCount: 0,
      absenceCount: 0,
      vacationCount: 0,
      medicalLeaveCount: 0,
      specialPermitCount: 0,
    };
  }

  createSummaryDetails(): KpiSummaryDetails {
    return {
      tardyRecords: [],
      absentEmployees: [],
      vacationRecords: [],
      medicalLeaveRecords: [],
      specialPermitRecords: [],
    };
  }

  aggregateEmployeeSummary(
    employee: Employee,
    periodStats: PeriodStats,
    summary: KpiSummaryAccumulator,
    details: KpiSummaryDetails,
  ) {
    summary.totalWorkedHours += periodStats.workedHours;
    summary.totalOvertimeHours += periodStats.overtimeHours;
    summary.totalScheduledWorkdays += periodStats.scheduledWorkdays;
    summary.tardinessCount += periodStats.tardinessCount;
    summary.absenceCount += periodStats.absenceCount;
    summary.vacationCount += periodStats.vacationDays;
    summary.medicalLeaveCount += periodStats.medicalLeaveDays;

    periodStats.details.forEach((d) => {
      if (d.status === "Atraso") {
        details.tardyRecords.push({
          employeeName: employee.name,
          date: d.isoDate,
          entrada: d.actualClocks,
        });
      }
      if (d.status === "Ausente") {
        details.absentEmployees.push({ ...employee, absenceDate: d.isoDate });
      }
      if (d.status === "Vacaciones") {
        details.vacationRecords.push({ employeeName: employee.name, date: d.isoDate });
      }
      if (d.status === "Licencia Médica") {
        details.medicalLeaveRecords.push({ employeeName: employee.name, date: d.isoDate });
      }
    });
  }
}
