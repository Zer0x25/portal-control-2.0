import { differenceInCalendarDaysCL } from "../utils/timePolicy";

export interface DailyScheduleInput {
  targetDate: string; // YYYY-MM-DD
  activeAssignment?: {
    startDate: string;
    shiftPattern: {
      cycleLengthDays: number;
      dailySchedules: {
        dayIndex: number;
        startTime: string;
        endTime: string;
        isOffDay: boolean;
        hours: number;
        hasColacion: boolean;
        colacionMinutes: number;
        color?: string;
        name?: string;
      }[];
      worksOnHolidays: boolean;
      name: string;
      id: string;
      color?: string;
    };
  };
  leaveOnDate?: {
    type: string;
  };
  holidayOnDate?: {
    name: string;
  };
}

export interface ScheduleDetermination {
  scheduleText: string;
  isWorkDay: boolean;
  isHoliday: boolean;
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
  planningStatus: string;
}

/**
 * PURE DOMAIN LOGIC
 * Follows Principle: Leave > Holiday > Shift Pattern
 */
export function determineDailySchedule(input: DailyScheduleInput): ScheduleDetermination {
  const { targetDate, activeAssignment, leaveOnDate, holidayOnDate } = input;

  // Priority 1: Leave
  if (leaveOnDate) {
    let planningStatus = "PermisoEspecial";
    if (leaveOnDate.type === "Vacaciones") planningStatus = "Vacaciones";
    if (leaveOnDate.type === "Licencia Médica") planningStatus = "LicenciaMedica";

    return {
      scheduleText: leaveOnDate.type,
      isWorkDay: false,
      isHoliday: false,
      justificationType: leaveOnDate.type,
      patternColor: "#8E44AD", // Standard leave color
      planningStatus,
    };
  }

  // Priority 2: No assignment
  if (!activeAssignment) {
    if (holidayOnDate) {
      return {
        scheduleText: `Feriado: ${holidayOnDate.name}`,
        isWorkDay: false,
        isHoliday: true,
        holidayName: holidayOnDate.name,
        planningStatus: "Feriado",
      };
    }
    return {
      scheduleText: "Sin Turno Asignado",
      isWorkDay: false,
      isHoliday: false,
      planningStatus: "SinTurnoAsignado",
    };
  }

  const { shiftPattern, startDate: assignmentStartDate } = activeAssignment;

  // Priority 3: Holiday (if pattern doesn't work on holidays)
  if (holidayOnDate && !shiftPattern.worksOnHolidays) {
    return {
      scheduleText: `Feriado: ${holidayOnDate.name}`,
      isWorkDay: false,
      isHoliday: true,
      holidayName: holidayOnDate.name,
      planningStatus: "Feriado",
    };
  }

  // Step 4: Calculate day in cycle
  // Both operands are calendar business dates (YYYY-MM-DD), so the day delta is
  // computed on the date strings themselves. Using Date here would shift the
  // result by a day because midnight in America/Santiago is not midnight UTC.
  const diffDays = differenceInCalendarDaysCL(assignmentStartDate, targetDate);

  if (diffDays < 0) {
    // Target is before assignment started
    return {
      scheduleText: "Fuera de Vigencia",
      isWorkDay: false,
      isHoliday: !!holidayOnDate,
      holidayName: holidayOnDate?.name,
      planningStatus: "SinTurnoAsignado",
    };
  }

  const dayInCycleIndex = diffDays % shiftPattern.cycleLengthDays;
  const daySchedule = shiftPattern.dailySchedules.find((s) => s.dayIndex === dayInCycleIndex);

  if (!daySchedule || daySchedule.isOffDay) {
    return {
      scheduleText: "Día Libre",
      isWorkDay: false,
      isHoliday: !!holidayOnDate,
      holidayName: holidayOnDate?.name,
      patternColor: shiftPattern.color,
      planningStatus: "DiaLibre",
    };
  }

  // Final result: Work Day
  return {
    scheduleText: `${daySchedule.startTime} - ${daySchedule.endTime}`,
    isWorkDay: true,
    isHoliday: !!holidayOnDate,
    holidayName: holidayOnDate?.name,
    startTime: daySchedule.startTime,
    endTime: daySchedule.endTime,
    hours: daySchedule.hours,
    shiftPatternId: shiftPattern.id,
    shiftPatternName: shiftPattern.name,
    patternColor: shiftPattern.color,
    hasColacion: daySchedule.hasColacion,
    colacionMinutes: daySchedule.colacionMinutes,
    planningStatus: "Programado",
  };
}
