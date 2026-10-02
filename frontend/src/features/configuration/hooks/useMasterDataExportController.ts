import { useState } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { timeRecordService } from "../../../services/timeRecordService";
import { authService } from "../../../services/authService";
import { isDateRangeValid } from "../../../utils/validation";
import { toBusinessDateChile } from "../../../utils/dateUtils";

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
      const token = authService.getToken();
      const baseUrl = timeRecordService.getExportUrl(startDate, endDate, format);
      const downloadUrl = `${baseUrl}&token=${token}`;
      window.location.href = downloadUrl;
      addToast(`Descarga de ${format.toUpperCase()} iniciada.`, "success");
      setTimeout(() => setExporting(false), 2000);
    } catch (error) {
      const err = error as Error;
      console.error("Error starting master data export:", err);
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
