import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { authTokenStore } from "../../../services/authToken";
import { useTimeControl } from "../../../features/time-control/hooks/useTimeControl";
import { server } from "../../mocks/server";

const {
  queryArgsMock,
  filtersMock,
  schedulingMock,
  scheduleEnrichmentMock,
  accountingLockDateQueryMock,
  triggerBrowserDownloadMock,
} = vi.hoisted(() => ({
  queryArgsMock: vi.fn(),
  schedulingMock: vi.fn(),
  scheduleEnrichmentMock: vi.fn(),
  accountingLockDateQueryMock: vi.fn(),
  triggerBrowserDownloadMock: vi.fn(),
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
  useScheduling: (...args: unknown[]) => {
    schedulingMock(...args);
    return { getEmployeeDailyScheduleInfo: vi.fn(() => null) };
  },
}));

vi.mock("../../../features/time-control/hooks/useTimeControlScheduleEnrichment", () => ({
  useTimeControlScheduleEnrichment: () => {
    scheduleEnrichmentMock();
    return vi.fn(() => null);
  },
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
  useAccountingLockDateQuery: () => {
    accountingLockDateQueryMock();
    return { data: "2026-01-01" };
  },
}));

vi.mock("../../../utils/calculations", () => ({
  getEmployeeClockingStatus: vi.fn(() => null),
}));

vi.mock("../../../utils/triggerBrowserDownload", () => ({
  triggerBrowserDownload: (...args: unknown[]) => triggerBrowserDownloadMock(...args),
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

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("builds filtersKey and opens the local quick action modal on row double click", () => {
    const { result } = renderHook(() => useTimeControl());

    expect(scheduleEnrichmentMock).toHaveBeenCalledTimes(1);
    expect(schedulingMock).not.toHaveBeenCalled();
    expect(result.current.filtersKey).toContain("2026-03-01");
    expect(result.current.filtersKey).toContain("Ana");

    act(() => {
      result.current.handleRowDoubleClick({ id: "r1" } as never);
    });

    expect(result.current.quickActionRecord).toEqual({ id: "r1" });
  });

  it("does not subscribe to accounting lock date without consuming its result", () => {
    renderHook(() => useTimeControl());

    expect(accountingLockDateQueryMock).not.toHaveBeenCalled();
  });

  it("exports streaming via Authorization Bearer without token query param only when token exists", async () => {
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:4000/api/records/export", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return new HttpResponse(new Blob(["col1,col2"], { type: "text/csv" }), {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="marcajes.xlsx"' },
        });
      }),
    );

    const { result } = renderHook(() => useTimeControl());

    authTokenStore.removeToken();
    await act(async () => {
      await result.current.handleExportStreaming("csv");
    });
    expect(capturedUrl).toBe("");
    expect(triggerBrowserDownloadMock).not.toHaveBeenCalled();

    authTokenStore.setToken("token-123");
    await act(async () => {
      await result.current.handleExportStreaming("excel");
    });

    expect(capturedAuth).toBe("Bearer token-123");
    expect(capturedUrl).toContain("/records/export?");
    expect(capturedUrl).toContain("format=excel");
    expect(capturedUrl).not.toContain("token=");
    expect(triggerBrowserDownloadMock).toHaveBeenCalledWith(expect.any(Blob), "marcajes.xlsx");
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
