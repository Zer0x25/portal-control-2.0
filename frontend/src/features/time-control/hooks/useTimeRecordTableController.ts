import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { useLogs } from "../../../hooks/useLogs";
import { useCorrectionRequests } from "../../../hooks/useCorrectionRequests";
import { exportToPDF } from "../../../utils/export/index";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { AugmentedTimeRecord, AuditLog, CorrectionRequest } from "../../../types/index";

interface UseTimeRecordTableControllerParams {
  records: AugmentedTimeRecord[];
  onExportStreaming: (format: "csv" | "excel") => void;
}

export const useTimeRecordTableController = ({
  records,
  onExportStreaming,
}: UseTimeRecordTableControllerParams) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToasts();
  const { logsPage } = useLogs();
  const { requests: correctionRequests } = useCorrectionRequests();

  const editsMapAll = useMemo(() => {
    const globalLogMap = new Map<string, AuditLog[]>();
    const logs = (logsPage.data || []) as AuditLog[];
    if (logs.length === 0) return globalLogMap;

    for (const log of logs) {
      if (log.action === "Time Record Edited" && log.details?.recordId) {
        const rId = String(log.details.recordId);
        if (!globalLogMap.has(rId)) globalLogMap.set(rId, []);
        globalLogMap.get(rId)?.push(log);
      }
    }
    return globalLogMap;
  }, [logsPage.data]);

  const pendingRequestsMap = useMemo(() => {
    const map = new Map<string, CorrectionRequest>();
    const currentRequests = (correctionRequests as CorrectionRequest[]) || [];
    if (currentRequests.length === 0) return map;

    for (const req of currentRequests) {
      if (req.status === "pending") {
        map.set(String(req.timeRecordId), req);
      }
    }
    return map;
  }, [correctionRequests]);

  useEffect(() => {
    if (!isExportMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExportMenuOpen]);

  const handleExport = useCallback(
    async (format: "csv" | "excel" | "pdf") => {
      if (records.length === 0) {
        addToast("No hay datos para exportar.", "info");
        return;
      }

      setIsExportMenuOpen(false);
      const headers = [
        "Área",
        "Nombre",
        "Fecha",
        "Cargo",
        "Inicio Jornada",
        "Inicio Colación",
        "Fin Colación",
        "Fin Jornada",
      ];
      const data = records.map((r) => [
        r.employeeArea,
        r.employeeName,
        r.date,
        r.employeePosition,
        formatDisplayDateTime(r.entrada),
        formatDisplayDateTime(r.inicioColacion),
        formatDisplayDateTime(r.finColacion),
        formatDisplayDateTime(r.salida),
      ]);

      const filtersString = "Filtros aplicados desde la interfaz";
      switch (format) {
        case "csv":
          onExportStreaming("csv");
          addToast("Registros exportados a CSV.", "success");
          return;
        case "excel":
          onExportStreaming("excel");
          addToast("Registros exportados a EXCEL.", "success");
          return;
        case "pdf":
          exportToPDF("Reporte de Registros de Horario", headers, data, filtersString);
          addToast("Registros enviados a impresión (PDF).", "success");
          return;
        default:
          addToast("Formato no soportado.", "error");
          return;
      }
    },
    [records, addToast, onExportStreaming],
  );

  return {
    editsMapAll,
    exportMenuRef,
    handleExport,
    isExportMenuOpen,
    pendingRequestsMap,
    setIsExportMenuOpen,
  };
};
