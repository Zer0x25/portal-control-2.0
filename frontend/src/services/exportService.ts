import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

const API_URL = API_BASE_URL;

export const exportService = {
  /**
   * Download Calendar PDF
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
  ) => {
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        viewMode: filters.viewMode,
      });
      if (filters.area) params.append("area", filters.area);
      if (filters.cargo) params.append("cargo", filters.cargo);
      if (filters.employeeId) params.append("employeeId", filters.employeeId);

      const response = await fetch(`${API_URL}/export/calendar-pdf?${params.toString()}`, {
        method: "GET",
        headers: {
          ...(authService.getAuthHeader() as Record<string, string>),
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      if (action === "print") {
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          // Some browsers might need a small delay or a window.print() call
          // but usually opening a PDF in a new tab is what's expected for "Print"
          // so the user can use the PDF viewer's print function.
          return true;
        } else {
          throw new Error("El navegador bloqueó la ventana emergente.");
        }
      }

      const link = document.createElement("a");
      link.href = url;

      // Extract filename from header if possible, or generate one
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `Calendario_Turnos_${filters.startDate}.pdf`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch.length === 2) filename = fileNameMatch[1];
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Small delay for mobile browsers
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      return true;
    } catch (error) {
      console.error("Error during PDF action:", error);
      throw error;
    }
  },
  /**
   * Download Employees Excel
   */
  downloadEmployeesExcel: async (filters: { search?: string; status?: string; area?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.area) params.append("area", filters.area);

      const response = await fetch(`${API_URL}/employees/export?${params.toString()}`, {
        method: "GET",
        headers: {
          ...(authService.getAuthHeader() as Record<string, string>),
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers.get("content-disposition");
      let filename = "lista_empleados.xlsx";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch.length === 2) filename = fileNameMatch[1];
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      return true;
    } catch (error) {
      console.error("Error downloading employees excel:", error);
      throw error;
    }
  },
};
