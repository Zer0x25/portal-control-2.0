import { apiClient, type BinaryResponse } from "./apiClient";
import { logger } from "../utils/logger";

/**
 * Descargas del modulo de exportacion.
 *
 * Los services **transportan** el binario (`{ blob, filename }`); la descarga
 * la dispara el hook de feature con `triggerBrowserDownload` (spec 034, T8):
 * un service no crea nodos DOM ni hace `.click()`.
 */
export const exportService = {
  /**
   * Descarga el calendario de turnos en PDF.
   *
   * @param action `"download"` deja el blob al hook; `"print"` abre el PDF en
   * una pestaña nueva (el hook decide con `openBlobInNewTab`).
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
    action: "download" | "print" = "download",
  ): Promise<{ blob: Blob; filename: string; action: "download" | "print" }> => {
    try {
      const response = await apiClient.get("/api/export/calendar-pdf", {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          viewMode: filters.viewMode,
          area: filters.area,
          cargo: filters.cargo,
          employeeId: filters.employeeId,
        } as never,
        responseType: "binary",
      });

      const binary = response as unknown as BinaryResponse;
      return {
        blob: binary.blob,
        filename: binary.filename ?? `Calendario_Turnos_${filters.startDate}.pdf`,
        action,
      };
    } catch (error) {
      logger.error("Error during PDF action:", error);
      throw error;
    }
  },

  /**
   * Descarga la lista de empleados en Excel.
   */
  downloadEmployeesExcel: async (filters: {
    search?: string;
    status?: string;
    area?: string;
  }): Promise<{ blob: Blob; filename: string }> => {
    try {
      const response = await apiClient.get("/api/employees/export", {
        params: {
          search: filters.search,
          status: filters.status,
          area: filters.area,
        } as never,
        responseType: "binary",
      });

      const binary = response as unknown as BinaryResponse;
      return { blob: binary.blob, filename: binary.filename ?? "lista_empleados.xlsx" };
    } catch (error) {
      logger.error("Error downloading employees excel:", error);
      throw error;
    }
  },
};
