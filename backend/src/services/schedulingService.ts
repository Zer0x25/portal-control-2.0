import {
  AssignedShift,
  Employee,
  Holiday,
  LeaveRecord,
  ShiftPattern,
  EmployeeStatus,
} from "@prisma/client";
import prisma from "./db";
import {
  formatDateUTCISO,
  getChileDateISO,
  parseBusinessDateChile,
  parseDateOnlyUTC,
} from "../utils/timeUtils";
import { determineDailySchedule, DailyScheduleInput } from "../domain/schedulingRules";

export interface PatternSchedule {
  dayIndex: number;
  startTime?: string | null;
  endTime?: string | null;
  isOffDay: boolean;
  hasColacion: boolean;
  colacionMinutes?: number | null;
  hours?: number | null;
}

export type ShiftPatternWithSchedules = ShiftPattern & {
  dailySchedules: PatternSchedule[];
};

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

export interface SchedulingContext {
  assignedShifts: AssignedShift[];
  shiftPatterns: ShiftPatternWithSchedules[];
  leaves: LeaveRecord[];
  holidays: Holiday[];
  // Metadata for indexing
  indexedShifts?: Map<string, AssignedShift[]>;
  indexedLeaves?: Map<string, LeaveRecord[]>;
  indexedHolidays?: Map<string, Holiday>;
}

interface ScheduledEmployeeDetail {
  employeeId: string;
  employeeName: string;
  shiftPatternName: string;
  startTime?: string;
  endTime?: string;
  patternColor?: string;
}

interface MonthlyDayScheduleView {
  dateIso: string;
  dayOfWeek: string;
  dayOfMonth: number;
  scheduleText: string;
  isWorkDay: boolean;
}

class SchedulingService {
  /**
   * Determines an employee's schedule for a specific date using Domain Rules.
   * Handles priority: Leave > Holiday > Shift Pattern > No Assignment
   */
  async getEmployeeDailyScheduleInfo(
    employeeId: string,
    targetDate: Date,
    context?: SchedulingContext,
    employeeData?: Employee,
  ): Promise<ScheduleInfo | null> {
    const targetDateString = getChileDateISO(targetDate);

    let employee = employeeData;
    let assignedShifts: AssignedShift[] = [];
    let leaves: LeaveRecord[] = [];
    let holidays: Holiday[] = [];
    let shiftPatterns: ShiftPatternWithSchedules[] = [];

    if (context) {
      if (context.indexedShifts && context.indexedLeaves && context.indexedHolidays) {
        assignedShifts = (context.indexedShifts.get(employeeId) || []).filter(
          (a) => targetDateString >= a.startDate && (!a.endDate || targetDateString <= a.endDate),
        );
        leaves = (context.indexedLeaves.get(employeeId) || []).filter(
          (l) => targetDateString >= l.startDate && targetDateString <= l.endDate,
        );
        const hol = context.indexedHolidays.get(targetDateString);
        holidays = hol ? [hol] : [];
      } else {
        assignedShifts = context.assignedShifts.filter(
          (a) =>
            a.employeeId === employeeId &&
            targetDateString >= a.startDate &&
            (!a.endDate || targetDateString <= a.endDate),
        );
        leaves = context.leaves.filter(
          (l) =>
            l.employeeId === employeeId &&
            targetDateString >= l.startDate &&
            targetDateString <= l.endDate,
        );
        holidays = context.holidays.filter((h) => h.date === targetDateString);
      }
      shiftPatterns = context.shiftPatterns;
      if (!employee) employee = { id: employeeId } as Employee;
    } else {
      const [dbEmployee, dbShifts, dbLeaves, dbHolidays] = await Promise.all([
        prisma.employee.findUnique({ where: { id: employeeId } }),
        prisma.assignedShift.findMany({
          where: {
            employeeId,
            startDate: { lte: targetDateString },
            OR: [{ endDate: null }, { endDate: { gte: targetDateString } }],
          },
        }),
        prisma.leaveRecord.findMany({
          where: {
            employeeId,
            startDate: { lte: targetDateString },
            endDate: { gte: targetDateString },
          },
        }),
        prisma.holiday.findMany({ where: { date: targetDateString } }),
      ]);
      employee = dbEmployee;
      assignedShifts = dbShifts;
      leaves = dbLeaves;
      holidays = dbHolidays;
    }

    if (!employee) return null;

    const activeAssignmentRaw = assignedShifts[0];
    let activeAssignment = undefined;

    if (activeAssignmentRaw) {
      let patternRaw;
      if (context) {
        patternRaw = shiftPatterns.find((p) => p.id === activeAssignmentRaw.shiftPatternId);
      } else {
        patternRaw = await prisma.shiftPattern.findUnique({
          where: { id: activeAssignmentRaw.shiftPatternId },
        });
      }

      if (patternRaw && patternRaw.cycleLengthDays > 0) {
        activeAssignment = {
          startDate: activeAssignmentRaw.startDate,
          shiftPattern: {
            ...patternRaw,
            dailySchedules:
              typeof patternRaw.dailySchedules === "string"
                ? JSON.parse(patternRaw.dailySchedules)
                : patternRaw.dailySchedules,
          },
        };
      }
    }

    const input: DailyScheduleInput = {
      targetDate: targetDateString,
      activeAssignment: activeAssignment as DailyScheduleInput["activeAssignment"],
      leaveOnDate: leaves[0] ? { type: leaves[0].type } : undefined,
      holidayOnDate: holidays[0] ? { name: holidays[0].name } : undefined,
    };

    const determination = determineDailySchedule(input);

    // Map domain result back to service interface (backwards compatibility)
    return {
      ...determination,
      patternColor: determination.patternColor || undefined,
    };
  }

