import { ShiftReport } from "../types/index";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

const API_URL = `${API_BASE_URL}/shift-reports`;

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
    });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Error al eliminar reporte de turno");
    }
  },

  async downloadShiftReportPDF(reportId: string): Promise<void> {
    const response = await fetch(
      `${API_URL.replace("/shift-reports", "/export/shift-report-pdf")}/${reportId}`,
      {
        headers: {
          ...(authService.getAuthHeader() as Record<string, string>),
        },
      },
    );

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }

    if (!response.ok) throw new Error("Error al descargar el PDF del turno");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_Turno_${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadShiftReportExcel(reportId: string): Promise<void> {
    const response = await fetch(`${API_URL}/export/${reportId}`, {
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }

    if (!response.ok) throw new Error("Error al descargar el Excel del turno");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_Turno_${reportId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
