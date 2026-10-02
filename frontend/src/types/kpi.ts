import { DailyTimeRecord, Employee } from "./index";

export interface ReportStatKpis {
  tardinessCount: number;
  absenceCount: number;
  vacationCount: number;
  medicalLeaveCount: number;
  specialPermitCount: number;
  overtimePercentage: number;
  avgWeeklyHours: number;
  tardinessRate: number;
  unjustifiedAbsenceRate: number;
  justifiedAbsenceRate: number;
  vacationRate: number;
  medicalLeaveRate: number;
  specialPermitRate: number;
  totalAbsenteeismRate: number;
  absenceRate: number;
}

export interface KpiDetails {
  tardyRecords: DailyTimeRecord[];
  absentEmployees: (Employee & { absenceDate: string })[];
  vacationRecords: { id: string; employeeId: string; date: string; employeeName: string }[];
  medicalLeaveRecords: { id: string; employeeId: string; date: string; employeeName: string }[];
  specialPermitRecords: { id: string; employeeId: string; date: string; employeeName: string }[];
}

export interface KpiCacheItem {
  id: string; // "startDate-endDate-filtersIdentifier"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  filtersIdentifier: string;
  kpis: ReportStatKpis;
  details: KpiDetails;
  timestamp: number;
}

export interface CalendarCacheItem {
  id: string; // YYYY-MM-DD-filterHash
  date: string; // YYYY-MM-DD
  filterHash: string;
  /** The calculated schedule data for that day. Validated as free-form JSON by
   * `CalendarCacheItemSchema`; no consumer reads it yet. */
  data: unknown;
  timestamp: number;
}
