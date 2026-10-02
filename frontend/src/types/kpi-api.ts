import { DailyReportItem, ReportStat } from "./reports";
import { KpiDetails, ReportStatKpis } from "./kpi";
import { ClockingStatus } from "./ui";
import { Employee } from "./user";
import { DailyTimeRecord } from "./time";
import { TeamStatus } from "./dashboard";

export interface KpiWorkerEmployeeRef {
  id: string;
}

export interface KpiWorkerFilters {
  employees: KpiWorkerEmployeeRef[];
  startDate: string;
  endDate: string;
}

export interface KpiWorkerPayload {
  filters: KpiWorkerFilters;
}

export interface KpiWorkerResult {
  kpis: ReportStatKpis;
  kpiDetails: KpiDetails;
}

export interface EmployeeWithClockingStatus {
  employee: Employee;
  status: ClockingStatus;
}

export interface DashboardOverviewResponse {
  dailyAttendanceRatio?: number;
  activeShifts?: number;
  pendingLeaves?: number;
  alerts?: string[];
  employeeStatuses?: EmployeeWithClockingStatus[];
  teamStatus?: TeamStatus;
  unscheduledPresent?: DailyTimeRecord[];
}

export interface DetailedReportRequest {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  area?: string;
}

export interface DetailedReportResponse {
  summary: ReportStat[];
  details: Record<string, DailyReportItem[]>;
}

export interface DailyPlanningSummaryResponse {
  date: string;
  stats: Record<string, unknown>;
}
