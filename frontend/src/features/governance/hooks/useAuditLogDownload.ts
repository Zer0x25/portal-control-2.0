import { useCallback } from "react";
import { authService } from "../../../services/authService";
import { API_BASE_URL } from "../../../services/apiBase";

export type AuditLogExportFormat = "csv" | "xml";

/** Inicia una descarga de auditoría con la sesión actual. */
export const useAuditLogDownload = () =>
  // ExportLogsModal receives this callback independently of its form state.
  useCallback((startDate: string, endDate: string, format: AuditLogExportFormat) => {
    const query = new URLSearchParams();
    query.set("startDate", startDate);
    query.set("endDate", endDate);
    query.set("format", format);
    query.set("token", authService.getToken() || "");
    window.location.href = `${API_BASE_URL}/audit-logs/export?${query.toString()}`;
  }, []);
