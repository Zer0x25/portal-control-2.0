import { Syncable } from "./common";

export interface LeaveRecord extends Syncable {
  id: string;
  employeeId: string;
  type: "Vacaciones" | "Licencia Médica" | "Permiso Especial";
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface Holiday extends Syncable {
  id: string;
  date: string;
  name: string;
  type: "Nacional" | "Regional" | "Específico";
}

export type BulkCreateHolidayPayload = Pick<Holiday, "name" | "date" | "type"> & { id?: string };

export interface Justification {
  type: LeaveRecord["type"] | "AUTO_CLOSE" | "MANUAL_REPAIR" | "SYSTEM_ANOMALY";
  leaveId?: string;
  reason?: string;
  comment?: string;
}

export interface DayInCycleSchedule {
  dayIndex: number;
  startTime?: string;
  endTime?: string;
  isOffDay: boolean;
  hasColacion: boolean;
  colacionMinutes: number;
  hours?: number;
}

export interface TheoreticalShiftPattern extends Syncable {
  id: string;
  name: string;
  cycleLengthDays: number;
  startDayOfWeek?: number;
  dailySchedules: DayInCycleSchedule[];
  color?: string;
  maxHoursPattern?: number;
  worksOnHolidays?: boolean;
}

export interface AssignedShift extends Syncable {
  id: string;
  employeeId: string;
  employeeName?: string;
  shiftPatternId: string;
  shiftPatternName?: string;
  startDate: string;
  endDate?: string;
}

export interface ScheduleInfo {
  scheduleText: string;
  isWorkDay: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  justificationType?: string;
  startTime?: string;
  endTime?: string;
  hours?: number;
  shiftPatternId?: string;
  shiftPatternName?: string;
  patternColor?: string;
  hasColacion?: boolean;
  colacionMinutes?: number;
  planningStatus?: string;
}
// Pagination Types
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  role?: string;
  since?: string;
  showArchived?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
