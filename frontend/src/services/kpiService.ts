import {
  DashboardOverviewResponse,
  DailyPlanningSummaryResponse,
  DetailedReportRequest,
  DetailedReportResponse,
  KpiWorkerPayload,
  KpiWorkerResult,
} from "../types";
import { apiClient } from "./apiClient";

export const runKpiCalculation = async (payload: KpiWorkerPayload): Promise<KpiWorkerResult> => {
  const { filters } = payload;
  const employeeIds = filters.employees.map((employee) => employee.id);

  return (await apiClient.post("/api/kpis/summary" as never, {
    body: {
      startDate: filters.startDate,
      endDate: filters.endDate,
      employeeIds: employeeIds,
    } as never,
  })) as KpiWorkerResult;
};

export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  const result = (await apiClient.get("/api/kpis/overview" as never)) as DashboardOverviewResponse;
  return {
    alerts: result?.alerts ?? [],
    activeShifts: result?.activeShifts ?? 0,
    dailyAttendanceRatio: result?.dailyAttendanceRatio ?? 0,
    employeeStatuses: result?.employeeStatuses ?? [],
    pendingLeaves: result?.pendingLeaves ?? 0,
    teamStatus: result?.teamStatus ?? {
      present: 0,
      total: 0,
      anomaliesCount: 0,
    },
    unscheduledPresent: result?.unscheduledPresent ?? [],
  };
};

export const getDetailedReport = async (
  filters: DetailedReportRequest,
): Promise<DetailedReportResponse> => {
  const result = (await apiClient.post("/api/kpis/detailed-report" as never, {
    body: filters as never,
  })) as Partial<DetailedReportResponse>;

  return {
    summary: result?.summary ?? [],
    details: result?.details ?? {},
  };
};

export const getDailyPlanningSummary = async (): Promise<DailyPlanningSummaryResponse> => {
  const result = (await apiClient.get(
    "/api/kpis/daily-planning" as never,
  )) as Partial<DailyPlanningSummaryResponse>;
  return {
    date: result?.date ?? "",
    stats: result?.stats ?? {},
  };
};

export const downloadReportPDF = async (filters: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  mode?: "summary" | "compiled_detailed";
}): Promise<{ blob: Blob; filename: string }> => {
  const params: Record<string, unknown> = {
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.area) params.area = filters.area;
  if (filters.mode) params.mode = filters.mode;

  const { blob, filename } = await apiClient.blob("/api/export/report-pdf", {
    params,
  });

  const fallback = `Reporte_Asistencia_${filters.startDate}_al_${filters.endDate}.pdf`;
  return {
    blob,
    filename: filename && filename !== "download" ? filename : fallback,
  };
};

export const downloadReportExcel = async (filters: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  mode?: "summary" | "detailed";
}): Promise<{ blob: Blob; filename: string }> => {
  const params: Record<string, unknown> = {
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.area) params.area = filters.area;
  if (filters.mode) params.mode = filters.mode;

  const { blob, filename } = await apiClient.blob("/api/export/report-excel", {
    params,
  });

  const fallback = `Reporte_Asistencia_${filters.startDate}_al_${filters.endDate}.xlsx`;
  return {
    blob,
    filename: filename && filename !== "download" ? filename : fallback,
  };
};
