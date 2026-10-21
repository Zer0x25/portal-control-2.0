import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { format, subDays } from "date-fns";
import {
  useAttendanceAnalytics,
  useAttendanceTrends,
} from "../../../features/supervisor-dashboard/hooks/useAttendanceAnalytics";
import { authTokenStore } from "../../../services/authToken";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";
import { recordRequests, type RequestRecorder } from "../../mocks/requests";

const businessNowMock = vi.fn();

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

const point = (date: string, present: number, total: number, late: number) => ({
  date,
  present,
  total,
  late,
});

describe("useAttendanceAnalytics", () => {
  let recorder: RequestRecorder;

  beforeEach(() => {
    authTokenStore.setToken("fixture");
    businessNowMock.mockReset();
    businessNowMock.mockReturnValue(new Date("2026-03-06T12:00:00.000Z"));
    recorder = recordRequests();
  });

  afterEach(() => {
    recorder.stop();
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("fetches the window with a single server-aggregated request", async () => {
    const day = "2026-03-05";
    server.use(
      http.get("http://localhost:4000/api/records/daily-attendance", () =>
        HttpResponse.json([point("2026-03-04", 1, 2, 0), point(day, 2, 2, 1)]),
      ),
    );

    const { result } = renderHook(() => useAttendanceAnalytics(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Una sola request agregada (adios volcado paginado de ~6MB).
    expect(recorder.countOf("GET", "/api/records/daily-attendance")).toBe(1);
    const row = result.current.data?.find((d) => d.date === day);
    expect(row).toBeDefined();
    expect(row?.present).toBe(2);
    expect(row?.late).toBe(1);
  });

  it("builds trend summary from recent vs previous week", async () => {
    const now = new Date("2026-03-06T12:00:00.000Z");
    const series = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (13 - i));
      const day = d.toISOString().slice(0, 10);
      // Semana reciente con mas presentes que la anterior.
      return i >= 7 ? point(day, 2, 2, 0) : point(day, 1, 2, 0);
    });
    server.use(
      http.get("http://localhost:4000/api/records/daily-attendance", () =>
        HttpResponse.json(series),
      ),
    );

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
    server.use(
      http.get("http://localhost:4000/api/records/daily-attendance", () => HttpResponse.json([])),
    );

    const { result } = renderHook(() => useAttendanceAnalytics(2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const expectedEndDate = format(mockedBusinessNow, "yyyy-MM-dd");
    const expectedStartDate = format(subDays(mockedBusinessNow, 1), "yyyy-MM-dd");
    const last = recorder.requests[recorder.requests.length - 1];
    expect(last.query.get("desde")).toBe(expectedStartDate);
    expect(last.query.get("hasta")).toBe(expectedEndDate);
  });
});
