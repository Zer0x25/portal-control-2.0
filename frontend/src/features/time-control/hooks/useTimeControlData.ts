import { useTimeControl } from "./useTimeControl";
import { useTimeRecordActions } from "../../../hooks/useTimeRecordActions";
import { useAccountingLockDateQuery } from "../../../hooks/queries/useConfigQuery";
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
    const currentYear = businessNow.getFullYear();
    const currentMonth = businessNow.getMonth();

    let cutoffYear = currentYear;
    let cutoffMonth = currentMonth - 1;

    if (cutoffMonth < 0) {
      cutoffMonth = 11;
      cutoffYear -= 1;
    }

    const autoLockDate = `${cutoffYear}-${String(cutoffMonth + 1).padStart(2, "0")}-01`;

    if (!accountingLockDate) return autoLockDate;

    return accountingLockDate > autoLockDate ? accountingLockDate : autoLockDate;
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
