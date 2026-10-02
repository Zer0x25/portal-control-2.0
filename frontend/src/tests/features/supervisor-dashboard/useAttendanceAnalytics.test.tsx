import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { format, subDays } from "date-fns";
import {
  useAttendanceAnalytics,
  useAttendanceTrends,
} from "../../../features/supervisor-dashboard/hooks/useAttendanceAnalytics";

const { getAllMock, businessNowMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  businessNowMock: vi.fn(),
}));

vi.mock("../../../services/timeRecordService", () => ({
  timeRecordService: {
    getAll: (...args: unknown[]) => getAllMock(...args),
  },
}));

vi.mock("../../../hooks/useBusinessNow", () => ({
  useBusinessNow: (...args: unknown[]) => businessNowMock(...args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAttendanceAnalytics", () => {
  beforeEach(() => {
    getAllMock.mockReset();
    businessNowMock.mockReset();
    businessNowMock.mockReturnValue(new Date("2026-03-06T12:00:00.000Z"));
  });

  it("calculates late arrivals using 15-minute tolerance", async () => {
    const now = new Date("2026-03-06T12:00:00.000Z");
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const day = yesterday.toISOString().slice(0, 10);

    getAllMock.mockResolvedValue({
      data: [
        {
          id: "r1",
          employeeId: "e1",
          date: day,
          entrada: `${day}T08:14:00`,
          scheduledStartTime: "08:00",
          status: "Presente",
        },
        {
          id: "r2",
          employeeId: "e2",
          date: day,
          entrada: `${day}T08:16:00`,
          scheduledStartTime: "08:00",
          status: "Presente",
        },
      ],
      totalPages: 1,
    });

    const { result } = renderHook(() => useAttendanceAnalytics(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const row = result.current.data?.find((d) => d.date === day);
    expect(row).toBeDefined();
    expect(row?.present).toBe(2);
    expect(row?.late).toBe(1);
  });

  it("prefers backend contract fields for lateness and attendance status", async () => {
    const day = "2026-03-05";

    getAllMock.mockResolvedValue({
      data: [
        {
          id: "r1",
          employeeId: "e1",
          date: day,
          entrada: `${day}T08:01:00`,
          scheduledStartTime: "08:00",
          status: "Completado",
          attendanceStatus: "Atraso",
          isLate: true,
        },
        {
          id: "r2",
          employeeId: "e2",
          date: day,
          entrada: `${day}T08:00:00`,
          scheduledStartTime: "08:00",
          status: "Vacaciones",
          attendanceStatus: "Vacaciones",
          isLate: false,
        },
      ],
      totalPages: 1,
    });

    const { result } = renderHook(() => useAttendanceAnalytics(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const row = result.current.data?.find((d) => d.date === day);
    expect(row).toBeDefined();
    expect(row?.present).toBe(1);
    expect(row?.late).toBe(1);
  });

  it("builds trend summary from recent vs previous week", async () => {
    const now = new Date("2026-03-06T12:00:00.000Z");
    const records = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (13 - i));
      const day = d.toISOString().slice(0, 10);
      const isRecentWeek = i >= 7;
      const dayRecords = [
        {
          id: `r-a-${i}`,
          employeeId: "e1",
          date: day,
          entrada: `${day}T08:00:00`,
          scheduledStartTime: "08:00",
          status: "Presente",
        },
      ];
      if (isRecentWeek) {
        dayRecords.push({
          id: `r-b-${i}`,
          employeeId: "e2",
          date: day,
          entrada: `${day}T08:00:00`,
          scheduledStartTime: "08:00",
          status: "Presente",
        });
      }
      return dayRecords;
    }).flat();

    getAllMock.mockResolvedValue({
      data: records,
      totalPages: 1,
    });

    const { result } = renderHook(() => useAttendanceTrends(14), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trends).not.toBeNull();
    expect(result.current.trends?.trend).toBe("up");
  });

  it("queries the window using business time instead of client local time", async () => {
    const mockedBusinessNow = new Date("2026-03-06T12:00:00.000Z");
    businessNowMock.mockReturnValue(mockedBusinessNow);
    getAllMock.mockResolvedValue({
      data: [],
      totalPages: 1,
    });

    const { result } = renderHook(() => useAttendanceAnalytics(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const expectedEndDate = format(mockedBusinessNow, "yyyy-MM-dd");
    const expectedStartDate = format(subDays(mockedBusinessNow, 1), "yyyy-MM-dd");
    expect(getAllMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 500,
      filters: {
        desde: expectedStartDate,
        hasta: expectedEndDate,
      },
    });
  });
});
