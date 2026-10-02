import {
  DailyTimeRecord,
  EmployeeDailyScheduleInfo,
  Employee,
  LeaveRecord,
  ClockingStatus,
} from "../types/index";
import { parseDateOnlyUTC } from "./dateUtils";

/**
 * Calculates the number of hours between two HH:MM time strings, accounting for overnight shifts and optional breaks.
 * @param startTime - The start time in "HH:MM" format.
 * @param endTime - The end time in "HH:MM" format.
 * @param breakMinutes - The duration of the break in minutes.
 * @returns The total hours as a number, rounded to two decimal places. Returns 0 if inputs are invalid.
 */
export const calculateHoursBetween = (
  startTime?: string,
  endTime?: string,
  breakMinutes: number = 0,
): number => {
  if (!startTime || !endTime) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) return 0;

  const startDate = new Date(0, 0, 0, startHour, startMinute, 0);
  let endDate = new Date(0, 0, 0, endHour, endMinute, 0);

  if (endDate.getTime() < startDate.getTime()) {
    // Handles overnight shifts by adding a day
    endDate.setDate(endDate.getDate() + 1);
  }

  let diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return 0;

  const breakMs = breakMinutes * 60 * 1000;
  diffMs -= breakMs;
  if (diffMs < 0) diffMs = 0; // Hours cannot be negative

  return parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)); // Convert ms to hours, round to 2 decimal
};

const calculateWorkedHoursFromRecord = (record: DailyTimeRecord): number => {
  if (!record.entradaTimestamp || !record.salidaTimestamp) {
    return 0;
  }
  let totalMillisecondsWorked = record.salidaTimestamp - record.entradaTimestamp;
  if (record.inicioColacionTimestamp && record.finColacionTimestamp) {
    const breakDuration = record.finColacionTimestamp - record.inicioColacionTimestamp;
    if (breakDuration > 0) {
      totalMillisecondsWorked -= breakDuration;
    }
  }
  return totalMillisecondsWorked > 0 ? totalMillisecondsWorked / (1000 * 60 * 60) : 0;
};

/**
 * Calculates the scheduled, worked, and overtime hours for a given daily record.
 * @param record - The daily time record.
 * @param scheduleInfo - The scheduled shift information for that day.
 * @param employee - The employee object, used to check for special conditions like "Artículo 22".
 * @returns An object containing scheduled, worked, and overtime hours.
 */
export type DailyHours = {
  scheduledHours: number;
  workedHours: number;
  overtimeHours: number;
  /**
   * Why a day is not counted as worked. `"Sin Marcación de Salida"` is set when a
   * shift was auto-closed because the exit punch was never recorded.
   */
  justificationType?:
    | LeaveRecord["type"]
    | "AUTO_CLOSE"
    | "MANUAL_REPAIR"
    | "SYSTEM_ANOMALY"
    | "Sin Marcación de Salida";
};

export const calculateDailyHours = (
  record: DailyTimeRecord,
  scheduleInfo: EmployeeDailyScheduleInfo | null,
  employee?: Employee,
): DailyHours => {
  const workedHours = calculateWorkedHoursFromRecord(record);

  // Prioritize snapshot data from the record itself for historical accuracy
  const justificationType = record.justification
    ? record.justification.type
    : scheduleInfo?.justificationType;
  const scheduledHours =
    record.scheduledHours !== undefined
      ? record.scheduledHours
      : scheduleInfo?.isWorkDay
        ? scheduleInfo.hours || 0
        : 0;

  // Case 1: Articulo 22 employees have their own rules
  if (employee?.workdayType === "Artículo 22") {
    return {
      scheduledHours: 0,
      workedHours: parseFloat(workedHours.toFixed(2)),
      overtimeHours: 0,
      justificationType: undefined,
    };
  }

  // Case 2: Holiday worked (and not a Sunday) is treated as full overtime
  if (scheduleInfo?.isHoliday && scheduleInfo.isWorkDay) {
    const recordDate = parseDateOnlyUTC(record.date);
    if (recordDate.getUTCDay() !== 0) {
      return {
        scheduledHours: 0, // No scheduled hours on a holiday
        workedHours: parseFloat(workedHours.toFixed(2)),
        overtimeHours: parseFloat(workedHours.toFixed(2)), // All worked hours are overtime
        justificationType: undefined,
      };
    }
    // If it IS a Sunday holiday, it falls through to the normal calculation below.
  }

  // Special Case: Automatic Closure Anomaly
  if (record.status === "AnomaliaManual" && !record.salida) {
    return {
      scheduledHours: parseFloat(scheduledHours.toFixed(2)),
      workedHours: parseFloat(scheduledHours.toFixed(2)),
      overtimeHours: 0,
      justificationType: "Sin Marcación de Salida",
    };
  }

  // Case 3: A day is considered justified if it has a leave justification.
  if (record.justification || (justificationType && !record.justification)) {
    return {
      scheduledHours: parseFloat(scheduledHours.toFixed(2)),
      workedHours: 0, // Justified means no work is counted
      overtimeHours: 0, // Justified absence means hours are covered, so the difference is 0.
      justificationType,
    };
  }

  // Case 4: Any unjustified absence (no clock-in, anomalies, etc.) should result in zero difference hours.
  // We identify this if workedHours is 0 on a scheduled day, for a record that isn't active in-progress.
  if (
    scheduleInfo?.isWorkDay &&
    workedHours === 0 &&
    !["Laborando", "Colacion"].includes(record.status)
  ) {
    return {
      scheduledHours: parseFloat(scheduledHours.toFixed(2)),
      workedHours: 0,
      overtimeHours: 0, // An absence, justified or not, is not counted as negative hours.
      justificationType: undefined,
    };
  }

  // Case 5: Normal workday where work was performed, or a Sunday holiday.
  const overtimeHours = workedHours - scheduledHours;
  return {
    scheduledHours: parseFloat(scheduledHours.toFixed(2)),
    workedHours: parseFloat(workedHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
    justificationType: undefined,
  };
};

/**
 * Determines the precise clocking status of an employee based on their time record.
 * This is the single source of truth for employee status throughout the application.
 * @param record The daily time record of the employee.
 * @returns The clocking status as a ClockingStatus enum.
 */
export const getEmployeeClockingStatus = (
  record: DailyTimeRecord | null | undefined,
): ClockingStatus => {
  if (!record || !record.status) {
    return "fuera";
  }

  switch (record.status) {
    case "AnomaliaManual":
      return "jornada_terminada_anomalia";
    case "Completado":
      return "terminada";
    case "Laborando":
    case "Colacion":
      if (record.finColacionTimestamp) return "en_jornada_post_colacion";
      if (record.inicioColacionTimestamp) return "en_colacion";
      if (record.entradaTimestamp) return "en_jornada";
      // This case should not happen if status is active, but as a fallback:
      return "fuera";
    default:
      return "fuera";
  }
};
