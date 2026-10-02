import { TimeRecord } from "@prisma/client";

export interface KpiFilters {
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (inclusive, compat)
  endDateExclusive?: string; // YYYY-MM-DD (exclusive, canonical internal)
  employeeIds?: string[];
  area?: string;
}

export interface DailyMetric {
  date: string;
  isoDate: string;
  dayOfWeek: string;
  scheduledShift: string;
  actualClocks: string;
  scheduledHours: number;
  workedHours: number;
  overtime: number;
  colacionMinutes: number;
  differenceHours: number;
  justificationType?: string;
  isHoliday: boolean;
  status: string;
}

export interface PeriodStats {
  workedHours: number;
  overtimeHours: number;
  scheduledWorkdays: number;
  tardinessCount: number;
  absenceCount: number;
  vacationDays: number;
  medicalLeaveDays: number;
  details: DailyMetric[];
}

export interface KpiSummaryAccumulator {
  totalWorkedHours: number;
  totalOvertimeHours: number;
  totalScheduledWorkdays: number;
  tardinessCount: number;
  absenceCount: number;
  vacationCount: number;
  medicalLeaveCount: number;
  specialPermitCount: number;
}

export interface KpiSummaryDetails {
  tardyRecords: { employeeName: string; date: string; entrada: string }[];
  absentEmployees: Array<Record<string, unknown> & { absenceDate: string }>;
  vacationRecords: { employeeName: string; date: string }[];
  medicalLeaveRecords: { employeeName: string; date: string }[];
  specialPermitRecords: { employeeName: string; date: string }[];
}

export type EnrichedRecord = TimeRecord & {
  entradaTimestamp: number | null;
  inicioColacionTimestamp: number | null;
  finColacionTimestamp: number | null;
  salidaTimestamp: number | null;
  justification: unknown | null;
};

/**
 * A "virtual" time record: no row exists in the database, so a missing mark is
 * synthesized for the UI with a `MISSING-<employeeId>-<date>` id. Only the fields
 * the client needs to resolve or display the anomaly are populated; the rest of
 * the `TimeRecord` columns stay undefined.
 *
 * `TimeRecordService.resolveAnomaly` parses the id back into a real employee and
 * date before writing, which is why the id carries them.
 */
export type VirtualTimeRecord = Pick<
  TimeRecord,
  "id" | "employeeId" | "employeeName" | "date" | "status"
> & {
  justification: unknown | null;
};

/** An entry in `teamStatus.anomalies`: either a stored row or a virtual one. */
export type AnomalyRecord = EnrichedRecord | VirtualTimeRecord;

export interface DashboardStatus {
  employee: { id: string; name: string; position: string };
  status: string;
  lastRecord: EnrichedRecord | null;
}

export interface DashboardOverview {
  teamStatus: {
    present: number;
    total: number;
    anomalies: AnomalyRecord[];
    presentRecords: EnrichedRecord[];
  };
  employeeStatuses: DashboardStatus[];
  timestamp: string;
}
