import {
  DashboardOverviewResponse,
  DailyPlanningSummaryResponse,
  DetailedReportRequest,
  DetailedReportResponse,
  KpiWorkerPayload,
  KpiWorkerResult,
} from "../types";
import { apiClient, request as apiRequest, type BinaryResponse } from "./apiClient";
import { logger } from "../utils/logger";

// Simplified signature delegating to backend
export const runKpiCalculation = async (payload: KpiWorkerPayload): Promise<KpiWorkerResult> => {
  try {
    const { filters } = payload;
    const employeeIds = filters.employees.map((employee) => employee.id);

    return await apiRequest<KpiWorkerResult>({
      method: "POST",
      url: "/api/kpis/summary",
      body: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeIds: employeeIds,
      },
    });
  } catch (error) {
    logger.error("Error fetching KPI summary from backend:", error);
    throw error;
  }
};

export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  try {
    const result = await apiRequest<Partial<DashboardOverviewResponse>>({
      method: "GET",
      url: "/api/kpis/overview",
    });

    return {
      alerts: result.alerts ?? [],
      activeShifts: result.activeShifts ?? 0,
      dailyAttendanceRatio: result.dailyAttendanceRatio ?? 0,
      employeeStatuses: result.employeeStatuses ?? [],
      pendingLeaves: result.pendingLeaves ?? 0,
      teamStatus: result.teamStatus ?? {
        present: 0,
        total: 0,
        anomaliesCount: 0,
      },
      unscheduledPresent: result.unscheduledPresent ?? [],
    };
  } catch (error) {
    logger.error("Error calling dashboard overview API:", error);
    throw error;
  }
};

export const getDetailedReport = async (
  filters: DetailedReportRequest,
): Promise<DetailedReportResponse> => {
  try {
    const result = await apiRequest<Partial<DetailedReportResponse>>({
      method: "POST",
      url: "/api/kpis/detailed-report",
      body: filters,
    });

    return {
      summary: result.summary ?? [],
      details: result.details ?? {},
    };
  } catch (error) {
    logger.error("Error fetching detailed report from backend:", error);
    throw error;
  }
};

export const getDailyPlanningSummary = async (): Promise<DailyPlanningSummaryResponse> => {
  try {
    const result = await apiRequest<Partial<DailyPlanningSummaryResponse>>({
      method: "GET",
      url: "/api/kpis/daily-planning",
    });

    return {
      date: result.date ?? "",
      stats: result.stats ?? {},
    };
  } catch (error) {
    logger.error("Error calling daily planning summary API:", error);
    throw error;
  }
};

/**
 * Descarga el reporte de asistencia en PDF.
 *
 * Devuelve el binario: la descarga la dispara el hook de feature con
 * `triggerBrowserDownload` (spec 034, T8). El service no crea nodos DOM.
 */
export const downloadReportPDF = async (filters: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  mode?: "summary" | "compiled_detailed";
}): Promise<{ blob: Blob; filename: string }> => {
  try {
    const response = await apiClient.get("/api/export/report-pdf", {
      // `mode` lo acepta el backend (ExportQuerySchema) pero no lo documenta
      // el swagger: se envia igualmente.
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        area: filters.area,
        mode: filters.mode,
      } as never,
      responseType: "binary",
    });

    const binary = response as unknown as BinaryResponse;
    return {
      blob: binary.blob,
      filename:
        binary.filename ?? `Reporte_Asistencia_${filters.startDate}_al_${filters.endDate}.pdf`,
    };
  } catch (error) {
    logger.error("Error downloading PDF:", error);
    throw error;
  }
};

/**
 * Descarga el reporte de asistencia en Excel.
 *
 * Devuelve el binario: la descarga la dispara el hook de feature con
 * `triggerBrowserDownload` (spec 034, T8).
 */
export const downloadReportExcel = async (filters: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  mode?: "summary" | "detailed";
}): Promise<{ blob: Blob; filename: string }> => {
  try {
    const response = await apiClient.get("/api/export/report-excel", {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        area: filters.area,
        mode: filters.mode,
      } as never,
      responseType: "binary",
    });

    const binary = response as unknown as BinaryResponse;
    return {
      blob: binary.blob,
      filename:
        binary.filename ?? `Reporte_Asistencia_${filters.startDate}_al_${filters.endDate}.xlsx`,
    };
  } catch (error) {
    logger.error("Error downloading Excel:", error);
    throw error;
  }
};
