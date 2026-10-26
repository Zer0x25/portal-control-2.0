import { renderHook } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useTimeControlData } from "../../../features/time-control/hooks/useTimeControlData";

const configQueryState = vi.hoisted(() => ({ observerCalls: 0 }));

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
  useControlInternoEnabledQuery: () => {
    configQueryState.observerCalls += 1;
    return { data: true, isLoading: false };
  },
  useAccountingLockDateQuery: () => ({ data: "2026-01-01" }),
}));

describe("useTimeControlData", () => {
  afterEach(() => {
    configQueryState.observerCalls = 0;
  });

  it("does not create a duplicate shell configuration observer", () => {
    renderHook(() => useTimeControlData({ isControlInternoEnabled: true, isConfigLoading: false }));

    expect(configQueryState.observerCalls).toBe(0);
  });

  it("does not block the page shell while records load", () => {
    const { result } = renderHook(() =>
      useTimeControlData({ isControlInternoEnabled: true, isConfigLoading: false }),
    );

    expect(result.current.isPageLoading).toBe(false);
    expect(result.current.isControlInternoEnabled).toBe(true);
  });

  it("keeps the page blocked while control configuration loads", () => {
    const { result } = renderHook(() =>
      useTimeControlData({ isControlInternoEnabled: true, isConfigLoading: true }),
    );

    expect(result.current.isPageLoading).toBe(true);
  });

  it("returns an effective lock date with expected format", () => {
    const { result } = renderHook(() =>
      useTimeControlData({ isControlInternoEnabled: true, isConfigLoading: false }),
    );

    expect(result.current.effectiveLockDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("preserves a disabled configuration after loading", () => {
    const { result } = renderHook(() =>
      useTimeControlData({ isControlInternoEnabled: false, isConfigLoading: false }),
    );

    expect(result.current.isControlInternoEnabled).toBe(false);
    expect(result.current.isPageLoading).toBe(false);
  });
});
