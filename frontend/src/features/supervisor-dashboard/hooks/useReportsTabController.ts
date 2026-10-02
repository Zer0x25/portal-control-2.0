import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToasts } from "../../../hooks/useToasts";
import { useEmployees } from "../../../hooks/useEmployees";
import { authService } from "../../../services/authService";
import { API_BASE_URL } from "../../../services/apiBase";
import {
  downloadReportExcel,
  downloadReportPDF,
  getDetailedReport,
} from "../../../services/kpiService";
import {
  DailyReportItem,
  ReportDataType,
  ReportStat,
  SortableReportKey,
} from "../../../types/index";
import { getChileDateISO } from "../../../utils/dateUtils";

export interface ReportsTabFilters {
  employeeId: string;
  area: string;
  workdayType: string;
  startDateISO: string;
  endDateISO: string;
}

const initialFilters = (): ReportsTabFilters => ({
  employeeId: "",
  area: "",
  workdayType: "",
  startDateISO: getChileDateISO(),
  endDateISO: getChileDateISO(),
});

export const useReportsTabController = () => {
  const { activeEmployees } = useEmployees();
  const { addToast } = useToasts();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<ReportsTabFilters>(initialFilters);
  const [reportData, setReportData] = useState<ReportDataType | null>(null);
  const [isSingleEmployeeReport, setIsSingleEmployeeReport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: SortableReportKey;
    direction: "ascending" | "descending";
  } | null>({ key: "name", direction: "ascending" });
  const [currentPage, setCurrentPage] = useState(1);
  const [showPdfModeModal, setShowPdfModeModal] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFiltersChange = useCallback((newFilters: ReportsTabFilters) => {
    setFilters(newFilters);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    const singleEmployeeMode = Boolean(filters.employeeId);
    setIsLoading(true);
    setReportData(null);
    setCurrentPage(1);
    setSortConfig({
      key: singleEmployeeMode ? "isoDate" : "name",
      direction: "ascending",
    });

    try {
      const employeeIds = singleEmployeeMode ? [filters.employeeId] : undefined;
      const area = !singleEmployeeMode ? filters.area : undefined;

      const result = await getDetailedReport({
        startDate: filters.startDateISO,
        endDate: filters.endDateISO,
        employeeIds,
        area,
      });

      setIsSingleEmployeeReport(singleEmployeeMode);
      if (singleEmployeeMode) {
        setReportData(result.details[filters.employeeId] || []);
      } else {
        setReportData(result.summary || []);
      }
      addToast("Reporte generado con éxito.", "success");
    } catch (error) {
      console.error("Failed to fetch detailed report:", error);
      addToast("Error al obtener el reporte del servidor.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast, filters]);

  const sortedReportData = useMemo(() => {
    if (!reportData) return [];

    const sortItems = <T>(items: T[], config: typeof sortConfig): T[] => {
      if (!config) return items;
      const newItems = [...items];
      newItems.sort((a, b) => {
        const valA = a[config.key as keyof T];
        const valB = b[config.key as keyof T];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === "string" && typeof valB === "string") {
          return config.direction === "ascending"
            ? valA.localeCompare(valB, "es")
            : valB.localeCompare(valA, "es");
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return config.direction === "ascending" ? valA - valB : valB - valA;
        }
        return 0;
      });
      return newItems;
    };

    return sortItems(reportData as (ReportStat | DailyReportItem)[], sortConfig) as
      | ReportStat[]
      | DailyReportItem[];
  }, [reportData, sortConfig]);

  const requestSort = useCallback(
    (key: SortableReportKey) => {
      const direction =
        sortConfig && sortConfig.key === key && sortConfig.direction === "ascending"
          ? "descending"
          : "ascending";
      setSortConfig({ key, direction });
    },
    [sortConfig],
  );

  const handleExport = useCallback(
    async (formatType: "csv" | "excel" | "pdf" | "xml" | "server-pdf") => {
      if (!sortedReportData || sortedReportData.length === 0) {
        addToast("No hay datos para exportar.", "info");
        return;
      }
      setIsExportMenuOpen(false);

      if (formatType === "server-pdf" && !isSingleEmployeeReport) {
        setShowPdfModeModal(true);
        return;
      }

      try {
        const token = authService.getToken();

        if (formatType === "csv" || formatType === "xml") {
          const query = new URLSearchParams();
          query.set("startDate", filters.startDateISO);
          query.set("endDate", filters.endDateISO);
          query.set("format", formatType);
          if (filters.employeeId && filters.employeeId !== "ALL")
            query.set("employeeId", filters.employeeId);
          if (filters.area && filters.area !== "TODOS") query.set("area", filters.area);
          query.set("token", token || "");

          const downloadUrl = `${API_BASE_URL}/records/export?${query.toString()}`;
          window.location.href = downloadUrl;
          addToast(`Descarga de ${formatType.toUpperCase()} iniciada.`, "success");
          return;
        }

        switch (formatType) {
          case "excel":
            await downloadReportExcel({
              startDate: filters.startDateISO,
              endDate: filters.endDateISO,
              employeeId: filters.employeeId,
              area: filters.area,
              mode: isSingleEmployeeReport ? "detailed" : "summary",
            });
            addToast("Descarga Excel iniciada", "success");
            break;
          case "pdf":
            addToast("PDF Local deshabilitado - Use Descargar PDF (Servidor)", "warning");
            break;
          case "server-pdf":
            await downloadReportPDF({
              startDate: filters.startDateISO,
              endDate: filters.endDateISO,
              area: filters.area,
              employeeId: filters.employeeId,
            });
            addToast("Reporte PDF generado correctamente.", "success");
            break;
        }
      } catch (error) {
        console.error("Export failure:", error);
        addToast("Error al realizar la exportación", "error");
      }
    },
    [addToast, filters, isSingleEmployeeReport, sortedReportData],
  );

  const handleExportPdfSummary = useCallback(async () => {
    setShowPdfModeModal(false);
    try {
      addToast("Arquitecturando Resumen General...", "info");
      await downloadReportPDF({
        startDate: filters.startDateISO,
        endDate: filters.endDateISO,
        area: filters.area,
        mode: "summary",
      });
      addToast("PDF Generado", "success");
    } catch {
      addToast("Falla en compilación", "error");
    }
  }, [addToast, filters.area, filters.endDateISO, filters.startDateISO]);

  const handleExportPdfCompiled = useCallback(async () => {
    setShowPdfModeModal(false);
    try {
      addToast("Compilando Fichas Detalladas...", "info");
      await downloadReportPDF({
        startDate: filters.startDateISO,
        endDate: filters.endDateISO,
        area: filters.area,
        mode: "compiled_detailed",
      });
      addToast("Reporte descargado exitosamente", "success");
    } catch {
      addToast("Falla en compilación", "error");
    }
  }, [addToast, filters.area, filters.endDateISO, filters.startDateISO]);

  return {
    activeEmployees,
    currentPage,
    exportMenuRef,
    filters,
    handleExport,
    handleExportPdfCompiled,
    handleExportPdfSummary,
    handleFiltersChange,
    handleGenerateReport,
    isExportMenuOpen,
    isLoading,
    isSingleEmployeeReport,
    navigate,
    reportData,
    requestSort,
    setCurrentPage,
    setIsExportMenuOpen,
    setShowPdfModeModal,
    showPdfModeModal,
    sortConfig,
    sortedReportData,
  };
};
