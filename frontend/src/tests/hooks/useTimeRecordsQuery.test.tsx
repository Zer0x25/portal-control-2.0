import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  useTimeRecordsQuery,
  useTimeRecordMutations,
} from "../../hooks/queries/useTimeRecordsQuery";

const { getAllMock, idbGetAllMock, idbPutBulkMock, punchMock, addToastMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  idbGetAllMock: vi.fn(),
  idbPutBulkMock: vi.fn(),
  punchMock: vi.fn(),
  addToastMock: vi.fn(),
}));

vi.mock("../../services/timeRecordService", () => ({
  timeRecordService: {
    getAll: getAllMock,
    punch: punchMock,
  },
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../utils/indexedDB", () => ({
  STORES: { DAILY_TIME_RECORDS: "dailyTimeRecords" },
  idbGetAll: idbGetAllMock,
  idbPutBulk: idbPutBulkMock,
}));

describe("useTimeRecordsQuery anomaly filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters cached fallback data when showAnomalies is enabled and backend fails", async () => {
    getAllMock.mockRejectedValue(new Error("network down"));
    idbGetAllMock.mockResolvedValue([
      {
        id: "r-anomaly",
        employeeId: "e1",
        employeeName: "Ana",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: "2026-03-01",
        status: "AnomaliaManual",
      },
      {
        id: "r-ok",
        employeeId: "e2",
        employeeName: "Beto",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: "2026-03-01",
        status: "Completado",
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useTimeRecordsQuery({
          pageSize: 30,
          filters: {
            desde: "2026-03-01",
            hasta: "2026-03-01",
            showAnomalies: true,
          },
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data?.pages[0].data).toBeDefined();
    });

    const data = result.current.data?.pages[0].data || [];
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("r-anomaly");
    expect(data[0].status).toBe("AnomaliaManual");
  });

  it("does not repopulate stale cached rows when backend returns empty for a manual status filter", async () => {
    getAllMock.mockResolvedValue({ data: [], total: 0, totalPages: 1 });
    idbGetAllMock.mockResolvedValue([
      {
        id: "r-stale",
        employeeId: "e1",
        employeeName: "Ana",
        employeeArea: "Ops",
        employeeWorkdayType: "Normal",
        date: "2026-03-01",
        status: "AnomaliaManual",
      },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useTimeRecordsQuery({
          pageSize: 30,
          filters: {
            desde: "2026-03-01",
            hasta: "2026-03-01",
            status: "AnomaliaManual",
          },
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data?.pages[0].data).toBeDefined();
    });

    const data = result.current.data?.pages[0].data || [];
    expect(data).toHaveLength(0);
  });
});

describe("useTimeRecordMutations punch error toast (spec 030)", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    punchMock.mockRejectedValue(new Error("backend dice no"));
  });

  it("toasts on punch failure by default (time-control path)", async () => {
    const { result } = renderHook(() => useTimeRecordMutations(), { wrapper });

    await act(async () => {
      await expect(
        result.current.punchMutation.mutateAsync({ employeeId: "e1" }),
      ).rejects.toThrow();
    });

    expect(addToastMock).toHaveBeenCalledWith("backend dice no", "error");
  });

  it("skips the toast when the caller handles the error itself", async () => {
    const { result } = renderHook(() => useTimeRecordMutations(), { wrapper });

    await act(async () => {
      await expect(
        result.current.punchMutation.mutateAsync({
          employeeId: "e1",
          suppressErrorToast: true,
        }),
      ).rejects.toThrow();
    });

    expect(addToastMock).not.toHaveBeenCalled();
    expect(punchMock).toHaveBeenCalledWith("e1", undefined, undefined, undefined);
  });
});
