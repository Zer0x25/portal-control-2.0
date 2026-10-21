import { ShiftReport } from "../types/index";
import { authService } from "./authService";
import { apiClient, type BinaryResponse } from "./apiClient";
import { API_BASE_URL } from "./apiBase";

const API_URL = `${API_BASE_URL}/shift-reports`;
const REQUEST_TIMEOUT_MS = 15000;

function timeoutSignal(ms = REQUEST_TIMEOUT_MS): AbortSignal {
  return typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : new AbortController().signal;
}

export const shiftReportService = {
  async getAll(
    params: {
      since?: number;
      page?: number;
      pageSize?: number;
      status?: string;
    } = {},
  ): Promise<{
    data: ShiftReport[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.since) query.append("since", params.since.toString());
    if (params.page) query.append("page", params.page.toString());
    if (params.pageSize) query.append("pageSize", params.pageSize.toString());
    if (params.status) query.append("status", params.status);

    const url = `${API_URL}?${query.toString()}`;
    const response = await fetch(url, {
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      signal: timeoutSignal(),
    });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }
    if (!response.ok) throw new Error("Error al obtener reportes de turno");
    return response.json();
  },

  async save(report: ShiftReport): Promise<ShiftReport> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(report),
      signal: timeoutSignal(),
    });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Error al guardar reporte de turno");
    }
    return response.json();
  },

  async update(id: string, report: Partial<ShiftReport>): Promise<ShiftReport> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(report),
      signal: timeoutSignal(),
    });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Error al actualizar reporte de turno");
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      signal: timeoutSignal(),
    });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Error al eliminar reporte de turno");
    }
  },

  /**
   * Descarga la bitacora de un turno en PDF.
   *
   * Devuelve el binario: la descarga la dispara el hook de feature con
   * `triggerBrowserDownload` (spec 034, T8).
   */
  async downloadShiftReportPDF(reportId: string): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.get("/api/export/shift-report-pdf/{id}", {
      path: { id: reportId },
      responseType: "binary",
    });

    const binary = response as unknown as BinaryResponse;
    return { blob: binary.blob, filename: binary.filename ?? `Reporte_Turno_${reportId}.pdf` };
  },

  /**
   * Descarga la bitacora de un turno en Excel.
   *
   * Devuelve el binario: la descarga la dispara el hook de feature con
   * `triggerBrowserDownload` (spec 034, T8).
   */
  async downloadShiftReportExcel(reportId: string): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.get("/api/shift-reports/export/{id}", {
      path: { id: reportId },
      responseType: "binary",
    });

    const binary = response as unknown as BinaryResponse;
    return { blob: binary.blob, filename: binary.filename ?? `Reporte_Turno_${reportId}.xlsx` };
  },
};
