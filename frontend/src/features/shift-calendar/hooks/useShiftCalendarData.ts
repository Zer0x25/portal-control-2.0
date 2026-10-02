import { useState, useEffect, useCallback, useMemo } from "react";
import { useEmployees } from "../../../hooks/useEmployees";
import { useToasts } from "../../../hooks/useToasts";
import { useStore } from "../../../store/useStore";
import {
  formatDateUTCISO,
  getDateRange,
  getWeekStartDate,
  generateCalendarGrid,
} from "../../../utils/dateUtils";
import { exportShiftScheduleToICS, exportCalendarToPDF } from "../../../utils/export/index";
import type { IcsShiftEvent } from "../../../utils/export/exportToIcs";
import { useAuth } from "../../../hooks/useAuth";
import { useCalendarData } from "../../../hooks/useCalendarData";
import { exportService } from "../../../services/exportService";
import { useBusinessNow } from "../../../hooks/useBusinessNow";

export type CalendarViewMode = "month" | "week" | "day";
type CalendarEntryType = "employee" | "group" | "holiday";

interface CalendarGroupItem {
  employeeId?: string;
  employeeName?: string;
  startTime?: string;
  endTime?: string;
  shiftPatternName?: string;
  patternColor?: string;
}

interface CalendarEmployeeInfo {
  justificationType?: string;
  scheduleText?: string;
  isWorkDay?: boolean;
  patternColor?: string;
  shiftPatternName?: string;
  startTime?: string;
  endTime?: string;
}

interface CalendarHolidayInfo {
  name?: string;
}