  /**
   * Get all employees scheduled to work on a specific date.
   */
  async getScheduledEmployeesOnDate(targetDate: Date): Promise<ScheduledEmployeeDetail[]> {
    // Get all active employees
    const activeEmployees = await prisma.employee.findMany({
      where: { status: "Activo" },
      select: { id: true, name: true },
    });

    const results: ScheduledEmployeeDetail[] = [];

    for (const employee of activeEmployees) {
      const scheduleInfo = await this.getEmployeeDailyScheduleInfo(employee.id, targetDate);

      if (scheduleInfo?.isWorkDay) {
        results.push({
          employeeId: employee.id,
          employeeName: employee.name,
          shiftPatternName: scheduleInfo.shiftPatternName || "N/A",
          startTime: scheduleInfo.startTime,
          endTime: scheduleInfo.endTime,
          patternColor: scheduleInfo.patternColor,
        });
      }
    }

    return results;
  }

  /**
   * Get the full monthly schedule for an employee.
   */
  async getEmployeeScheduleForMonth(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<MonthlyDayScheduleView[]> {
    const schedule: MonthlyDayScheduleView[] = [];

    // JS months are 0-indexed
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0)); // Last day of the month

    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const scheduleInfo = await this.getEmployeeDailyScheduleInfo(employeeId, d);
      const dateIso = formatDateUTCISO(d);
      const dayOfWeek = d.toLocaleDateString("es-CL", {
        weekday: "short",
        timeZone: "UTC",
      });

      schedule.push({
        dateIso,
        dayOfWeek,
        dayOfMonth: d.getUTCDate(),
        scheduleText: scheduleInfo?.scheduleText || "N/A",
        isWorkDay: !!scheduleInfo?.isWorkDay,
      });
    }

    return schedule;
  }

  /**
   * Get a matrix of schedules for multiple employees over a date range.
   * Optimized version using pre-indexed batch data.
   */
  async getCalendarMatrix(
    startDateStr: string,
    endDateStr: string,
    employeeIds?: string[],
  ): Promise<Record<string, Record<string, ScheduleInfo>>> {
    const whereClause: { status: EmployeeStatus; id?: { in: string[] } } = {
      status: "Activo" as EmployeeStatus,
    };
    if (employeeIds && employeeIds.length > 0) {
      whereClause.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({ where: whereClause });
    const targetIds = employees.map((e) => e.id);

    const context = await this.getSchedulingContext(targetIds, startDateStr, endDateStr);
    const dateStrings = this.getDateRangeArray(startDateStr, endDateStr);

    const matrix: Record<string, Record<string, ScheduleInfo>> = {};

    for (const emp of employees) {
      matrix[emp.id] = {};
      for (const dateStr of dateStrings) {
        // Reuse cached logic
        const targetDate = parseBusinessDateChile(dateStr);
        const info = await this.getEmployeeDailyScheduleInfo(emp.id, targetDate, context, emp);
        if (info) {
          matrix[emp.id][dateStr] = info;
        }
      }
    }

    return matrix;
  }

  /**
   * Optimization helper: Fetch and index all data for a group of employees and date range.
   */
  async getSchedulingContext(
    employeeIds: string[],
    startDateStr: string,
    endDateStr: string,
  ): Promise<SchedulingContext> {
    const [assignedShifts, leaves, holidays, shiftPatternsRaw] = await Promise.all([
      prisma.assignedShift.findMany({
        where: {
          employeeId: { in: employeeIds },
          startDate: { lte: endDateStr },
          OR: [{ endDate: null }, { endDate: { gte: startDateStr } }],
        },
      }),
      prisma.leaveRecord.findMany({
        where: {
          employeeId: { in: employeeIds },
          startDate: { lte: endDateStr },
          endDate: { gte: startDateStr },
        },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startDateStr, lte: endDateStr } },
      }),
      prisma.shiftPattern.findMany(),
    ]);

    const shiftPatterns = shiftPatternsRaw.map((p) => ({
      ...p,
      dailySchedules:
        typeof p.dailySchedules === "string" ? JSON.parse(p.dailySchedules) : p.dailySchedules,
    }));

    const indexedShifts = new Map<string, AssignedShift[]>();
    for (let i = 0; i < assignedShifts.length; i++) {
      const s = assignedShifts[i];
      if (!indexedShifts.has(s.employeeId)) indexedShifts.set(s.employeeId, []);
      indexedShifts.get(s.employeeId)!.push(s);

      // Yield every 500 records
      if (i > 0 && i % 500 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    const indexedLeaves = new Map<string, LeaveRecord[]>();
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      if (!indexedLeaves.has(l.employeeId)) indexedLeaves.set(l.employeeId, []);
      indexedLeaves.get(l.employeeId)!.push(l);

      // Yield every 500 records
      if (i > 0 && i % 500 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    const indexedHolidays = new Map<string, Holiday>();
    holidays.forEach((h) => indexedHolidays.set(h.date, h));

    return {
      assignedShifts,
      shiftPatterns,
      leaves,
      holidays,
      indexedShifts,
      indexedLeaves,
      indexedHolidays,
    };
  }

  private getDateRangeArray(start: string, end: string): string[] {
    const dates: string[] = [];
    const curr = parseDateOnlyUTC(start);
    const last = parseDateOnlyUTC(end);
    while (curr <= last) {
      dates.push(formatDateUTCISO(curr));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return dates;
  }
}

export const schedulingService = new SchedulingService();
