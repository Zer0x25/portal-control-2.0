import {
  DashboardOverviewResponse,
  DailyPlanningSummaryResponse,
  DetailedReportRequest,
  DetailedReportResponse,
  KpiWorkerPayload,
  KpiWorkerResult,
} from "../types";
import { authService } from "./authService";
import { apiClient, type BinaryResponse } from "./apiClient";
import { API_BASE_URL } from "./apiBase";

const API_URL = API_BASE_URL;

// Simplified signature delegating to backend
export const runKpiCalculation = async (payload: KpiWorkerPayload): Promise<KpiWorkerResult> => {
  try {
    const { filters } = payload;
    const employeeIds = filters.employees.map((employee) => employee.id);

    const response = await fetch(`${API_URL}/kpis/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeIds: employeeIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching KPI summary from backend:", error);
    throw error;
  }
};

export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  try {
    const response = await fetch(`${API_URL}/kpis/overview`, {
      method: "GET",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as DashboardOverviewResponse;
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
    console.error("Error calling dashboard overview API:", error);
    throw error;
  }
};

export const getDetailedReport = async (
  filters: DetailedReportRequest,
): Promise<DetailedReportResponse> => {
  try {
    const response = await fetch(`${API_URL}/kpis/detailed-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as Partial<DetailedReportResponse>;
    return {
      summary: result.summary ?? [],
      details: result.details ?? {},
    };
  } catch (error) {
    console.error("Error fetching detailed report from backend:", error);
    throw error;
  }
};

export const getDailyPlanningSummary = async (): Promise<DailyPlanningSummaryResponse> => {
  try {
    const response = await fetch(`${API_URL}/kpis/daily-planning`, {
      method: "GET",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as Partial<DailyPlanningSummaryResponse>;
    return {
      date: result.date ?? "",
      stats: result.stats ?? {},
    };
  } catch (error) {
    console.error("Error calling daily planning summary API:", error);
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
    console.error("Error downloading PDF:", error);
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
    console.error("Error downloading Excel:", error);
    throw error;
  }
};
