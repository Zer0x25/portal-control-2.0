import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useTimeControl } from "../../../features/time-control/hooks/useTimeControl";

const { queryArgsMock, filtersMock } = vi.hoisted(() => ({
  queryArgsMock: vi.fn(),
  filtersMock: {
    name: "Ana",
    area: "Ops",
    workdayType: "Full",
    status: "Activo",
    showAnomalies: false,
  },
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: {
      id: "u1",
      username: "admin",
      role: "Administrador",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
  }),
}));

vi.mock("../../../hooks/useScheduling", () => ({
  useScheduling: () => ({
    getEmployeeDailyScheduleInfo: vi.fn(() => null),
  }),
}));

vi.mock("../../../features/time-control/hooks/useTimeRecordFilters", () => ({
  useTimeRecordFilters: () => ({
    appliedDateFilters: { desde: "2026-03-01", hasta: "2026-03-03" },
    clientFilters: filtersMock,
    dateFilters: { desde: "2026-03-01", hasta: "2026-03-03", is24h: true },
    handleClientFilterChange: vi.fn(),
    handleDateFilterChange: vi.fn(),
    handleQuickFilterClick: vi.fn(),
    handleApplyCustomFilters: vi.fn(),
    clearFilters: vi.fn(),
    isApplyButtonEnabled: true,
    periodDisplayText: "Marzo",
    activeQuickFilter: null,
  }),
}));

vi.mock("../../../features/time-control/hooks/useTimeControlModals", () => ({
  useTimeControlModals: () => ({
    modalState: { type: "none" },
    setModalState: vi.fn(),
    editingRecordInfo: null,
    closeEditTimestampModal: vi.fn(),
    isAddNoveltyModalOpen: false,
    setIsAddNoveltyModalOpen: vi.fn(),
    noveltyInitialText: "",
    handleDeleteClick: vi.fn(),
    handleConfirmDelete: vi.fn(),
    handleAddCommentClick: vi.fn(),
    handleSaveNovelty: vi.fn(),
    handleEditClick: vi.fn(),
    handleViewHistory: vi.fn(),
    isResolutionModalOpen: false,
    setIsResolutionModalOpen: vi.fn(),
    recordToResolve: null,
    handleResolveAnomalyClick: vi.fn(),
    handleConfirmResolution: vi.fn(),
    isProcessingResolution: false,
  }),
}));

vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("../../../hooks/queries/useTimeRecordsQuery", () => ({
  useTimeRecordsQuery: (args: unknown) => {
    queryArgsMock(args);
    return {
      data: {
        pages: [
          {
            total: 1,
            data: [
              {
                id: "r1",
                employeeId: "e1",
                employeeName: "Ana",
                date: "2026-03-02",
                entrada: "2026-03-02T08:00:00.000Z",
                salida: "2026-03-02T17:00:00.000Z",
                status: "OK",
                scheduledHours: 9,
              },
            ],
          },
        ],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useAccountingLockDateQuery: () => ({ data: "2026-01-01" }),
}));

vi.mock("../../../utils/calculations", () => ({
  getEmployeeClockingStatus: vi.fn(() => null),
}));

vi.mock("../../../services/apiBase", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

describe("useTimeControl", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
    vi.clearAllMocks();
    filtersMock.name = "Ana";
    filtersMock.area = "Ops";
    filtersMock.workdayType = "Full";
    filtersMock.status = "Activo";
    filtersMock.showAnomalies = false;
  });

  it("builds filtersKey and opens the local quick action modal on row double click", () => {
    const { result } = renderHook(() => useTimeControl());

    expect(result.current.filtersKey).toContain("2026-03-01");
    expect(result.current.filtersKey).toContain("Ana");

    act(() => {
      result.current.handleRowDoubleClick({ id: "r1" } as never);
    });

    expect(result.current.quickActionRecord).toEqual({ id: "r1" });
  });

  it("exports streaming only when token exists", () => {
    const locationSpy = vi.spyOn(window, "location", "get");
    const hrefSetter = vi.fn();
    locationSpy.mockReturnValue({
      ...window.location,
      set href(value: string) {
        hrefSetter(value);
      },
      get href() {
        return "http://localhost";
      },
    } as never);

    const { result } = renderHook(() => useTimeControl());

    authTokenStore.removeToken();
    act(() => {
      result.current.handleExportStreaming("csv");
    });
    expect(hrefSetter).not.toHaveBeenCalled();

    authTokenStore.setToken("token-123");
    act(() => {
      result.current.handleExportStreaming("excel");
    });

    expect(hrefSetter).toHaveBeenCalledTimes(1);
    expect(hrefSetter.mock.calls[0][0]).toContain("/records/export?");
    expect(hrefSetter.mock.calls[0][0]).toContain("format=excel");
    expect(hrefSetter.mock.calls[0][0]).toContain("token=token-123");

    locationSpy.mockRestore();
  });

  it("enables anomaly mode when anomaly status is selected in manual filters", () => {
    filtersMock.status = "AnomaliaManual";

    renderHook(() => useTimeControl());

    const lastArgs = queryArgsMock.mock.calls.at(-1)?.[0] as {
      filters: { status?: string; showAnomalies?: boolean };
    };

    expect(lastArgs.filters.showAnomalies).toBe(true);
    expect(lastArgs.filters.status).toBe("");
  });
});
