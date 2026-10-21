import { apiClient } from "./apiClient";

export const exportService = {
  /**
   * Download Calendar PDF
   * Returns { blob, filename } without DOM manipulation (Spec 034 / T8 / T9).
   */
  downloadCalendarPDF: async (
    filters: {
      startDate: string;
      endDate: string;
      area?: string;
      cargo?: string;
      employeeId?: string;
      viewMode: string;
    },
    _action: "download" | "print" = "download",
  ): Promise<{ blob: Blob; filename: string }> => {
    const params: Record<string, unknown> = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      viewMode: filters.viewMode,
    };
    if (filters.area) params.area = filters.area;
    if (filters.cargo) params.cargo = filters.cargo;
    if (filters.employeeId) params.employeeId = filters.employeeId;

    const { blob, filename } = await apiClient.blob("/api/export/calendar-pdf", {
      params,
    });

    const fallbackFilename = `Calendario_Turnos_${filters.startDate}.pdf`;
    return {
      blob,
      filename: filename && filename !== "download" ? filename : fallbackFilename,
    };
  },

  /**
   * Download Employees Excel
   * Returns { blob, filename } without DOM manipulation (Spec 034 / T8 / T9).
   */
  downloadEmployeesExcel: async (filters: {
    search?: string;
    status?: string;
    area?: string;
  }): Promise<{ blob: Blob; filename: string }> => {
    const params: Record<string, unknown> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.area) params.area = filters.area;

    const { blob, filename } = await apiClient.blob("/api/employees/export", {
      params,
    });

    const fallbackFilename = "lista_empleados.xlsx";
    return {
      blob,
      filename: filename && filename !== "download" ? filename : fallbackFilename,
    };
  },
};