export const useShiftCalendarData = () => {
  const businessNow = useBusinessNow({ tickMs: null });
  const { addToast } = useToasts();
  const incrementProcessing = useStore((state) => state.incrementProcessing);
  const decrementProcessing = useStore((state) => state.decrementProcessing);
  const { currentUser } = useAuth();
  const isWorker = currentUser?.role === "Usuario";
  const { activeEmployees, isLoadingEmployees } = useEmployees();

  const [displayDate, setDisplayDate] = useState(() => new Date(businessNow));
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedCargo, setSelectedCargo] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    isWorker ? currentUser?.employeeId || null : null,
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const filteredEmployeesForCalendar = useMemo(() => {
    return activeEmployees
      .filter((e) => {
        if (selectedArea && e.area !== selectedArea) return false;
        if (selectedCargo && e.position !== selectedCargo) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeEmployees, selectedArea, selectedCargo]);

  const { isAssignedShiftsLoading, isShiftPatternsLoading, scheduleMap, isLoadingCalendar } =
    useCalendarData({
      displayDate,
      viewMode,
      selectedEmployeeId,
      filteredEmployees: filteredEmployeesForCalendar,
    });

  const uniqueAreas = useMemo(() => {
    const areas = activeEmployees.map((e) => e.area).filter(Boolean);
    return Array.from(new Set(areas)).sort() as string[];
  }, [activeEmployees]);

  const uniqueCargosInArea = useMemo(() => {
    const filtered = selectedArea
      ? activeEmployees.filter((e) => e.area === selectedArea)
      : activeEmployees;
    const cargos = filtered.map((e) => e.position).filter(Boolean);
    return Array.from(new Set(cargos)).sort() as string[];
  }, [activeEmployees, selectedArea]);

  const handlePrev = useCallback(() => {
    const newDate = new Date(displayDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setDisplayDate(newDate);
  }, [displayDate, viewMode]);

  const handleNext = useCallback(() => {
    const newDate = new Date(displayDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setDisplayDate(newDate);
  }, [displayDate, viewMode]);

  useEffect(() => {
    // reserved for reactive role-based resets if needed
  }, []);

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedArea(e.target.value);
    setSelectedCargo("");
    if (!isWorker) setSelectedEmployeeId(null);
  };

  const handleCargoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCargo(e.target.value);
    if (!isWorker) setSelectedEmployeeId(null);
  };

  const handleDayDoubleClick = (date: Date) => {
    setDisplayDate(date);
    setViewMode("day");
    if (!isWorker) {
      setSelectedEmployeeId(null);
    }
  };

  const handleExportToPDF = async () => {
    if (viewMode === "day") {
      addToast("La impresión de grilla no está disponible en vista diaria.", "warning");
      return;
    }

    incrementProcessing();
    setIsPrinting(true);
    try {
      const periodDisplay =
        viewMode === "month"
          ? new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(displayDate)
          : `Semana del ${getWeekStartDate(new Date(displayDate)).toLocaleDateString("es-CL")}`;

      const filtersString = [
        selectedArea ? `Área: ${selectedArea}` : null,
        selectedCargo ? `Cargo: ${selectedCargo}` : null,
        selectedEmployeeId
          ? `Colaborador: ${activeEmployees.find((e) => e.id === selectedEmployeeId)?.name}`
          : "Dotación Completa",
      ]
        .filter(Boolean)
        .join(" | ");

      const weekDayNames = [
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
        "Domingo",
      ];
      const gridCells = generateCalendarGrid(viewMode as "month" | "week", displayDate);

      const getCellContent = (date: Date) => {
        const dateStr = formatDateUTCISO(date);
        const dayData = scheduleMap.get(dateStr) as
          { type: CalendarEntryType; data: unknown } | undefined;

        if (!dayData) return "";

        if (dayData.type === "employee") {
          const d = dayData.data as CalendarEmployeeInfo;
          if (d.justificationType) {
            return `<div class="schedule-item"><p class="font-semibold" style="color:#7c3aed">${d.scheduleText}</p></div>`;
          }
          if (d.isWorkDay) {
            return `
              <div class="schedule-item">
                <p class="font-semibold" style="color:${d.patternColor || "#4b5563"}">${d.shiftPatternName || "Turno"}</p>
                <p>${d.startTime} - ${d.endTime}</p>
              </div>
            `;
          }
          return '<div class="schedule-item"><p style="opacity:0.3; font-size:9px">LIBRE</p></div>';
        }

        if (dayData.type === "holiday") {
          const holidayData = dayData.data as CalendarHolidayInfo;
          return `<div class="schedule-item"><p class="font-semibold" style="color:#f97316; font-size:8px">FERIADO</p><p style="font-size:9px">${holidayData.name || ""}</p></div>`;
        }

        if (dayData.type === "group") {
          const emps = Array.isArray(dayData.data) ? (dayData.data as CalendarGroupItem[]) : [];
          return emps
            .slice(0, 12)
            .map(
              (e) =>
                `<span class="employee-tag" style="background-color:${e.patternColor || "#4b5563"}">${(e.employeeName || "").split(" ").pop() || ""}</span>`,
            )
            .join("");
        }

        return "";
      };

      exportCalendarToPDF(
        isWorker ? "Mi Calendario de Turnos" : "Calendario Operativo de Turnos",
        periodDisplay.toUpperCase(),
        filtersString,
        weekDayNames,
        gridCells,
        getCellContent,
      );

      addToast("Vista de impresión generada con éxito.", "success");
    } catch (error: unknown) {
      console.error("Print Error:", error);
      addToast("Error al generar la vista de impresión.", "error");
    } finally {
      setIsPrinting(false);
      decrementProcessing();
    }
  };

  const handleDownloadBackendPDF = async () => {
    incrementProcessing();
    setIsDownloading(true);
    try {
      const { startDate, endDate } = getDateRange(viewMode, displayDate);
      await exportService.downloadCalendarPDF(
        {
          startDate: formatDateUTCISO(startDate),
          endDate: formatDateUTCISO(endDate),
          employeeId: selectedEmployeeId || undefined,
          area: selectedArea || undefined,
          cargo: selectedCargo || undefined,
          viewMode,
        },
        "download",
      );
      addToast("Calendario descargado correctamente.", "success");
    } catch {
      addToast("Error al descargar el PDF técnico.", "error");
    } finally {
      setIsDownloading(false);
      decrementProcessing();
    }
  };

  const handleExportToICS = () => {
    if (!selectedEmployeeId) return;
    const employee = activeEmployees.find((e) => e.id === selectedEmployeeId);

    const events: IcsShiftEvent[] = [];
    scheduleMap.forEach((val, key) => {
      const dayData = val as { type?: CalendarEntryType; data?: unknown };
      if (dayData.type === "employee" || dayData.type === "group") {
        const details = Array.isArray(dayData.data)
          ? (dayData.data as CalendarGroupItem[])
          : dayData.data
            ? ([dayData.data] as CalendarGroupItem[])
            : [];
        details.forEach((d) => {
          if (d.employeeId === selectedEmployeeId || !selectedEmployeeId) {
            events.push({
              date: key,
              startTime: d.startTime,
              endTime: d.endTime,
              patternName: d.shiftPatternName || "Turno",
            });
          }
        });
      }
    });

    exportShiftScheduleToICS(events, {
      calendarName: "Portal Control - Turnos",
      filename: `Turnos_${employee?.name || "Empleado"}`,
      employeeName: employee?.name || "Empleado",
    });
    addToast("Eventos de turno exportados a formato ICS.", "success");
  };

  return {
    currentUser,
    isWorker,
    activeEmployees,
    isLoadingEmployees,
    displayDate,
    viewMode,
    selectedArea,
    selectedCargo,
    selectedEmployeeId,
    isDownloading,
    isPrinting,
    filteredEmployeesForCalendar,
    isAssignedShiftsLoading,
    isShiftPatternsLoading,
    scheduleMap,
    isLoadingCalendar,
    uniqueAreas,
    uniqueCargosInArea,
    setDisplayDate,
    setViewMode,
    setSelectedEmployeeId,
    handlePrev,
    handleNext,
    handleAreaChange,
    handleCargoChange,
    handleDayDoubleClick,
    handleExportToPDF,
    handleDownloadBackendPDF,
    handleExportToICS,
  };
};
