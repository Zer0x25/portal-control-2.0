import { ShiftReport } from "../types/index";
import { apiClient, request as apiRequest, type BinaryResponse } from "./apiClient";

interface ShiftReportListResponse {
  data: ShiftReport[];
  total: number;
  page: number;
  totalPages: number;
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
    return apiRequest<ShiftReportListResponse>({
      method: "GET",
      url: "/api/shift-reports",
      params: {
        since: params.since || undefined,
        page: params.page || undefined,
        pageSize: params.pageSize || undefined,
        status: params.status,
      },
    });
  },

  async save(report: ShiftReport): Promise<ShiftReport> {
    return apiRequest<ShiftReport>({
      method: "POST",
      url: "/api/shift-reports",
      body: report,
    });
  },

  async update(id: string, report: Partial<ShiftReport>): Promise<ShiftReport> {
    return apiRequest<ShiftReport>({
      method: "PATCH",
      url: "/api/shift-reports/{id}",
      path: { id },
      body: report,
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>({
      method: "DELETE",
      url: "/api/shift-reports/{id}",
      path: { id },
    });
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
