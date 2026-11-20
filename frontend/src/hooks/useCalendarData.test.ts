import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCalendarData } from "./useCalendarData";

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));
vi.mock("./queries/useCalendarMatrixQuery", () => ({ useCalendarMatrixQuery: query }));
vi.mock("./queries/useShiftPatternsQuery", () => ({
  useShiftPatternsQuery: () => ({ isLoading: false }),
}));
vi.mock("./queries/useAssignedShiftsQuery", () => ({
  useAssignedShiftsQuery: () => ({ isLoading: false }),
}));

describe("calendar matrix state", () => {
  it.each([
    { isPending: true, isFetching: true, isError: false, loading: true },
    { isPending: false, isFetching: true, isError: false, loading: true },
    { isPending: false, isFetching: false, isError: true, loading: false },
    { isPending: false, isFetching: false, isError: false, loading: false },
  ])("propagates query state: $isPending $isFetching $isError", (state) => {
    query.mockReturnValue({ ...state, data: undefined, refetch: vi.fn() });
    const { result } = renderHook(() =>
      useCalendarData({
        displayDate: new Date(2026, 10, 16),
        viewMode: "month",
        selectedEmployeeId: "e1",
        filteredEmployees: [],
      }),
    );
    expect(result.current.isLoadingCalendar).toBe(state.loading);
    expect(result.current.isCalendarError).toBe(state.isError);
  });
});
