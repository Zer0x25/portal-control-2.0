import { Employee, TimeRecord, MonthlyEmployeeStats } from "@prisma/client";
import prisma from "../db";
import { schedulingService, SchedulingContext } from "../schedulingService";
import {
  formatDateUTCISO,
  getChileMidnight,
  getMinutesFromMidnightChile,
  parseTimeToMinutes,
} from "../../utils/timeUtils";
import { KpiEngine } from "./KpiEngine";
import { KpiCache } from "./KpiCache";
import { DailyMetric, PeriodStats } from "./types";

const kpiCache = new KpiCache();

export class KpiStatsService {
  private static readonly STATUS_AS_STATE = new Set([
    "Vacaciones",
    "Licencia Médica",
    "Permiso",
    "Permiso Especial",
    "Feriado",
    "Ausente",
    "SinMarcajeTurnoAsignado",
    "AnomaliaManual",
  ]);

  private static normalizeStateFromTimeRecordStatus(status?: string | null): string | undefined {
    if (!status) return undefined;
    if (status === "Ausente") return "Ausencia no justificada";
    if (status === "AnomaliaManual") return "Anomalía";
    return KpiStatsService.STATUS_AS_STATE.has(status) ? status : undefined;
  }

  /**
   * Core logic for calculating stats for a single employee over a period.
   * Handles both Locked (Cached) and Open (Real-time) months.
   */
  async calculatePeriodStats(
    emp: Employee,
    startDate: Date,
    endDate: Date,
    context: SchedulingContext,
    preFetchedRecords?: Map<string, TimeRecord[]>,
    preFetchedStats?: Map<string, MonthlyEmployeeStats>,
    preFetchedLockConfig?: string | null,
  ): Promise<PeriodStats> {
    const stats: PeriodStats = {
      workedHours: 0,
      overtimeHours: 0,
      scheduledWorkdays: 0,
      tardinessCount: 0,
      absenceCount: 0,
      vacationDays: 0,
      medicalLeaveDays: 0,
      details: [],
    };

    let current = new Date(startDate);

    // Fetch all records for the entire range at once to avoid N+1 queries if not pre-fetched
    let localFetchedRecords: TimeRecord[] | undefined = undefined;
    if (!preFetchedRecords) {
      localFetchedRecords = await prisma.timeRecord.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: formatDateUTCISO(startDate),
            lte: formatDateUTCISO(endDate),
          },
        },
      });
    }

    // We iterate month by month to leverage caching
    while (current <= endDate) {
      const y = current.getUTCFullYear();
      const m = current.getUTCMonth() + 1; // 1-12
      const monthStart = new Date(Date.UTC(y, m - 1, 1));
      const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

      const rangeStartInMonth = current > monthStart ? current : monthStart;
      const rangeEndInMonth = endDate < monthEnd ? endDate : monthEnd;
      const startISO = formatDateUTCISO(rangeStartInMonth);
      const endISO = formatDateUTCISO(rangeEndInMonth);

      const isLocked = await kpiCache.isMonthLocked(y, m, preFetchedLockConfig);

      if (isLocked) {
        // --- LOCKED: Use Cache or View ---
        // For detailed breakdown, we prefer the "monthly cache" JSON (ensureMonthlyCache)
        // ensureMonthlyCache guarantees a persisted record exists
        const monthKey = `${y}-${String(m).padStart(2, "0")}`;
        let cached = preFetchedStats?.get(`${emp.id}_${monthKey}`);

        if (!cached) {
          cached = await this.ensureMonthlyCache(emp.id, y, m, emp, context);
        }

        const dailyData = JSON.parse(cached.dailyBreakdown || "[]");

        for (const day of dailyData) {
          const dIso = day.isoDate || day.date; // Handle legacy format if needed
          if (dIso && dIso >= startISO && dIso <= endISO) {
            stats.workedHours += Number(day.workedHours || 0);
            stats.overtimeHours += Number(day.overtime || 0);
            if (Number(day.scheduledHours) > 0) stats.scheduledWorkdays++;

            if (day.status === "Atraso") stats.tardinessCount++;
            else if (day.status === "Ausente") stats.absenceCount++;
            else if (day.status === "Vacaciones") stats.vacationDays++;
            else if (day.status === "Licencia Médica") stats.medicalLeaveDays++;

            stats.details.push(day);
          }
        }
      } else {
        // --- OPEN: Real-time Calculation ---
        // 1. Filter Records for this range from pre-fetched arrays
        let recordsForEmp: TimeRecord[];
        if (preFetchedRecords) {
          recordsForEmp = preFetchedRecords.get(emp.id) || [];
          recordsForEmp = recordsForEmp.filter((r) => r.date >= startISO && r.date <= endISO);
        } else {
          recordsForEmp = (localFetchedRecords || []).filter(
            (r) => r.date >= startISO && r.date <= endISO,
          );
        }

        const calculated = await this.calculateRangeMetrics(
          emp,
          rangeStartInMonth,
          rangeEndInMonth,
          context,
          recordsForEmp,
        );

        for (const day of calculated) {
          stats.workedHours += day.workedHours;
          stats.overtimeHours += Math.max(0, day.overtime);
          if (day.scheduledHours > 0) stats.scheduledWorkdays++;

          if (day.status === "Atraso") stats.tardinessCount++;
          else if (day.status === "Ausente") stats.absenceCount++;
          else if (day.status === "Vacaciones") stats.vacationDays++;
          else if (day.status === "Licencia Médica") stats.medicalLeaveDays++;

          stats.details.push(day);
        }
      }

      // Increment to next month
      current = new Date(Date.UTC(y, m, 1));

      // Yield to event loop to prevent blocking during multi-year reports
      await new Promise((resolve) => setImmediate(resolve));
    }
    return stats;
  }

  // Ensure Logic
  async ensureMonthlyCache(
    employeeId: string,
    year: number,
    month: number,
    emp: Employee,
    globalContext: SchedulingContext,
  ): Promise<MonthlyEmployeeStats> {
    const existing = await kpiCache.getMonthlyStats(employeeId, year, month);
    if (existing) return existing;

    // Calculate using Period Stats logic for ONE ONE full month
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const startStr = formatDateUTCISO(startDate);
    const endStr = formatDateUTCISO(endDate);
    const timeRecords = await prisma.timeRecord.findMany({
      where: { employeeId, date: { gte: startStr, lte: endStr } },
    });

    const calculated = await this.calculateRangeMetrics(
      emp,
      startDate,
      endDate,
      globalContext,
      timeRecords,
    );

    // Summarize
    const summary = {
      totalWorkedHours: calculated.reduce((sum, d) => sum + d.workedHours, 0),
      totalOvertime: calculated.reduce((sum, d) => sum + Math.max(0, d.overtime), 0),
      totalScheduled: calculated.reduce((sum, d) => sum + d.scheduledHours, 0),
      tardinessCount: calculated.filter((d) => d.status === "Atraso").length,
      absenceCount: calculated.filter((d) => d.status === "Ausente").length,
      vacationDays: calculated.filter((d) => d.status === "Vacaciones").length,
      medicalLeaveDays: calculated.filter((d) => d.status === "Licencia Médica").length,
      dailyBreakdown: JSON.stringify(calculated),
    };

    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    return await kpiCache.saveMonthlyStats({
      employeeId,
      month: monthKey,
      ...summary,
    });
  }

  async calculateRangeMetrics(
    emp: Employee,
    startDate: Date,
    endDate: Date,
    context: SchedulingContext,
    preFetchedRecords: TimeRecord[],
  ): Promise<DailyMetric[]> {
    const recordsMap = new Map<string, TimeRecord[]>();
    preFetchedRecords.forEach((r) => {
      if (!recordsMap.has(r.date)) recordsMap.set(r.date, []);
      recordsMap.get(r.date)!.push(r);
    });
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const results = [];

    const d = new Date(startDate);
    // Ensure 'd' has no ms/seconds to prevent minor < <= issues
    d.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);

    while (d <= end) {
      const dStr = formatDateUTCISO(d);
      const recordsForDay = recordsMap.get(dStr) || [];
      const recordForDay = recordsForDay[0];

      const chileDate = getChileMidnight(dStr);

      let scheduleInfo = await schedulingService.getEmployeeDailyScheduleInfo(
        emp.id,
        chileDate,
        context,
        emp,
      );

      if (
        recordForDay &&
        recordForDay.scheduledHours !== undefined &&
        recordForDay.scheduledHours !== null
      ) {
        scheduleInfo = {
          scheduleText: recordForDay.scheduledStartTime
            ? `${recordForDay.scheduledStartTime} - ${recordForDay.scheduledEndTime}`
            : "Día Libre",
          isWorkDay: recordForDay.scheduledHours > 0,
          startTime: recordForDay.scheduledStartTime || undefined,
          endTime: recordForDay.scheduledEndTime || undefined,
          hours: recordForDay.scheduledHours,
          colacionMinutes: recordForDay.scheduledColacionMinutes || 0,
          justificationType: scheduleInfo?.justificationType,
          isHoliday: false,
        };
      }

      const hasWorkRecord = recordsForDay.some((r) => r.entrada && r.entrada !== "SIN REGISTRO");
      const isHoliday = scheduleInfo?.isHoliday || false;
      const stateFromRecord = KpiStatsService.normalizeStateFromTimeRecordStatus(
        recordForDay?.status,
      );
      const isLeave =
        !!stateFromRecord ||
        !!scheduleInfo?.justificationType ||
        (recordForDay &&
          ["Vacaciones", "Licencia Médica", "Permiso", "Permiso Especial"].includes(
            recordForDay.status,
          ));
      let scheduledShift = "Libre";
      let actualClocks = "Sin Marcaje";
      let justificationType: string | undefined = undefined;
      let status = "Normal";
      let dailyScheduled = 0;
      let dailyWorked = 0;
      let dailyOvertime = 0;
      let colacionMinutes = 0;

      if (isLeave && emp.workdayType !== "Artículo 22") {
        justificationType = stateFromRecord || scheduleInfo?.justificationType || justificationType;
        status = justificationType;
        scheduledShift = justificationType;
        actualClocks = "N/A";
      } else {
        const metrics = KpiEngine.calculateDailyMetrics(
          recordForDay || {},
          scheduleInfo,
          emp.workdayType,
        );
        dailyScheduled = metrics.scheduledHours;
        dailyWorked = metrics.workedHours;
        dailyOvertime = metrics.overtimeHours;

        if (hasWorkRecord) {
          if (recordsForDay.length > 0) {
            const validPunches = (recordsForDay as TimeRecord[]).filter(
              (r) => r.entrada && r.salida,
            );
            if (validPunches.length > 0) {
              const firstIn = validPunches.reduce(
                (min: number, r: TimeRecord) => Math.min(min, new Date(r.entrada!).getTime()),
                Infinity,
              );
              const lastOut = validPunches.reduce(
                (max: number, r: TimeRecord) => Math.max(max, new Date(r.salida!).getTime()),
                0,
              );
              if (isFinite(firstIn) && lastOut > 0)
                actualClocks = `${new Date(firstIn).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${new Date(lastOut).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
            } else if (recordForDay?.entrada)
              actualClocks = `${new Date(recordForDay.entrada).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })} - ???`;
          }
          if (emp.workdayType !== "Artículo 22") {
            if (scheduleInfo?.isWorkDay) {
              scheduledShift = `${scheduleInfo.startTime} - ${scheduleInfo.endTime}`;
              if (scheduleInfo.startTime && recordForDay?.entrada) {
                const entMinutes = getMinutesFromMidnightChile(recordForDay.entrada);
                const schMinutes = parseTimeToMinutes(scheduleInfo.startTime);
                if (entMinutes > schMinutes + 15) status = "Atraso";
              }
            } else if (isHoliday) scheduledShift = scheduleInfo?.holidayName || "Feriado";
          }
        } else if (emp.workdayType !== "Artículo 22") {
          if (stateFromRecord) {
            justificationType = stateFromRecord;
            status = stateFromRecord;
            scheduledShift = stateFromRecord;
            actualClocks = "N/A";
          } else if (isHoliday) {
            scheduledShift = scheduleInfo?.holidayName || "Feriado";
            actualClocks = "N/A";
          } else if (scheduleInfo?.isWorkDay) {
            status = "Ausente";
            scheduledShift = `${scheduleInfo.startTime} - ${scheduleInfo.endTime}`;
            justificationType = "Ausencia no justificada";
          }
        }
        if (recordForDay?.inicioColacion && recordForDay?.finColacion) {
          const startCol = new Date(recordForDay.inicioColacion).getTime();
          const endCol = new Date(recordForDay.finColacion).getTime();
          colacionMinutes = Math.round((endCol - startCol) / (1000 * 60));
        } else if (scheduleInfo?.hasColacion) colacionMinutes = scheduleInfo.colacionMinutes || 0;
      }

      results.push({
        date: chileDate.toLocaleDateString("es-CL"),
        isoDate: dStr,
        dayOfWeek: dayNames[chileDate.getDay()],
        scheduledShift,
        actualClocks,
        scheduledHours: dailyScheduled,
        workedHours: dailyWorked,
        overtime: dailyOvertime,
        colacionMinutes,
        differenceHours: emp.workdayType === "Artículo 22" ? 0 : dailyWorked - dailyScheduled,
        justificationType: justificationType || (status === "Atraso" ? "Atraso" : undefined),
        isHoliday,
        status,
      });

      d.setUTCDate(d.getUTCDate() + 1);

      // Yield periodically during long range calculations (e.g. 5-year reports)
      if (results.length % 50 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    return results;
  }
}
