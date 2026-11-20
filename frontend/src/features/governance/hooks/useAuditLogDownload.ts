import { useCallback } from "react";
import { auditLogService } from "../../../services/auditLogService";
import { triggerBrowserDownload } from "../../../utils/triggerBrowserDownload";

export type AuditLogExportFormat = "csv" | "xml";

/** Inicia una descarga de auditoría con la sesión actual. */
export const useAuditLogDownload = () =>
  // ExportLogsModal receives this callback independently of its form state.
  useCallback(async (startDate: string, endDate: string, format: AuditLogExportFormat) => {
    const { blob, filename } = await auditLogService.downloadExport({
      startDate,
      endDate,
      format,
    });
    triggerBrowserDownload(blob, filename);
  }, []);
