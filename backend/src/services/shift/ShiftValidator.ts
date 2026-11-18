import { AssignedShift, Prisma } from "../../generated/prisma/client";
import { toDate } from "date-fns-tz";
import prisma from "../db";
import {
  PatternSchedule,
  ShiftPatternWithSchedules,
  SchedulingContext,
  schedulingService,
} from "../schedulingService";
import { AssignmentCreateInput } from "./types";
import {
  addBusinessDaysChile,
  compareBusinessDate,
  parseBusinessDateChile,
  parseTimeToMinutes,
  toBusinessDateChile,
} from "../../utils/timeUtils";
import { differenceInCalendarDaysCL } from "../../utils/timePolicy";

const CHILE_TZ = "America/Santiago";
type DbClient = typeof prisma | Prisma.TransactionClient;

export class ShiftValidator {
  /**
   * Enforces the 7-day past limit for creating/editing/deleting records.
   */
  validateTemporalBoundary(startDateStr: string): { isValid: boolean; error?: string } {
    const limitDate = addBusinessDaysChile(toBusinessDateChile(), -7);
    if (compareBusinessDate(startDateStr, limitDate) < 0) {
      return {
        isValid: false,
        error: "No se pueden registrar o editar registros con más de 7 días de antigüedad.",
      };
    }
    return { isValid: true };
  }

