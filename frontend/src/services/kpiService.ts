import {
  DashboardOverviewResponse,
  DailyPlanningSummaryResponse,
  DetailedReportRequest,
  DetailedReportResponse,
  KpiWorkerPayload,
  KpiWorkerResult,
} from "../types";
import { authService } from "./authService";
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
        anomalies: [],
        presentRecords: [],
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

export const downloadReportPDF = async (filters: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  mode?: "summary" | "compiled_detailed";
}): Promise<void> => {
  try {
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    if (filters.employeeId) params.append("employeeId", filters.employeeId);
    if (filters.area) params.append("area", filters.area);
    if (filters.mode) params.append("mode", filters.mode);

    const response = await fetch(`${API_URL}/export/report-pdf?${params.toString()}`, {
      method: "GET",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });

    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_Asistencia_${filters.startDate}_al_${filters.endDate}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw error;
  }
};

export const downloadReportExcel = async (filters: {
  startDate: string;
  endDate: string;
  employeeId?: string;
  area?: string;
  mode?: "summary" | "detailed";
}): Promise<void> => {
  try {
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    if (filters.employeeId) params.append("employeeId", filters.employeeId);
    if (filters.area) params.append("area", filters.area);
    if (filters.mode) params.append("mode", filters.mode);

    const response = await fetch(`${API_URL}/export/report-excel?${params.toString()}`, {
      method: "GET",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });

    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_Asistencia_${filters.startDate}_al_${filters.endDate}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading Excel:", error);
    throw error;
  }
};
