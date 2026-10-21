import { ShiftReport } from "../types/index";
import { apiClient } from "./apiClient";

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
    return (await apiClient.get("/api/shift-reports" as never, {
      params,
    })) as {
      data: ShiftReport[];
      total: number;
      page: number;
      totalPages: number;
    };
  },

  async save(report: ShiftReport): Promise<ShiftReport> {
    return (await apiClient.post("/api/shift-reports" as never, {
      body: report as never,
    })) as ShiftReport;
  },

  async update(id: string, report: Partial<ShiftReport>): Promise<ShiftReport> {
    return (await apiClient.patch(`/api/shift-reports/${id}` as never, {
      body: report as never,
    })) as ShiftReport;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/shift-reports/${id}` as never);
  },

  async downloadShiftReportPDF(reportId: string): Promise<{ blob: Blob; filename: string }> {
    const { blob, filename } = await apiClient.blob(`/api/export/shift-report-pdf/${reportId}`);
    const fallback = `Reporte_Turno_${reportId}.pdf`;
    return {
      blob,
      filename: filename && filename !== "download" ? filename : fallback,
    };
  },

  async downloadShiftReportExcel(reportId: string): Promise<{ blob: Blob; filename: string }> {
    const { blob, filename } = await apiClient.blob(`/api/shift-reports/export/${reportId}`);
    const fallback = `Reporte_Turno_${reportId}.xlsx`;
    return {
      blob,
      filename: filename && filename !== "download" ? filename : fallback,
    };
  },
};
