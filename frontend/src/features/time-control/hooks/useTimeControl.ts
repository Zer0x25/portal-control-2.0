import { useMemo, useCallback } from "react";
import { AttendanceRecord, DailyTimeRecord } from "../../../types/index";
import { useAuth } from "../../../hooks/useAuth";
import { useTimeRecordsQuery } from "../../../hooks/queries/useTimeRecordsQuery";
import { useScheduling } from "../../../hooks/useScheduling";
import { useStore } from "../../../store/useStore";
import { useTimeRecordFilters } from "./useTimeRecordFilters";
import { useTimeControlModals } from "./useTimeControlModals";
import { useDebounce } from "../../../hooks/useDebounce";
import { getContractAttendanceMetrics, getContractClockingStatus } from "../../../utils/mappings";
import { useAccountingLockDateQuery } from "../../../hooks/queries/useConfigQuery";
import { authService } from "../../../services/authService";
import { API_BASE_URL } from "../../../services/apiBase";

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
  const { getEmployeeDailyScheduleInfo } = useScheduling();
  useAccountingLockDateQuery();

  // Decomposed hooks
  const filters = useTimeRecordFilters();
  const modals = useTimeControlModals();

  const isActionDisabledForRole =
    currentUser?.role === "Supervisor" || currentUser?.role === "Fiscalizador";
  const roleBasedTooltip = isActionDisabledForRole ? "Acciones deshabilitadas para este rol." : "";

  // Centralized modal state from global store
  const openQuickActionModal = useStore((s) => s.openQuickActionModal);

  const filtersKey = useMemo(() => {
    return JSON.stringify({ ...filters.appliedDateFilters, ...filters.clientFilters });
  }, [filters.appliedDateFilters, filters.clientFilters]);

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

  const flatRecords = useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  // ----------------------------------------------------

  // Si el backend ya envía workedHours/overtimeHours, usamos AugmentedTimeRecord
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
    handleExportStreaming: (format: "csv" | "excel") => {
      const token = authService.getToken();
      if (!token) return;

      const params = new URLSearchParams();
      params.append("startDate", desde);
      params.append("endDate", hasta);
      params.append("format", format);
      params.append("token", token);

      if (debouncedSearchName) params.append("name", debouncedSearchName);
      if (area) params.append("area", area);
      if (workdayType) params.append("workdayType", workdayType);

      const url = `${API_BASE_URL}/records/export?${params.toString()}`;
      window.location.href = url;
    },
    filteredRecords: enrichedRecords, // Renamed for component compatibility
    totalRecords: infiniteData?.pages[0]?.total || 0,
    // Keep quick action modal logic from modals hook
    ...useStore((s) => ({
      quickActionRecord: s.quickActionRecord,
      closeQuickActionModal: s.closeQuickActionModal,
      quickActionClockStatus: getContractClockingStatus(
        s.quickActionRecord as AttendanceRecord,
        () => "fuera",
      ),
    })),
    handleRowDoubleClick: useCallback(
      (record: DailyTimeRecord) => openQuickActionModal(record),
      [openQuickActionModal],
    ),
  };
};
