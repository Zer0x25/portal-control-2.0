import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useTimeControlData } from "../../../features/time-control/hooks/useTimeControlData";

vi.mock("../../../features/time-control/hooks/useTimeControl", () => ({
  useTimeControl: () => ({
    isActionDisabledForRole: false,
    roleBasedTooltip: "",
    clientFilters: { name: "", area: "", workdayType: "", status: "", showAnomalies: false },
    dateFilters: { desde: "2026-03-01", hasta: "2026-03-03", is24h: true },
    handleClientFilterChange: vi.fn(),
    handleDateFilterChange: vi.fn(),
    handleQuickFilterClick: vi.fn(),
    handleApplyCustomFilters: vi.fn(),
    clearFilters: vi.fn(),
    filteredRecords: [],
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    handleRowDoubleClick: vi.fn(),
    handleAddCommentClick: vi.fn(),
    handleDeleteClick: vi.fn(),
    isAddNoveltyModalOpen: false,
    setIsAddNoveltyModalOpen: vi.fn(),
    noveltyInitialText: "",
    handleSaveNovelty: vi.fn(),
    modalState: { type: "none" },
    setModalState: vi.fn(),
    handleConfirmDelete: vi.fn(),
    quickActionRecord: null,
    closeQuickActionModal: vi.fn(),
    quickActionClockStatus: null,
    handleEditClick: vi.fn(),
    isLoading: true,
    isApplyButtonEnabled: true,
    periodDisplayText: "Marzo",
    activeQuickFilter: null,
    handleExportStreaming: vi.fn(),
    handleViewHistory: vi.fn(),
    totalRecords: 0,
    filtersKey: "k1",
    isResolutionModalOpen: false,
    setIsResolutionModalOpen: vi.fn(),
    recordToResolve: null,
    handleResolveAnomalyClick: vi.fn(),
    handleConfirmResolution: vi.fn(),
    isProcessingResolution: false,
  }),
}));

vi.mock("../../../hooks/useTimeRecordActions", () => ({
  useTimeRecordActions: () => ({
    startBreak: vi.fn(),
    endBreak: vi.fn(),
    clockOut: vi.fn(),
  }),
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useControlInternoEnabledQuery: () => ({ data: true, isLoading: false }),
  useAccountingLockDateQuery: () => ({ data: "2026-01-01" }),
}));

describe("useTimeControlData", () => {
  it("computes page loading from hook loading when no records", () => {
    const { result } = renderHook(() => useTimeControlData());

    expect(result.current.isPageLoading).toBe(true);
    expect(result.current.isControlInternoEnabled).toBe(true);
  });

  it("returns an effective lock date with expected format", () => {
    const { result } = renderHook(() => useTimeControlData());

    expect(result.current.effectiveLockDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
