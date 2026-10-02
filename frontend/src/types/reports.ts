import { LeaveRecord } from "./scheduling";

export interface ReportStat {
  employeeId: string;
  name: string;
  totalHoursWorked: number;
  totalHoursScheduled: number;
  differenceHours: number;
  absenceDays: number;
  tardinessIncidents: number;
  tardinessMinutes: number;
  scheduledDays: number;
  workedDays: number;
}

export interface DailyReportItem {
  date: string;
  isoDate: string;
  dayOfWeek: string;
  scheduledShift: string;
  actualClocks: string;
  scheduledHours: number;
  colacionMinutes: number;
  workedHours: number;
  differenceHours: number;
  justificationType?: LeaveRecord["type"] | "Feriado" | "Ausencia no justificada" | "Anomalía";
}

export type ReportDataType = ReportStat[] | DailyReportItem[];

export type SortableReportKey = keyof ReportStat | keyof DailyReportItem;
