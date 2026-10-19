import { Employee, TimeRecord, MonthlyEmployeeStats } from "../../generated/prisma/client";
import prisma from "../db";
import { schedulingService, SchedulingContext } from "../schedulingService";
import { KpiCache } from "./KpiCache";
import { KpiStatsService } from "./KpiStatsService";
import { KpiAggregationService } from "./KpiAggregationService";
import { KpiFormattingService } from "./KpiFormattingService";
import { KpiFilters, DashboardOverview, PeriodStats, AnomalyRecord } from "./types";
import {
  addBusinessDaysChile,
  formatDateUTCISO,
  parseDateOnlyUTC,
  toBusinessDateChile,
} from "../../utils/timeUtils";
import { toEndInclusive } from "../../utils/timePolicy";

const kpiCache = new KpiCache();

export class KpiReportService {
  private readonly kpiStatsService: KpiStatsService;
  private readonly kpiAggregationService: KpiAggregationService;
  private readonly kpiFormattingService: KpiFormattingService;

  constructor() {
    this.kpiStatsService = new KpiStatsService();
    this.kpiAggregationService = new KpiAggregationService();
    this.kpiFormattingService = new KpiFormattingService();
  }

  async prepareKpiBulkData(
    employees: Employee[],
    startDate: string,
    endDate: string,
    sourceRevision: string,
  ) {
    const tIds = employees.map((e) => e.id);
    // Cache misses materialize whole months even for a one-day request.
    const contextStart = `${startDate.slice(0, 7)}-01`;
    const end = new Date(endDate);
    const contextEnd = formatDateUTCISO(
      new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0, 12)),
    );
    const [context, timeRecordsRaw, lockConfig] = await Promise.all([
      schedulingService.getSchedulingContext(tIds, contextStart, contextEnd),
      prisma.timeRecord.findMany({
        where: { employeeId: { in: tIds }, date: { gte: startDate, lte: endDate } },
      }),
      prisma.systemConfig.findUnique({ where: { key: "accounting_lock_date" } }),
    ]);

    const timeRecordsMap = new Map<string, TimeRecord[]>();
    for (let i = 0; i < timeRecordsRaw.length; i++) {
      const r = timeRecordsRaw[i];
      if (!timeRecordsMap.has(r.employeeId)) timeRecordsMap.set(r.employeeId, []);
      timeRecordsMap.get(r.employeeId)!.push(r);

      if (i > 0 && i % 500 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    const statsCacheMap = new Map<string, MonthlyEmployeeStats>();
    const months = new Set<string>();

    let curr = new Date(startDate);
    curr.setUTCDate(1);
    curr.setUTCHours(0, 0, 0, 0);

    const periodEnd = new Date(endDate);
    periodEnd.setUTCHours(23, 59, 59, 999);

    while (curr <= periodEnd) {
      months.add(`${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, "0")}`);
      curr.setUTCMonth(curr.getUTCMonth() + 1);
    }

    const monthList = Array.from(months);
    const CONCURRENCY_LIMIT = 3;
    for (let i = 0; i < monthList.length; i += CONCURRENCY_LIMIT) {
      const chunk = monthList.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(
        chunk.map(async (mKey) => {
          const [y, m] = mKey.split("-").map(Number);
          const bulkStats = await kpiCache.getMonthlyStatsBulk(tIds, y, m);
          bulkStats.forEach((s) => {
            statsCacheMap.set(`${s.employeeId}_${mKey}`, s);
          });
        }),
      );
      await new Promise((resolve) => setImmediate(resolve));
    }

    return {
      sourceRevision,
      context: context as SchedulingContext,
      timeRecordsMap,
      statsCacheMap,
      lockConfigValue: lockConfig?.value || null,
    };
  }

  async getKpiSummary(filters: KpiFilters) {
    const { startDate, endDate } = this.resolveInclusiveRange(filters);
    const sourceRevision = await kpiCache.getSourceRevision();
    const employees = await this.getEmployees(filters);

    if (employees.length === 0) {
      return { kpis: {}, kpiDetails: {} };
    }

    const bulkData = await this.prepareKpiBulkData(employees, startDate, endDate, sourceRevision);
    const allEmpStats = await this.calculateAllPeriodStats(employees, startDate, endDate, bulkData);

    const summary = this.kpiAggregationService.createSummaryAccumulator();
    const details = this.kpiAggregationService.createSummaryDetails();

    for (let idx = 0; idx < allEmpStats.length; idx++) {
      this.kpiAggregationService.aggregateEmployeeSummary(
        employees[idx],
        allEmpStats[idx],
        summary,
        details,
      );

      if (idx > 0 && idx % 50 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    return this.kpiFormattingService.buildSummaryResponse(
      summary,
      details,
      startDate,
      endDate,
      employees.length,
    );
  }

  async getDetailedReport(filters: KpiFilters) {
    const { startDate, endDate } = this.resolveInclusiveRange(filters);
    const sourceRevision = await kpiCache.getSourceRevision();
    const employees = await this.getEmployees(filters);

    if (employees.length === 0) return { summary: [], details: {} };

    const bulkData = await this.prepareKpiBulkData(employees, startDate, endDate, sourceRevision);
    const allEmpStats = await this.calculateAllPeriodStats(employees, startDate, endDate, bulkData);

    for (let idx = 0; idx < allEmpStats.length; idx++) {
      if (idx > 0 && idx % 50 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    return this.kpiFormattingService.buildDetailedReport(employees, allEmpStats);
  }

  async getDashboardOverview(): Promise<DashboardOverview> {
    const activeEmployees = await prisma.employee.findMany({ where: { status: "Activo" } });

    const today = new Date();
    const todayStr = toBusinessDateChile(today);
    const yesterdayStr = addBusinessDaysChile(todayStr, -1);

    const recentRecords = await prisma.timeRecord.findMany({
      where: { date: { gte: yesterdayStr, lte: todayStr } },
      orderBy: { date: "desc" },
    });

    const yesterdayEmployees = new Set(
      recentRecords
        .filter((record) => record.date === yesterdayStr)
        .map((record) => record.employeeId),
    );
    const latestByEmployee = new Map<string, TimeRecord>();
    recentRecords.forEach((rec) => {
      if (!latestByEmployee.has(rec.employeeId)) {
        latestByEmployee.set(rec.employeeId, rec);
      }
    });

    const nowMs = Date.now();
    const fourteenHoursInMs = 14 * 60 * 60 * 1000;
    const schedulingContext = await schedulingService.getSchedulingContext(
      activeEmployees.map((emp) => emp.id),
      yesterdayStr,
      todayStr,
    );

    // ⚡ Bolt Optimization: Chunk Promise.all executions to avoid blocking event loop and overwhelming DB connections.
    const CHUNK_SIZE = 50;
    const employeeStatuses: {
      employee: Employee;
      status: string;
      lastRecord: TimeRecord | null;
    }[] = [];
    for (let i = 0; i < activeEmployees.length; i += CHUNK_SIZE) {
      const chunk = activeEmployees.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (emp) => {
          const record = latestByEmployee.get(emp.id);
          let status = this.kpiFormattingService.getEmployeeClockingStatus(record);

          if (status === "fuera") {
            const schedule = await schedulingService.getEmployeeDailyScheduleInfo(
              emp.id,
              today,
              schedulingContext,
              emp,
            );
            if (!schedule || !schedule.isWorkDay) {
              status = "no_programado";
            } else if (schedule.startTime && record?.status === "Ausente") {
              status = "ausente";
            } else {
              status = "por_iniciar";
            }
          }

          return {
            employee: emp,
            status,
            lastRecord: record ? this.kpiFormattingService.enrichRecord(record) : null,
          };
        }),
      );
      employeeStatuses.push(...chunkResults);
      await new Promise((resolve) => setImmediate(resolve));
    }

    const presentRecords = employeeStatuses
      .filter((s) => ["en_jornada", "en_colacion", "en_jornada_post_colacion"].includes(s.status))
      .map((s) => s.lastRecord!)
      .filter((r) => r !== null);

    // Build anomalies list
    const anomalies: AnomalyRecord[] = [];

    // ⚡ Bolt Optimization: Parallelize schedule lookups for missing marks in manageable chunks
    // Why: The previous sequential `for...of` loop awaited each promise individually, blocking the event loop (N+1 delay),
    // and an unbounded Promise.all over all employees overwhelms the DB.
    // Impact: Reduces latency of missing marks check from O(N) while preserving DB stability and event loop health.
    const missingYesterdayCandidates = employeeStatuses.filter(
      (s) => !yesterdayEmployees.has(s.employee.id),
    );

    const yesterdaySchedules: ({
      scheduleText: string;
      isWorkDay: boolean;
      startTime?: string;
      endTime?: string;
      hours?: number;
      colacionMinutes?: number;
      justificationType?: string;
      isHoliday?: boolean;
      holidayName?: string;
      hasColacion?: boolean;
    } | null)[] = [];
    for (let i = 0; i < missingYesterdayCandidates.length; i += CHUNK_SIZE) {
      const chunk = missingYesterdayCandidates.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map((s) =>
          schedulingService.getEmployeeDailyScheduleInfo(
            s.employee.id,
            new Date(parseDateOnlyUTC(yesterdayStr).getTime() + 12 * 60 * 60 * 1000),
            schedulingContext,
            s.employee,
          ),
        ),
      );
      yesterdaySchedules.push(...chunkResults);
      await new Promise((resolve) => setImmediate(resolve));
    }

    const missingYesterdaySchedulesMap = new Map(
      missingYesterdayCandidates.map((s, idx) => [s.employee.id, yesterdaySchedules[idx]]),
    );

    for (const s of employeeStatuses) {
      // Physical anomalies (AnomaliaManual, CerradoBySystem, etc)
      if (s.status === "jornada_terminada_anomalia" && s.lastRecord) {
        anomalies.push(s.lastRecord);
        continue;
      }

      // Check for overdue open shifts (exceeding 14h)
      if (s.lastRecord?.status === "Laborando" || s.lastRecord?.status === "Colacion") {
        const entradaTs = s.lastRecord.entrada ? new Date(s.lastRecord.entrada).getTime() : 0;
        if (entradaTs && nowMs - entradaTs > fourteenHoursInMs && !s.lastRecord.justification) {
          anomalies.push(s.lastRecord);
          continue;
        }
      }

      // Check for "Missing Marks" from YESTERDAY
      // Today's record does not prove that yesterday's assigned shift was recorded.
      if (!yesterdayEmployees.has(s.employee.id)) {
        // We only check yesterday to keep it fast
        const yesterdaySchedule = missingYesterdaySchedulesMap.get(s.employee.id);

        if (yesterdaySchedule?.isWorkDay && !yesterdaySchedule.justificationType) {
          // It's a missing mark anomaly! Create a virtual record for the UI
          anomalies.push({
            id: `MISSING-${s.employee.id}-${yesterdayStr}`,
            employeeId: s.employee.id,
            employeeName: s.employee.name,
            date: yesterdayStr,
            status: "SinMarcajeTurnoAsignado",
            justification: {
              type: "SYSTEM_ANOMALY",
              reason: "NO_TIME_RECORD_WITH_ASSIGNED_SHIFT",
              comment: "Falta marcaje para el turno asignado ayer.",
            },
          });
        }
      }
    }

    return {
      teamStatus: {
        present: presentRecords.length,
        total: activeEmployees.length,
        // Solo el conteo: ningún consumidor lee los 195 registros (los modales
        // son placeholders). Ahorra ~61KB por respuesta (~37% del payload).
        anomaliesCount: anomalies.length,
      },
      // Proyección mínima: las vistas solo leen id/name/position y nadie lee
      // lastRecord (el tipo frontend ni lo declara). Ahorra ~80KB (~48%).
      employeeStatuses: employeeStatuses.map((entry) => ({
        status: entry.status,
        employee: {
          id: entry.employee.id,
          name: entry.employee.name,
          position: entry.employee.position,
        },
      })),
      timestamp: new Date().toISOString(),
    };
  }

  async getDailyPlanningSummary() {
    const today = new Date();
    const activeEmployees = await prisma.employee.findMany({ where: { status: "Activo" } });
    const todayStr = toBusinessDateChile(today);
    const schedulingContext = await schedulingService.getSchedulingContext(
      activeEmployees.map((emp) => emp.id),
      todayStr,
      todayStr,
    );

    const stats = {
      onVacation: 0,
      onMedicalLeave: 0,
      onSpecialPermit: 0,
      onDayOff: 0,
      scheduled: 0,
      activeCount: activeEmployees.length,
    };

    // ⚡ Bolt Optimization: Parallelize schedule lookups in manageable chunks
    // Why: The previous sequential `for...of` loop awaited each promise individually, blocking the event loop (N+1 delay),
    // and an unbounded Promise.all over all employees overwhelms the DB.
    // Impact: Reduces latency of schedule lookup from O(N) while preserving DB stability and event loop health.
    const CHUNK_SIZE = 50;
    const scheduleInfos: ({
      scheduleText: string;
      isWorkDay: boolean;
      startTime?: string;
      endTime?: string;
      hours?: number;
      colacionMinutes?: number;
      justificationType?: string;
      isHoliday?: boolean;
      holidayName?: string;
      hasColacion?: boolean;
    } | null)[] = [];
    for (let i = 0; i < activeEmployees.length; i += CHUNK_SIZE) {
      const chunk = activeEmployees.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map((emp) =>
          schedulingService.getEmployeeDailyScheduleInfo(emp.id, today, schedulingContext, emp),
        ),
      );
      scheduleInfos.push(...chunkResults);
      await new Promise((resolve) => setImmediate(resolve));
    }

    for (const scheduleInfo of scheduleInfos) {
      if (!scheduleInfo) continue;

      if (scheduleInfo.justificationType) {
        switch (scheduleInfo.justificationType) {
          case "Vacaciones":
            stats.onVacation++;
            break;
          case "Licencia Médica":
            stats.onMedicalLeave++;
            break;
          default:
            stats.onSpecialPermit++;
            break;
        }
      } else if (scheduleInfo.isWorkDay) {
        stats.scheduled++;
      } else if (scheduleInfo.scheduleText === "Día Libre") {
        stats.onDayOff++;
      }
    }

    return stats;
  }

  private async getEmployees(filters: KpiFilters) {
    const { employeeIds, area } = filters;
    const where: { id?: { in: string[] }; area?: string } = {};
    if (employeeIds?.length) where.id = { in: employeeIds };
    if (area) where.area = area;
    return prisma.employee.findMany({ where });
  }

  private resolveInclusiveRange(filters: KpiFilters): { startDate: string; endDate: string } {
    const { startDate, endDateExclusive, endDate } = filters;
    if (endDateExclusive) {
      return { startDate, endDate: toEndInclusive(endDateExclusive) };
    }
    if (!endDate) {
      throw new Error("KPI filters require endDate or endDateExclusive");
    }
    return { startDate, endDate };
  }

  private async calculateAllPeriodStats(
    employees: Employee[],
    startDate: string,
    endDate: string,
    bulkData: {
      sourceRevision: string;
      context: SchedulingContext;
      timeRecordsMap: Map<string, TimeRecord[]>;
      statsCacheMap: Map<string, MonthlyEmployeeStats>;
      lockConfigValue: string | null;
    },
  ) {
    const BATCH_SIZE = 10;
    const allEmpStats: PeriodStats[] = [];

    for (let i = 0; i < employees.length; i += BATCH_SIZE) {
      const batch = employees.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((emp) =>
          this.kpiStatsService.calculatePeriodStats(
            emp,
            new Date(startDate),
            new Date(endDate),
            bulkData.context,
            bulkData.sourceRevision,
            bulkData.timeRecordsMap,
            bulkData.statsCacheMap,
            bulkData.lockConfigValue,
          ),
        ),
      );
      allEmpStats.push(...batchResults);
      await new Promise((resolve) => setImmediate(resolve));
    }

    return allEmpStats;
  }
}
