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
}

export interface MonthlyPlanCreateData {
  employeeId: string;
  month: number;
  year: number;
  dailySchedules: DailyScheduleInput[];
  patternName?: string;
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
    return await withDirectTransaction(async (tx) => {
      // 1. Handle conflicting assignments
      const cutoffDateIso = addBusinessDaysChile(assignmentStartDateIso, -1);

      const conflictingAssignments = await tx.assignedShift.findMany({
        where: {
          employeeId,
          startDate: { lte: monthEndIso },
          OR: [{ endDate: null }, { endDate: { gte: assignmentStartDateIso } }],
        },
        select: { id: true, startDate: true },
      });

      const toCut: string[] = [];
      const toDelete: string[] = [];
      for (let i = 0; i < conflictingAssignments.length; i++) {
        const assignment = conflictingAssignments[i];
        if (assignment.startDate < assignmentStartDateIso) {
          toCut.push(assignment.id);
        } else {
          toDelete.push(assignment.id);
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
      if (toDelete.length > 0) {
        await processInBatches(toDelete, batchSize, async (deleteIds) => {
          await tx.assignedShift.deleteMany({ where: { id: { in: deleteIds } } });
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
          patternSchedules.push({
            dayIndex: i,
            startTime: scheduleForDay.startTime,
            endTime: scheduleForDay.endTime,
            hours: scheduleForDay.hours || 8,
            isOffDay: false,
            hasColacion: true,
            colacionMinutes: 60,
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
          worksOnHolidays: true,
          maxHoursPattern: 0,
        },
      });

      // 3. Create the new assignment
      await tx.assignedShift.create({
        data: {
          employeeId,
          shiftPatternId: newPattern.id,
          startDate: assignmentStartDateIso,
          endDate: monthEndIso,
        },
      });

      return { success: true };
    });
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
