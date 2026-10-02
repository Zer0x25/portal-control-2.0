import { AttendanceRecord, DailyTimeRecord } from "./time";
import { Employee } from "./user";
import { AssignedShift, TheoreticalShiftPattern, LeaveRecord } from "./scheduling";

export type PlanningStatus =
  | "Programado"
  | "DiaLibre"
  | "Vacaciones"
  | "LicenciaMedica"
  | "PermisoEspecial"
  | "Feriado"
  | "SinTurnoAsignado";

export interface EmployeeDailyScheduleInfo {
  scheduleText: string;
  isWorkDay: boolean;
  planningStatus: PlanningStatus;
  startTime?: string;
  endTime?: string;
  hours?: number;
  shiftPatternId?: string;
  shiftPatternName?: string;
  patternColor?: string;
  hasColacion?: boolean;
  colacionMinutes?: number;
  justificationType?: LeaveRecord["type"] | "AUTO_CLOSE" | "MANUAL_REPAIR" | "SYSTEM_ANOMALY";
  isHoliday?: boolean;
  holidayName?: string;
}

export interface EnrichedTimeRecord extends DailyTimeRecord {
  scheduleInfo: EmployeeDailyScheduleInfo | null;
}

export interface LeaveDisplayRecord {
  isVirtual: true;
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  employeeArea: string;
  justificationType:
    LeaveRecord["type"] | "Feriado" | "AUTO_CLOSE" | "MANUAL_REPAIR" | "SYSTEM_ANOMALY";
}

export type DisplayRecord = EnrichedTimeRecord | LeaveDisplayRecord;

/**
 * Representa un registro de marcaje aumentado con indicadores de KPI
 * provenientes del backend (calculados por KpiEngine).
 */
export interface AugmentedTimeRecord extends AttendanceRecord {
  workedHours: number;
  overtimeHours: number;
  scheduledHours: number;
  isDayOffWorked: boolean;
  scheduleInfo: EmployeeDailyScheduleInfo | null;
}

export interface EmployeeWithShiftDetails extends Employee {
  assignedShiftsDetails: Array<
    AssignedShift & {
      patternDetails: TheoreticalShiftPattern | undefined;
    }
  >;
}

export interface MonthlyDayScheduleView {
  dateIso: string;
  dayOfWeek: string;
  dayOfMonth: number;
  scheduleText: string;
  isWorkDay: boolean;
}

export interface ScheduledEmployeeDetail {
  employeeId: string;
  employeeName: string;
  shiftPatternName: string;
  startTime?: string;
  endTime?: string;
  patternColor?: string;
}
