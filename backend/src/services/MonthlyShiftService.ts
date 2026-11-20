import prisma, { withDirectTransaction } from "./db";
import {
  addBusinessDaysChile,
  formatDateUTCISO,
  getChileDateISO,
  parseDateOnlyUTC,
} from "../utils/timeUtils";
import { schedulingService } from "./schedulingService";
import { differenceInCalendarDays } from "date-fns";
import { NotFoundError, ValidationError } from "../utils/AppError";
import { auditService } from "./auditService";
import { SocketService } from "./socketService";
import { requestContext } from "../utils/context";

const DEFAULT_BATCH_SIZE = 500;
const YIELD_EVERY_BATCHES = 4;

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

async function processInBatches<T>(
  items: T[],
  batchSize: number,
  handler: (batch: T[]) => Promise<void>,
) {
  let batchesSinceYield = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await handler(batch);
    batchesSinceYield += 1;
    if (batchesSinceYield >= YIELD_EVERY_BATCHES) {
      batchesSinceYield = 0;
      await yieldToEventLoop();
    }
  }
}

export interface DailyScheduleInput {
  day: number;
  type: "work" | "off" | "rest";
  startTime?: string | null;
  endTime?: string | null;
  hours?: number;
  hasColacion?: boolean;
  colacionMinutes?: number;
}

export interface MonthlyPlanCreateData {
  employeeId: string;
  month: number;
  year: number;
  dailySchedules: DailyScheduleInput[];
  patternName?: string;
  worksOnHolidays?: boolean;
  hasColacion?: boolean;
  colacionMinutes?: number;
  actorUsername?: string;
}

export class MonthlyShiftService {
  /**
   * Retrieves an employee's schedule for a specific month.
   */
  static async getMonthlyPlan(employeeId: string, year: number, month: number) {
    return await schedulingService.getEmployeeScheduleForMonth(employeeId, year, month);
  }

