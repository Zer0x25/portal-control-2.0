import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import {
  useTimeRecordsQuery,
  useTimeRecordMutations,
} from "../../hooks/queries/useTimeRecordsQuery";

const { idbGetAllMock, idbPutBulkMock, addToastMock } = vi.hoisted(() => ({
  idbGetAllMock: vi.fn(),
  idbPutBulkMock: vi.fn(),
  addToastMock: vi.fn(),
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../utils/indexedDB", () => ({
  STORES: { DAILY_TIME_RECORDS: "dailyTimeRecords" },
  idbGetAll: idbGetAllMock,
  idbPutBulk: idbPutBulkMock,
}));

describe("useTimeRecordsQuery anomaly filtering (MSW)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters cached fallback data when showAnomalies is enabled and backend fails", async () => {
    server.use(
      http.get("*/api/records", () => {
        return HttpResponse.error();
      }),
    );

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
    server.use(
      http.get("*/api/records", () => {
        return HttpResponse.json({ data: [], total: 0, totalPages: 1 });
      }),
    );

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

describe("useTimeRecordMutations punch error toast (spec 030 - MSW)", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    server.use(
      http.post("*/api/records/punch", () => {
        return HttpResponse.json({ message: "backend dice no" }, { status: 500 });
      }),
    );
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
    let capturedBody: { employeeId?: string } | null = null;
    server.use(
      http.post("*/api/records/punch", async ({ request }) => {
        capturedBody = (await request.json()) as { employeeId?: string };
        return HttpResponse.json({ message: "backend dice no" }, { status: 500 });
      }),
    );

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
    expect(capturedBody?.employeeId).toBe("e1");
  });
});
