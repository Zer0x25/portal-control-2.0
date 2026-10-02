import { AssignedShift } from "@prisma/client";
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
  formatDateUTCISO,
  parseDateOnlyUTC,
  toBusinessDateChile,
} from "../../utils/timeUtils";

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

  async validatePatternSchedules(dailySchedules: PatternSchedule[]): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    for (const day of dailySchedules) {
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
  ) {
    const weeklyHours = await this.calculateAverageWeeklyHours(
      employeeId,
      newAssignment,
      excludeAssignmentId,
      providedExistingAssignments,
    );
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { workdayType: true },
    });

    if (employee?.workdayType === "Artículo 22") {
      return { isValid: true, weeklyHours, maxHours: Infinity, isExempt: true };
    }

    const config = await prisma.systemConfig.findUnique({ where: { key: "max_weekly_hours" } });
    const maxHours = config ? parseFloat(config.value) : 45;

    return { isValid: weeklyHours <= maxHours, weeklyHours, maxHours, isExempt: false };
  }

  async calculateAverageWeeklyHours(
    employeeId: string,
    newAssignment?: Partial<AssignmentCreateInput>,
    excludeAssignmentId?: string,
    providedExistingAssignments?: AssignedShift[],
  ) {
    let assignments = providedExistingAssignments;
    if (!assignments) {
      assignments = await prisma.assignedShift.findMany({
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

    if (newAssignment) {
      relevantAssignments.push({
        startDate: newAssignment.startDate!,
        shiftPatternId: newAssignment.shiftPatternId!,
      });
      relevantAssignments.sort((a, b) => a.startDate.localeCompare(b.startDate));
    }

    if (relevantAssignments.length === 0) return 0;

    const latest = relevantAssignments[relevantAssignments.length - 1];
    const pattern = await prisma.shiftPattern.findUnique({ where: { id: latest.shiftPatternId } });

    if (!pattern || pattern.cycleLengthDays <= 0) return 0;

    const dailySchedules = JSON.parse(pattern.dailySchedules);
    const totalHours = dailySchedules.reduce(
      (sum: number, day: PatternSchedule) => sum + this.calculateNetHours(day),
      0,
    );

    return (totalHours / pattern.cycleLengthDays) * 7;
  }

  async validateRestPeriod(
    employeeId: string,
    startDateStr: string,
    pattern: { dailySchedules: string | PatternSchedule[] },
  ): Promise<{ isValid: boolean; error?: string }> {
    // 1. Determine start time of the new assignment's FIRST day
    const days: PatternSchedule[] =
      typeof pattern.dailySchedules === "string"
        ? JSON.parse(pattern.dailySchedules || "[]")
        : pattern.dailySchedules || [];

    if (days.length === 0) return { isValid: true };

    const startDateDate = new Date(startDateStr + "T12:00:00");
    // Since this is a NEW assignment, startDate IS the start. So diff = 0.
    const dayIndex = 0;
    const firstDaySchedule = days.find((d) => d.dayIndex === dayIndex) || days[0];

    if (!firstDaySchedule || !firstDaySchedule.startTime) {
      // If first day is Off, no rest conflict possible for START of shift.
      return { isValid: true };
    }

    const newShiftStart = new Date(`${startDateStr}T${firstDaySchedule.startTime}:00`);

    // 2. Fetch PREVIOUS DAY schedule
    const prevDate = new Date(startDateDate);
    prevDate.setDate(prevDate.getDate() - 1);

    const prevSchedule = await schedulingService.getEmployeeDailyScheduleInfo(employeeId, prevDate);

    if (prevSchedule && prevSchedule.endTime && prevSchedule.isWorkDay) {
      // Calculate Prev End Time
      // If endTime < startTime, it crosses midnight => ends on startDate
      const prevDateStr = formatDateUTCISO(prevDate);

      // Heuristic for midnight crossing
      const pStart = prevSchedule.startTime ? parseInt(prevSchedule.startTime.split(":")[0]) : 0;
      const pEnd = parseInt(prevSchedule.endTime.split(":")[0]);

      let prevShiftEnd = new Date(`${prevDateStr}T${prevSchedule.endTime}:00`);
      if (pEnd < pStart) {
        // Ends next day (which is startDate)
        prevShiftEnd.setDate(prevShiftEnd.getDate() + 1);
      }

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
  ): Promise<{ isValid: boolean; error?: string }> {
    const pattern = await prisma.shiftPattern.findUnique({ where: { id: patternId } });
    if (!pattern) return { isValid: true };

    // Exception Rule: 7x7, 10x10, or long cycles
    const isExceptional =
      /(\d+)x(\d+)/i.test(pattern.name) ||
      pattern.cycleLengthDays >= 14 ||
      pattern.name.toLowerCase().includes("excepcional");

    if (isExceptional) {
      return { isValid: true };
    }

    const startObj = parseDateOnlyUTC(startDateStr);
    const checkStart = new Date(startObj);
    checkStart.setDate(checkStart.getDate() - 7);

    let checkEnd = new Date(startObj);
    if (endDateStr) {
      checkEnd = parseDateOnlyUTC(endDateStr);
      checkEnd.setDate(checkEnd.getDate() + 7);
    } else {
      checkEnd.setDate(checkEnd.getDate() + 45);
    }

    const startIso = formatDateUTCISO(checkStart);
    const endIso = formatDateUTCISO(checkEnd);

    const [existingShifts, leaves, holidays, patterns] = await Promise.all([
      prisma.assignedShift.findMany({
        where: {
          employeeId,
          isDeleted: false,
          startDate: { lte: endIso },
          OR: [{ endDate: null }, { endDate: { gte: startIso } }],
          ...(excludeAssignmentId ? { NOT: { id: excludeAssignmentId } } : {}),
        },
      }),
      prisma.leaveRecord.findMany({
        where: {
          employeeId,
          isDeleted: false,
          startDate: { lte: endIso },
          endDate: { gte: startIso },
        },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startIso, lte: endIso } },
      }),
      prisma.shiftPattern.findMany({ where: { isDeleted: false } }),
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

    const context: SchedulingContext = {
      assignedShifts: allShifts,
      shiftPatterns: patternsWithSchedules,
      leaves: leaves,
      holidays: holidays,
    };

    let consecutiveWorkDays = 0;

    for (let d = new Date(checkStart); d <= checkEnd; d.setDate(d.getDate() + 1)) {
      const info = await schedulingService.getEmployeeDailyScheduleInfo(employeeId, d, context);

      // Exception: If the assigned pattern has a cycle > 7, we skip this validation (Exceptional jornadas like 7x7)
      const assignment = context.assignedShifts.find(
        (a) => d >= new Date(a.startDate) && (!a.endDate || d <= new Date(a.endDate)),
      );
      const pattern = assignment
        ? context.shiftPatterns.find((p) => p.id === assignment.shiftPatternId)
        : null;
      if (pattern && pattern.cycleLengthDays > 7) {
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
          error: `Regla 6x1 excedida: Se detectaron mas de 6 días consecutivos de trabajo (alcanzado el ${formatDateUTCISO(d)}).`,
        };
      }
    }

    return { isValid: true };
  }
}
