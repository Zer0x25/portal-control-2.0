import { useTimeControl } from "./useTimeControl";
import { useTimeRecordActions } from "../../../hooks/useTimeRecordActions";
import { useAccountingLockDateQuery } from "../../../hooks/queries/useConfigQuery";
import { addBusinessDaysChile, toBusinessDateChile } from "../../../utils/dateUtils";
import { useBusinessNow } from "../../../hooks/useBusinessNow";

interface UseTimeControlDataConfig {
  isControlInternoEnabled: boolean;
  isConfigLoading: boolean;
}

/**
 * useTimeControlData - Hook de orquestación para TimeControl
 *
 * Centraliza toda la lógica de negocio, filtros, acciones y configuración
 * para la página de Control de Tiempos.
 */
export const useTimeControlData = ({
  isControlInternoEnabled,
  isConfigLoading,
}: UseTimeControlDataConfig) => {
  const businessNow = useBusinessNow({ tickMs: null });
  const {
    isActionDisabledForRole,
    roleBasedTooltip,
    clientFilters,
    dateFilters,
    handleClientFilterChange,
    handleDateFilterChange,
    handleQuickFilterClick,
    handleApplyCustomFilters,
    clearFilters,
    filteredRecords,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    handleRowDoubleClick,
    handleAddCommentClick,
    handleDeleteClick,
    isAddNoveltyModalOpen,
    setIsAddNoveltyModalOpen,
    noveltyInitialText,
    handleSaveNovelty,
    modalState,
    setModalState,
    editingRecordInfo,
    closeEditTimestampModal,
    handleConfirmDelete,
    quickActionRecord,
    closeQuickActionModal,
    quickActionClockStatus,
    handleEditClick,
    isLoading,
    isApplyButtonEnabled,
    periodDisplayText,
    activeQuickFilter,
    handleExportStreaming,
    handleViewHistory,
    totalRecords,
    filtersKey,
    isResolutionModalOpen,
    setIsResolutionModalOpen,
    recordToResolve,
    handleResolveAnomalyClick,
    handleConfirmResolution,
    isProcessingResolution,
  } = useTimeControl();

  const { startBreak, endBreak, clockOut } = useTimeRecordActions();
  const { data: accountingLockDate } = useAccountingLockDateQuery();

  const effectiveLockDate = (() => {
    const [year, month] = toBusinessDateChile(businessNow).split("-").map(Number);
    const currentYear = year;
    const currentMonth = month - 1;

    let cutoffYear = currentYear;
    let cutoffMonth = currentMonth - 1;

    if (cutoffMonth < 0) {
      cutoffMonth = 11;
      cutoffYear -= 1;
    }

    const autoLockDate = `${cutoffYear}-${String(cutoffMonth + 1).padStart(2, "0")}-01`;

    // La frontera automática es exclusiva; las filas reciben un límite inclusivo.
    const lastAutoLockedDate = addBusinessDaysChile(autoLockDate, -1);
    if (!accountingLockDate) return lastAutoLockedDate;

    return accountingLockDate > lastAutoLockedDate ? accountingLockDate : lastAutoLockedDate;
  })();

  // Keep the route shell visible while record data loads; the table receives isLoading itself.
  const isPageLoading = isConfigLoading;

  return {
    isActionDisabledForRole,
    roleBasedTooltip,
    clientFilters,
    dateFilters,
    handleClientFilterChange,
    handleDateFilterChange,
    handleQuickFilterClick,
    handleApplyCustomFilters,
    clearFilters,
    filteredRecords,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage: !!isFetchingNextPage,
    handleRowDoubleClick,
    handleAddCommentClick,
    handleDeleteClick,
    isAddNoveltyModalOpen,
    setIsAddNoveltyModalOpen,
    noveltyInitialText,
    handleSaveNovelty,
    modalState,
    setModalState,
    editingRecordInfo,
    closeEditTimestampModal,
    handleConfirmDelete,
    quickActionRecord,
    closeQuickActionModal,
    quickActionClockStatus,
    handleEditClick,
    isLoading,
    isApplyButtonEnabled,
    periodDisplayText,
    activeQuickFilter,
    handleExportStreaming,
    handleViewHistory,
    totalRecords,
    filtersKey,
    isResolutionModalOpen,
    setIsResolutionModalOpen,
    recordToResolve,
    handleResolveAnomalyClick,
    handleConfirmResolution,
    isProcessingResolution,
    isControlInternoEnabled,
    effectiveLockDate,
    isPageLoading,
    startBreak,
    endBreak,
    clockOut,
  };
};
