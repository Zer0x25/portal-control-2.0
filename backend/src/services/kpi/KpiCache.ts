import prisma from "../db";
import { getChileDateISO } from "../../utils/timeUtils";

export class KpiCache {
  /**
   * Checks if a specific month is locked (Accounting Close).
   * Optional pre-fetched systemConfig to avoid repeated DB calls.
   */
  async isMonthLocked(
    year: number,
    month: number,
    preFetchedLockConfig?: string | null,
  ): Promise<boolean> {
    try {
      // 1. Automatic Rolling Lock
      const now = new Date();
      const chileDate = getChileDateISO(now);
      const [currYear, currMonth] = chileDate.split("-").map(Number);

      // Logic: Previous Month and Current Month are OPEN. Older are LOCKED.
      let limitYear = currYear;
      let limitMonth = currMonth - 1;
      if (limitMonth === 0) {
        limitMonth = 12;
        limitYear -= 1;
      }

      // If target month is strictly before the limit month
      if (year < limitYear || (year === limitYear && month < limitMonth)) {
        return true;
      }

      // 2. Manual Lock
      let lockStr = preFetchedLockConfig;

      if (lockStr === undefined) {
        const lockConfig = await prisma.systemConfig.findUnique({
          where: { key: "accounting_lock_date" },
        });
        lockStr = lockConfig?.value || null;
      }

      if (lockStr && lockStr !== "null") {
        if (lockStr.startsWith('"')) {
          try {
            lockStr = JSON.parse(lockStr);
          } catch {
            /* ignore */
          }
        }
        const manualParams = lockStr!.split("-"); // YYYY-MM-DD
        const lockY = Number(manualParams[0]);
        const lockM = Number(manualParams[1]);

        if (year < lockY || (year === lockY && month < lockM)) {
          return true;
        }
      }

      return false;
    } catch (e) {
      console.error("[KpiCache] Error checking month lock:", e);
      return false; // Fail safe to Open
    }
  }

  async getMonthlyStats(employeeId: string, year: number, month: number) {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    return await prisma.monthlyEmployeeStats.findUnique({
      where: {
        employeeId_month: {
          employeeId,
          month: monthKey,
        },
      },
    });
  }

  async getMonthlyStatsBulk(employeeIds: string[], year: number, month: number) {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    return await prisma.monthlyEmployeeStats.findMany({
      where: {
        employeeId: { in: employeeIds },
        month: monthKey,
      },
    });
  }

  async saveMonthlyStats(data: {
    employeeId: string;
    month: string;
    totalWorkedHours: number;
    totalOvertime: number;
    totalScheduled: number;
    tardinessCount: number;
    absenceCount: number;
    vacationDays: number;
    medicalLeaveDays: number;
    dailyBreakdown: string;
  }) {
    // Upsert is safer in case of race conditions or re-generation
    return await prisma.monthlyEmployeeStats.upsert({
      where: {
        employeeId_month: {
          employeeId: data.employeeId,
          month: data.month,
        },
      },
      update: data,
      create: data,
    });
  }

  async getMaterializedViewStats(employeeId: string, monthStr: string): Promise<unknown | null> {
    const result = (await prisma.$queryRaw`
      SELECT * FROM monthly_employee_kpis 
      WHERE employee_id = ${employeeId} AND month = ${monthStr}
    `) as unknown[];
    return result[0] || null;
  }
}