  async validatePatternSchedules(
    dailySchedules: PatternSchedule[],
    cycleLengthDays?: number,
  ): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    for (const day of dailySchedules) {
      if (cycleLengthDays !== undefined && (day.dayIndex < 0 || day.dayIndex >= cycleLengthDays)) {
        return {
          isValid: false,
          error: `El horario del día ${day.dayIndex + 1} excede la duración del ciclo (${cycleLengthDays} días).`,
        };
      }
      if (day.isOffDay) continue;
      if (!day.startTime || !day.endTime) {
        return { isValid: false, error: `El día ${day.dayIndex + 1} no tiene horario definido.` };
      }
      const netHours = this.calculateNetHours(day);
      if (netHours <= 0 && !day.isOffDay) {
        return {
          isValid: false,
          error: `El día ${day.dayIndex + 1} tiene una duración inválida (0 horas).`,
        };
      }
    }
    return { isValid: true };
  }

  calculateNetHours(daySchedule: PatternSchedule): number {
    if (daySchedule.isOffDay || !daySchedule.startTime || !daySchedule.endTime) return 0;

    const [h1, m1] = daySchedule.startTime.split(":").map(Number);
    const [h2, m2] = daySchedule.endTime.split(":").map(Number);

    let totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    if (daySchedule.hasColacion && daySchedule.colacionMinutes) {
      totalMinutes -= daySchedule.colacionMinutes;
    }

    return Math.max(0, totalMinutes / 60);
  }

  async validateConflicts(
    employeeId: string,
    startDate: string,
    endDate: string | null,
    excludeAssignmentId?: string,
    providedExistingAssignments?: AssignedShift[],
  ) {
    let existingAssignments = providedExistingAssignments;
    if (!existingAssignments) {
      existingAssignments = await prisma.assignedShift.findMany({
        where: {
          employeeId,
          isDeleted: false,
          ...(excludeAssignmentId ? { NOT: { id: excludeAssignmentId } } : {}),
        },
      });
    } else if (excludeAssignmentId) {
      existingAssignments = existingAssignments.filter((a) => a.id !== excludeAssignmentId);
    }

    const startA = startDate;
    const endA = endDate || "9999-12-31";
    const conflicts: AssignedShift[] = [];

    for (const ass of existingAssignments) {
      const startB = ass.startDate;
      const endB = ass.endDate || "9999-12-31";
      if (startA <= endB && startB <= endA) conflicts.push(ass);
    }
    return conflicts;
  }

  async validateWorkload(
    employeeId: string,
    newAssignment?: AssignmentCreateInput | Partial<AssignmentCreateInput>,
    excludeAssignmentId?: string,
    providedExistingAssignments?: AssignedShift[],
    db: DbClient = prisma,
  ) {
    const weeklyHours = await this.calculateAverageWeeklyHours(
      employeeId,
      newAssignment,
      excludeAssignmentId,
      providedExistingAssignments,
      db,
    );
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { workdayType: true },
    });

    if (employee?.workdayType === "Artículo 22") {
      return { isValid: true, weeklyHours, maxHours: Infinity, isExempt: true };
    }

    const config = await db.systemConfig.findUnique({ where: { key: "max_weekly_hours" } });
    const maxHours = config ? parseFloat(config.value) : 45;

    return { isValid: weeklyHours <= maxHours, weeklyHours, maxHours, isExempt: false };
  }

  async calculateAverageWeeklyHours(
    employeeId: string,
    newAssignment?: Partial<AssignmentCreateInput>,
    excludeAssignmentId?: string,
    providedExistingAssignments?: AssignedShift[],
    db: DbClient = prisma,
  ) {
    let assignments = providedExistingAssignments;
    if (!assignments) {
      assignments = await db.assignedShift.findMany({
        where: {
          employeeId,
          isDeleted: false,
          ...(excludeAssignmentId ? { NOT: { id: excludeAssignmentId } } : {}),
        },
        orderBy: { startDate: "asc" },
      });
    } else {
      if (excludeAssignmentId) {
        assignments = assignments.filter((a) => a.id !== excludeAssignmentId);
      }
      assignments = [...assignments].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }

    type MinimalAssignment = { startDate: string; shiftPatternId: string };
    const relevantAssignments: MinimalAssignment[] = assignments.map((a) => ({
      startDate: a.startDate,
      shiftPatternId: a.shiftPatternId,
    }));

    if (newAssignment?.shiftPatternId) {
      relevantAssignments.push({
        startDate: newAssignment.startDate!,
        shiftPatternId: newAssignment.shiftPatternId,
      });
      relevantAssignments.sort((a, b) => a.startDate.localeCompare(b.startDate));
    }

    if (relevantAssignments.length === 0) return 0;

    const patternIds = [...new Set(relevantAssignments.map((a) => a.shiftPatternId))];
    const patterns = await db.shiftPattern.findMany({
      where: { id: { in: patternIds } },
    });
    const patternMap = new Map(patterns.map((p) => [p.id, p]));

    let maxWeeklyHours = 0;
    for (const ass of relevantAssignments) {
      const pattern = patternMap.get(ass.shiftPatternId);
      if (!pattern || pattern.cycleLengthDays <= 0) continue;

      const dailySchedules: PatternSchedule[] =
        typeof pattern.dailySchedules === "string"
          ? JSON.parse(pattern.dailySchedules)
          : pattern.dailySchedules;
      const totalHours = dailySchedules.reduce(
        (sum: number, day: PatternSchedule) => sum + this.calculateNetHours(day),
        0,
      );
      const weeklyHours = (totalHours / pattern.cycleLengthDays) * 7;
      if (weeklyHours > maxWeeklyHours) {
        maxWeeklyHours = weeklyHours;
      }
    }

    return maxWeeklyHours;
  }

  async validateRestPeriod(
    employeeId: string,
    startDateStr: string,
    pattern: { dailySchedules: string | PatternSchedule[]; cycleLengthDays?: number },
    context?: SchedulingContext,
    assignmentStartDateStr?: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    // 1. Determine start time of the assignment's target day in Chile business dates
    const days: PatternSchedule[] =
      typeof pattern.dailySchedules === "string"
        ? JSON.parse(pattern.dailySchedules || "[]")
        : pattern.dailySchedules || [];

    if (days.length === 0) return { isValid: true };

    const cycleLen =
      pattern.cycleLengthDays && pattern.cycleLengthDays > 0
        ? pattern.cycleLengthDays
        : days.length;
    const diffDays = assignmentStartDateStr
      ? differenceInCalendarDaysCL(assignmentStartDateStr, startDateStr)
      : 0;
    const dayIndex = diffDays >= 0 ? diffDays % cycleLen : 0;
    const firstDaySchedule = days.find((d) => d.dayIndex === dayIndex) || days[0];

    if (!firstDaySchedule || firstDaySchedule.isOffDay || !firstDaySchedule.startTime) {
      // If target day is Off, no rest conflict possible for START of shift.
      return { isValid: true };
    }

    const newShiftStart = toDate(`${startDateStr}T${firstDaySchedule.startTime}:00`, {
      timeZone: CHILE_TZ,
    });

    // 2. Fetch PREVIOUS DAY schedule using Chile business date
    const prevDateStr = addBusinessDaysChile(startDateStr, -1);
    const prevDate = parseBusinessDateChile(prevDateStr);

    const prevSchedule = await schedulingService.getEmployeeDailyScheduleInfo(
      employeeId,
      prevDate,
      context,
    );

    if (prevSchedule && prevSchedule.endTime && prevSchedule.isWorkDay) {
      // If endTime < startTime, it crosses midnight => ends on startDateStr
      const pStart = prevSchedule.startTime ? parseTimeToMinutes(prevSchedule.startTime) : 0;
      const pEnd = parseTimeToMinutes(prevSchedule.endTime);
      const prevEndDateStr = pEnd < pStart ? startDateStr : prevDateStr;

      const prevShiftEnd = toDate(`${prevEndDateStr}T${prevSchedule.endTime}:00`, {
        timeZone: CHILE_TZ,
      });

      const diffMs = newShiftStart.getTime() - prevShiftEnd.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 8) {
        return {
          isValid: false,
          error: `Descanso insuficiente (${diffHours.toFixed(1)}h). Turno anterior termina ${prevSchedule.endTime} y nuevo comienza ${firstDaySchedule.startTime}.`,
        };
      }
    }

    return { isValid: true };
  }

  async validateConsecutiveWorkdays(
    employeeId: string,
    startDateStr: string,
    endDateStr: string | null,
    patternId: string,
    excludeAssignmentId?: string,
    providedContext?: SchedulingContext,
    db: DbClient = prisma,
  ): Promise<{ isValid: boolean; error?: string }> {
    const pattern = providedContext
      ? providedContext.shiftPatterns.find((p) => p.id === patternId)
      : await db.shiftPattern.findUnique({ where: { id: patternId } });
    if (!pattern) return { isValid: true };

    // Exception Rule: 7x7, 10x10, or long cycles
    const isExceptional =
      /(\d+)x(\d+)/i.test(pattern.name) ||
      pattern.cycleLengthDays >= 14 ||
      pattern.name.toLowerCase().includes("excepcional");

    if (isExceptional) {
      return { isValid: true };
    }

    const startIso = addBusinessDaysChile(startDateStr, -7);
    const endIso = endDateStr
      ? addBusinessDaysChile(endDateStr, 7)
      : addBusinessDaysChile(startDateStr, 45);

    let context: SchedulingContext;
    if (providedContext) {
      const filteredExisting = excludeAssignmentId
        ? providedContext.assignedShifts.filter((a) => a.id !== excludeAssignmentId)
        : providedContext.assignedShifts;
      const virtualAssignment: AssignedShift = {
        id: "virtual-new",
        employeeId,
        employeeName: null,
        shiftPatternId: patternId,
        shiftPatternName: null,
        startDate: startDateStr,
        endDate: endDateStr,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
      };
      context = {
        ...providedContext,
        assignedShifts: [...filteredExisting, virtualAssignment],
        indexedShifts: undefined,
      };
    } else {
      const [existingShifts, leaves, holidays, patterns] = await Promise.all([
        db.assignedShift.findMany({
          where: {
            employeeId,
            isDeleted: false,
            startDate: { lte: endIso },
            OR: [{ endDate: null }, { endDate: { gte: startIso } }],
            ...(excludeAssignmentId ? { NOT: { id: excludeAssignmentId } } : {}),
          },
        }),
        db.leaveRecord.findMany({
          where: {
            employeeId,
            isDeleted: false,
            startDate: { lte: endIso },
            endDate: { gte: startIso },
          },
        }),
        db.holiday.findMany({
          where: { date: { gte: startIso, lte: endIso } },
        }),
        db.shiftPattern.findMany({ where: { isDeleted: false } }),
      ]);

      const virtualAssignment: AssignedShift = {
        id: "virtual-new",
        employeeId,
        employeeName: null,
        shiftPatternId: patternId,
        shiftPatternName: null,
        startDate: startDateStr,
        endDate: endDateStr,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
      };

      const allShifts = [...existingShifts, virtualAssignment];

      const patternsWithSchedules = patterns.map((p) => ({
        ...p,
        dailySchedules:
          typeof p.dailySchedules === "string" ? JSON.parse(p.dailySchedules) : p.dailySchedules,
      })) as ShiftPatternWithSchedules[];

      context = {
        assignedShifts: allShifts,
        shiftPatterns: patternsWithSchedules,
        leaves,
        holidays,
      };
    }

    let consecutiveWorkDays = 0;

    for (let dIso = startIso; dIso <= endIso; dIso = addBusinessDaysChile(dIso, 1)) {
      const d = parseBusinessDateChile(dIso);
      const info = await schedulingService.getEmployeeDailyScheduleInfo(employeeId, d, context);

      // Exception: If the assigned pattern has a cycle > 7, we skip this validation (Exceptional jornadas like 7x7)
      const assignment = context.assignedShifts.find(
        (a) => dIso >= a.startDate && (!a.endDate || dIso <= a.endDate),
      );
      const activePattern = assignment
        ? context.shiftPatterns.find((p) => p.id === assignment.shiftPatternId)
        : null;
      if (activePattern && activePattern.cycleLengthDays > 7) {
        continue;
      }

      if (info && info.isWorkDay) {
        consecutiveWorkDays++;
      } else {
        consecutiveWorkDays = 0;
      }

      if (consecutiveWorkDays > 6) {
        return {
          isValid: false,
          error: `Regla 6x1 excedida: Se detectaron mas de 6 días consecutivos de trabajo (alcanzado el ${dIso}).`,
        };
      }
    }

    return { isValid: true };
  }
}
