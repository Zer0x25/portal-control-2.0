import { ScheduleInfo, schedulingService } from "./schedulingService";
import { KpiReportService } from "./kpi/KpiReportService";
import { KpiFilters } from "./kpi/types";

// Re-export types for backward compatibility
export * from "./kpi/types";

export class KpiService {
  private reportService: KpiReportService;

  constructor() {
    this.reportService = new KpiReportService();
  }

  async getKpiSummary(filters: KpiFilters) {
    return this.reportService.getKpiSummary(filters);
  }

  async getDetailedReport(filters: KpiFilters) {
    return this.reportService.getDetailedReport(filters);
  }

  async getDashboardOverview() {
    return this.reportService.getDashboardOverview();
  }

  async getDailyPlanningSummary() {
    return this.reportService.getDailyPlanningSummary();
  }

  async getEmployeeScheduleForDate(employeeId: string, date: Date): Promise<ScheduleInfo | null> {
    return schedulingService.getEmployeeDailyScheduleInfo(employeeId, date);
  }
}

export const kpiService = new KpiService();