  /**
   * Creates or updates a monthly plan ad-hoc.
   * Ensures no changes to the past and handles transactional consistency.
   */
  static async createMonthlyPlan(data: MonthlyPlanCreateData) {
    const { employeeId, month: monthNum, year: yearNum, dailySchedules } = data;

    const today = new Date();
    const todayIso = getChileDateISO(today);

    const monthStart = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const monthEnd = new Date(Date.UTC(yearNum, monthNum, 0));
    const monthStartIso = formatDateUTCISO(monthStart);
    const monthEndIso = formatDateUTCISO(monthEnd);

    // Ensure we are not editing a fully past month
    if (monthEndIso < todayIso) {
      throw new ValidationError("Cannot edit past months");
    }

    // Determine assignment start date (Rule: Cannot change the past)
    let assignmentStartDateIso = monthStartIso;
    if (todayIso > monthStartIso && todayIso <= monthEndIso) {
      assignmentStartDateIso = todayIso;
    }

    const batchSize = Number(process.env.MONTHLY_PLAN_BATCH_SIZE || DEFAULT_BATCH_SIZE);
    const result = await withDirectTransaction(async (tx) => {
      // 0. Acquire row-level lock on employee to serialize concurrent monthly plan mutations
      const lockedEmployees = await tx.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT id, name FROM employees WHERE id = ${employeeId} FOR UPDATE
      `;
      if (lockedEmployees.length === 0) {
        throw new NotFoundError("Employee not found");
      }
      const employeeName = lockedEmployees[0].name;

      // 1. Handle conflicting assignments (excluding already soft-deleted rows)
      const cutoffDateIso = addBusinessDaysChile(assignmentStartDateIso, -1);

      const conflictingAssignments = await tx.assignedShift.findMany({
        where: {
          employeeId,
          isDeleted: false,
          startDate: { lte: monthEndIso },
          OR: [{ endDate: null }, { endDate: { gte: assignmentStartDateIso } }],
        },
        select: { id: true, startDate: true },
      });

      const toCut: string[] = [];
      const toSoftDelete: string[] = [];
      for (let i = 0; i < conflictingAssignments.length; i++) {
        const assignment = conflictingAssignments[i];
        if (assignment.startDate < assignmentStartDateIso) {
          toCut.push(assignment.id);
        } else {
          toSoftDelete.push(assignment.id);
        }
        if (i > 0 && i % (batchSize * YIELD_EVERY_BATCHES) === 0) {
          await yieldToEventLoop();
        }
      }

      if (toCut.length > 0) {
        await processInBatches(toCut, batchSize, async (cutIds) => {
          await tx.assignedShift.updateMany({
            where: { id: { in: cutIds } },
            data: { endDate: cutoffDateIso },
          });
        });
      }
      if (toSoftDelete.length > 0) {
        const deletedAt = new Date();
        await processInBatches(toSoftDelete, batchSize, async (deleteIds) => {
          await tx.assignedShift.updateMany({
            where: { id: { in: deleteIds } },
            data: { isDeleted: true, deletedAt },
          });
        });
      }

      // 2. Build the Ad-Hoc Pattern
      const daysDuration =
        differenceInCalendarDays(
          parseDateOnlyUTC(monthEndIso),
          parseDateOnlyUTC(assignmentStartDateIso),
        ) + 1;
      const patternSchedules = [];
      const startDayVal = parseInt(assignmentStartDateIso.split("-")[2]);
      const dailyScheduleByDay = new Map(dailySchedules.map((s) => [s.day, s]));

      for (let i = 0; i < daysDuration; i++) {
        const currentDayVal = startDayVal + i;
        const scheduleForDay = dailyScheduleByDay.get(currentDayVal);

        if (scheduleForDay && scheduleForDay.type === "work") {
          const hasColacion = scheduleForDay.hasColacion ?? data.hasColacion ?? true;
          const colacionMinutes = hasColacion
            ? (scheduleForDay.colacionMinutes ?? data.colacionMinutes ?? 60)
            : 0;
          patternSchedules.push({
            dayIndex: i,
            startTime: scheduleForDay.startTime,
            endTime: scheduleForDay.endTime,
            hours: scheduleForDay.hours || 8,
            isOffDay: false,
            hasColacion,
            colacionMinutes,
          });
        } else {
          patternSchedules.push({
            dayIndex: i,
            startTime: null,
            endTime: null,
            hours: 0,
            isOffDay: true,
          });
        }
      }

      // Pattern Name Generation
      let finalPatternName = data.patternName;
      if (!finalPatternName) {
        const monthNames = [
          "Enero",
          "Febrero",
          "Marzo",
          "Abril",
          "Mayo",
          "Junio",
          "Julio",
          "Agosto",
          "Septiembre",
          "Octubre",
          "Noviembre",
          "Diciembre",
        ];
        const mName = monthNames[monthNum - 1];
        finalPatternName = `Plan Mensual ${mName} ${yearNum} - ${new Date().toLocaleTimeString()}`;
      }

      const newPattern = await tx.shiftPattern.create({
        data: {
          name: finalPatternName,
          cycleLengthDays: daysDuration,
          dailySchedules: JSON.stringify(patternSchedules),
          worksOnHolidays: data.worksOnHolidays ?? true,
          maxHoursPattern: 0,
        },
      });

      // 3. Create the new assignment
      const createdAssignment = await tx.assignedShift.create({
        data: {
          employeeId,
          employeeName,
          shiftPatternId: newPattern.id,
          shiftPatternName: newPattern.name,
          startDate: assignmentStartDateIso,
          endDate: monthEndIso,
        },
      });

      return {
        employeeName,
        pattern: newPattern,
        assignment: createdAssignment,
        cutCount: toCut.length,
        softDeletedCount: toSoftDelete.length,
      };
    });

    const actorUsername = data.actorUsername || requestContext.getStore()?.username || "SYSTEM";
    await auditService.logShiftChange(actorUsername, "CREATE", {
      employeeId,
      employeeName: result.employeeName,
      newPatternId: result.pattern.id,
      newPatternName: result.pattern.name,
      newStartDate: assignmentStartDateIso,
      newEndDate: monthEndIso,
      cutCount: result.cutCount,
      softDeletedCount: result.softDeletedCount,
    });

    SocketService.emit("shiftPattern:updated", result.pattern);
    SocketService.emit("assignedShift:updated", result.assignment);

    return { success: true };
  }

  /**
   * Generates a suggested pattern name following the versioning rule.
   */
  static async getSuggestedPatternName(employeeId: string, year: string, month: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) throw new NotFoundError("Employee not found");

    const nameParts = employee.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const surname =
      nameParts.length > 2 ? nameParts[nameParts.length - 2] : nameParts[nameParts.length - 1];
    const initSurname = `${firstName.charAt(0).toUpperCase()}_${surname.toUpperCase()}`;

    let rutSuffix = "XXX-X";
    if (employee.rut) {
      const clean = employee.rut.replace(/\./g, "");
      if (clean.length >= 5) rutSuffix = clean.slice(-5);
      else rutSuffix = clean;
    }

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const mName = monthNames[parseInt(month) - 1];
    const yearShort = year.slice(-2);

    const basePrefix = `${initSurname}_${rutSuffix}_${mName}_${yearShort}_Ver_`;

    const existingPatterns = await prisma.shiftPattern.findMany({
      where: { name: { startsWith: basePrefix } },
      select: { name: true },
    });

    let nextVer = "A";
    if (existingPatterns.length > 0) {
      const versions = existingPatterns
        .map((p) => {
          const parts = p.name.split("_Ver_");
          return parts.length > 1 ? parts[1] : "";
        })
        .filter((v) => v.length === 1);

      if (versions.length > 0) {
        versions.sort();
        const lastVer = versions[versions.length - 1];
        nextVer = String.fromCharCode(lastVer.charCodeAt(0) + 1);
      }
    }

    return `${basePrefix}${nextVer}`;
  }
}
