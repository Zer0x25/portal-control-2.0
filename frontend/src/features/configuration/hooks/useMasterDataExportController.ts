import { useState } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { timeRecordService } from "../../../services/timeRecordService";
import { isDateRangeValid } from "../../../utils/validation";
import { toBusinessDateChile } from "../../../utils/dateUtils";
import { triggerBrowserDownload } from "../../../utils/triggerBrowserDownload";
import { logger } from "../../../utils/logger";

export const useMasterDataExportController = () => {
  const { addToast } = useToasts();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [exporting, setExporting] = useState<false | "csv" | "xml">(false);

  const todayStr = toBusinessDateChile();

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (!endDate || date > endDate) {
      setEndDate(todayStr);
    }
  };

  const handleExport = async (format: "csv" | "xml") => {
    if (!startDate || !endDate) {
      addToast("Por favor, seleccione un rango de fechas completas.", "warning");
      return;
    }
    if (!isDateRangeValid(startDate, endDate)) {
      addToast("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
      return;
    }

    setExporting(format);
    addToast(`Preparando descarga ${format.toUpperCase()}...`, "info");

    try {
      const { blob, filename } = await timeRecordService.downloadExport({
        startDate,
        endDate,
        format,
      });
      triggerBrowserDownload(blob, filename);
      addToast(`Descarga de ${format.toUpperCase()} iniciada.`, "success");
      setExporting(false);
    } catch (error) {
      const err = error as Error;
      logger.error("Error starting master data export:", err);
      addToast(`Error al exportar: ${err.message || "Ocurrió un error inesperado"}`, "error");
      setExporting(false);
    }
  };

  return {
    startDate,
    endDate,
    isStartDatePickerOpen,
    isEndDatePickerOpen,
    exporting,
    todayStr,
    setEndDate,
    setIsStartDatePickerOpen,
    setIsEndDatePickerOpen,
    handleStartDateChange,
    handleExport,
  };
};
