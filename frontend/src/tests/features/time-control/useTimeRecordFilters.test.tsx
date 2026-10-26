import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTimeRecordFilters } from "../../../features/time-control/hooks/useTimeRecordFilters";
import { addBusinessDaysChile, toBusinessDateChile } from "../../../utils/dateUtils";

const filterTestState = vi.hoisted(() => ({
  businessNow: new Date("2026-10-26T12:00:00.000Z"),
  searchParams: new URLSearchParams(),
  setSearchParams: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock("../../../hooks/useBusinessNow", () => ({
  useBusinessNow: () => filterTestState.businessNow,
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: filterTestState.addToast }),
}));

vi.mock("react-router", () => ({
  useSearchParams: () => [filterTestState.searchParams, filterTestState.setSearchParams],
}));

describe("useTimeRecordFilters", () => {
  beforeEach(() => {
    filterTestState.businessNow = new Date("2026-10-26T12:00:00.000Z");
    filterTestState.searchParams = new URLSearchParams();
    filterTestState.setSearchParams.mockReset();
    filterTestState.addToast.mockReset();
  });

  it("does not render again to reapply the already initialized quick-filter range", () => {
    const onRender = vi.fn();

    const { result } = renderHook(() => {
      onRender();
      return useTimeRecordFilters();
    });

    expect(onRender).toHaveBeenCalledTimes(1);
    expect(result.current.activeQuickFilter).toBe("24h");
    expect(result.current.dateFilters).toEqual({
      is24h: true,
      desde: addBusinessDaysChile(toBusinessDateChile(filterTestState.businessNow), -1),
      hasta: toBusinessDateChile(filterTestState.businessNow),
    });
  });

  it("applies a quick filter in one render while retaining its date range", () => {
    const onRender = vi.fn();
    const { result } = renderHook(() => {
      onRender();
      return useTimeRecordFilters();
    });
    onRender.mockClear();

    act(() => {
      result.current.handleQuickFilterClick("week");
    });

    const today = toBusinessDateChile(filterTestState.businessNow);
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(result.current.activeQuickFilter).toBe("week");
    expect(result.current.dateFilters).toEqual({
      is24h: false,
      desde: addBusinessDaysChile(today, -6),
      hasta: today,
    });
    expect(result.current.appliedDateFilters).toEqual(result.current.dateFilters);
  });

  it("does not render when the already active quick filter is selected again", () => {
    const onRender = vi.fn();
    const { result } = renderHook(() => {
      onRender();
      return useTimeRecordFilters();
    });

    act(() => {
      result.current.handleQuickFilterClick("week");
    });
    onRender.mockClear();

    act(() => {
      result.current.handleQuickFilterClick("week");
    });

    expect(onRender).not.toHaveBeenCalled();
  });

  it("resynchronizes an active quick filter when the business date changes", () => {
    const onRender = vi.fn();
    const { result, rerender } = renderHook(() => {
      onRender();
      return useTimeRecordFilters();
    });
    const previousDate = result.current.dateFilters.hasta;
    onRender.mockClear();
    filterTestState.businessNow = new Date("2026-10-27T12:00:00.000Z");

    rerender();

    const today = toBusinessDateChile(filterTestState.businessNow);
    expect(result.current.dateFilters.hasta).not.toBe(previousDate);
    expect(result.current.dateFilters).toEqual({
      is24h: true,
      desde: addBusinessDaysChile(today, -1),
      hasta: today,
    });
    expect(result.current.appliedDateFilters).toEqual(result.current.dateFilters);
    expect(onRender).toHaveBeenCalledTimes(2);
  });

  it("keeps custom dates pending until they are explicitly applied", () => {
    const { result } = renderHook(() => useTimeRecordFilters());
    const previousAppliedRange = result.current.appliedDateFilters;

    act(() => {
      result.current.handleDateFilterChange({ desde: "2026-10-20" });
    });

    expect(result.current.activeQuickFilter).toBeNull();
    expect(result.current.dateFilters.desde).toBe("2026-10-20");
    expect(result.current.appliedDateFilters).toBe(previousAppliedRange);
    expect(result.current.isApplyButtonEnabled).toBe(true);

    act(() => {
      result.current.handleApplyCustomFilters();
    });

    expect(result.current.appliedDateFilters.desde).toBe("2026-10-20");
    expect(result.current.isApplyButtonEnabled).toBe(false);
    expect(filterTestState.addToast).not.toHaveBeenCalled();
  });
});
