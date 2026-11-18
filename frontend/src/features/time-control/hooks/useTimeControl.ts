import { useMemo, useState } from "react";
import { AttendanceRecord, DailyTimeRecord } from "../../../types/index";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { authService } from "../../../services/authService";
import { useTimeRecordsQuery } from "../../../hooks/queries/useTimeRecordsQuery";
import { useTimeRecordFilters } from "./useTimeRecordFilters";
import { useTimeControlModals } from "./useTimeControlModals";
import { useTimeControlScheduleEnrichment } from "./useTimeControlScheduleEnrichment";
import { useDebounce } from "../../../hooks/useDebounce";
import { getContractAttendanceMetrics, getContractClockingStatus } from "../../../utils/mappings";
import { exportTimeRecords } from "./exportTimeRecords";
import { logger } from "../../../utils/logger";

const RECORDS_PER_PAGE = 30;

const extractKPIs = (record: AttendanceRecord) => {
  return getContractAttendanceMetrics(record, () => ({
    workedHours: 0,
    overtimeHours: 0,
    scheduledHours: 0,
    isDayOffWorked: false,
  }));
};

export const useTimeControl = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToasts();
  const getEmployeeDailyScheduleInfo = useTimeControlScheduleEnrichment();
  // Decomposed hooks
  const filters = useTimeRecordFilters();
  const [quickActionRecord, setQuickActionRecord] = useState<DailyTimeRecord | null>(null);
  const closeQuickActionModal = () => setQuickActionRecord(null);
  const quickActionClockStatus = getContractClockingStatus(
    quickActionRecord as AttendanceRecord,
    () => "fuera",
  );
  const modals = useTimeControlModals({ closeQuickActionModal });

  const isActionDisabledForRole =
    currentUser?.role === "Supervisor" || currentUser?.role === "Fiscalizador";
  const roleBasedTooltip = isActionDisabledForRole ? "Acciones deshabilitadas para este rol." : "";

  const filtersKey = JSON.stringify({ ...filters.appliedDateFilters, ...filters.clientFilters });

  // -- PHASE 4: TanStack Infinite Query (PORTAL GOLD) --
  const { desde, hasta } = filters.appliedDateFilters;
  const { name, area, workdayType, status, showAnomalies } = filters.clientFilters;
  const isAnomalyStatusSelected =
    status === "AnomaliaManual" || status === "SinMarcajeTurnoAsignado";
  const effectiveShowAnomalies = showAnomalies || isAnomalyStatusSelected;
  const effectiveStatus = isAnomalyStatusSelected ? "" : status;
  // Debounce the search name
  const debouncedSearchName = useDebounce(name, 500);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isPlaceholderData,
    refetch,
  } = useTimeRecordsQuery({
    pageSize: RECORDS_PER_PAGE,
    filters: {
      desde,
      hasta,
      name: debouncedSearchName,
      area,
      workdayType,
      status: effectiveStatus,
      showAnomalies: effectiveShowAnomalies,
    },
  });

  // Keep cached page rows stable across unrelated state changes so the virtual table
  // does not rebuild its row model while a modal or filter control updates.
  const flatRecords = useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  // ----------------------------------------------------

  // Si el backend ya envía workedHours/overtimeHours, usamos AugmentedTimeRecord
  // This per-row schedule/KPI enrichment is the measured heavy path for this table.
  const enrichedRecords = useMemo(() => {
    return flatRecords.map((record) => {
      const scheduleInfo = getEmployeeDailyScheduleInfo(
        record.employeeId,
        new Date(record.date + "T12:00:00Z"),
      );
      // Garantizar campos KPI requeridos por AugmentedTimeRecord
      const { workedHours, overtimeHours, scheduledHours, isDayOffWorked } = extractKPIs(
        record as AttendanceRecord,
      );
      return {
        ...record,
        workedHours,
        overtimeHours,
        scheduledHours,
        isDayOffWorked,
        scheduleInfo,
      } as import("../../../types/derived").AugmentedTimeRecord;
    });
  }, [flatRecords, getEmployeeDailyScheduleInfo]);

  return {
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPlaceholderData,
    refetch,
    isActionDisabledForRole,
    roleBasedTooltip,
    filtersKey,
    ...filters,
    ...modals,
    handleExportStreaming: async (format: "csv" | "excel" | "pdf") => {
      if (!authService.getToken()) return;
      try {
        const exported = await exportTimeRecords(format, {
          desde,
          hasta,
          name: debouncedSearchName,
          area,
          workdayType,
          status: effectiveStatus,
          showAnomalies: effectiveShowAnomalies,
        });
        if (!exported)
          addToast("No hay datos para exportar o se bloqueó la ventana de impresión.", "info");
        else
          addToast(
            format === "pdf" ? "Vista de impresión abierta." : "Registros exportados.",
            "success",
          );
      } catch (error) {
        logger.error("Error exporting time records:", error);
        addToast(
          error instanceof Error ? error.message : "Error al exportar registros de asistencia.",
          "error",
        );
      }
    },
    filteredRecords: enrichedRecords, // Renamed for component compatibility
    totalRecords: infiniteData?.pages[0]?.total || 0,
    quickActionRecord,
    closeQuickActionModal,
    quickActionClockStatus,
    handleRowDoubleClick: (record: DailyTimeRecord) => setQuickActionRecord(record),
  };
};
