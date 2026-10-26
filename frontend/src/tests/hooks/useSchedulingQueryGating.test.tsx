import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    enabled: [] as boolean[],
    clockingEmployeeOptionsEnabled: [] as boolean[],
    fullEmployeeListEnabled: [] as boolean[],
    employeeList: [] as never[],
    leavesResponse: undefined as unknown,
    shiftPatternsLoading: false,
  };
  const recordEnabled = (enabled = true) => {
    state.enabled.push(enabled);
    return { data: undefined, isLoading: enabled && state.shiftPatternsLoading };
  };
  return { state, recordEnabled };
});

vi.mock("../../hooks/queries/useConfigQuery", () => ({
  useGlobalMaxWeeklyHoursQuery: mocks.recordEnabled,
  useAreaListQuery: mocks.recordEnabled,
  useWorkdayTypeListQuery: mocks.recordEnabled,
  useEmailRecipientsListQuery: mocks.recordEnabled,
  useAccountingLockDateQuery: mocks.recordEnabled,
}));

vi.mock("../../hooks/queries/useShiftPatternsQuery", () => ({
  useShiftPatternsQuery: mocks.recordEnabled,
}));
vi.mock("../../hooks/queries/useAssignedShiftsQuery", () => ({
  useAssignedShiftsQuery: mocks.recordEnabled,
}));
vi.mock("../../hooks/queries/useHolidaysQuery", () => ({
  useHolidaysQuery: mocks.recordEnabled,
}));
vi.mock("../../hooks/queries/useLeavesQuery", () => ({
  useLeavesQuery: (enabled = true) => {
    mocks.state.enabled.push(enabled);
    return { data: mocks.state.leavesResponse, isLoading: false };
  },
}));
vi.mock("../../hooks/queries/useCorrectionRequestsQuery", () => ({
  useCorrectionRequestsQuery: (...args: unknown[]) => {
    mocks.state.enabled.push(args[2] !== false);
    return {
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    };
  },
}));
vi.mock("../../hooks/useEmployees", () => ({
  useEmployees: (_isKiosk?: boolean, options?: { enabled?: boolean }) => {
    mocks.state.fullEmployeeListEnabled.push(options?.enabled ?? true);
    return { allEmployees: mocks.state.employeeList, isLoadingEmployees: false };
  },
}));
vi.mock("../../hooks/queries/useEmployeesQuery", () => ({
  useClockingEmployeeOptionsQuery: (enabled = true) => {
    mocks.state.clockingEmployeeOptionsEnabled.push(enabled);
    return { data: [], isLoading: false };
  },
}));
vi.mock("../../hooks/useConfigMutations", () => ({
  useConfigMutations: () => ({ updateConfig: vi.fn() }),
}));
vi.mock("../../hooks/useCorrectionRequestMutations", () => ({
  useCorrectionRequestMutations: () => ({
    addCorrectionRequest: vi.fn(),
    updateRequestStatus: vi.fn(),
    isPending: false,
  }),
}));

import { useScheduling } from "../../hooks/useScheduling";

describe("useScheduling query options", () => {
  afterEach(() => {
    cleanup();
    mocks.state.employeeList = [];
    mocks.state.leavesResponse = undefined;
    mocks.state.shiftPatternsLoading = false;
  });

  it("keeps every query enabled by default for existing consumers", () => {
    mocks.state.enabled.length = 0;
    mocks.state.clockingEmployeeOptionsEnabled.length = 0;
    mocks.state.fullEmployeeListEnabled.length = 0;

    renderHook(() => useScheduling());

    expect(mocks.state.enabled).toHaveLength(10);
    expect(mocks.state.enabled.every(Boolean)).toBe(true);
    expect(mocks.state.fullEmployeeListEnabled).toEqual([true]);
    expect(mocks.state.clockingEmployeeOptionsEnabled).toEqual([false]);
  });

  it("disables its queries for the shell when auto-start is ineligible", () => {
    mocks.state.enabled.length = 0;
    mocks.state.clockingEmployeeOptionsEnabled.length = 0;
    mocks.state.fullEmployeeListEnabled.length = 0;

    const { result } = renderHook(() => useScheduling(undefined, undefined, { enabled: false }));

    expect(mocks.state.enabled).toHaveLength(10);
    expect(mocks.state.enabled.every(Boolean)).toBe(false);
    expect(result.current.isLoadingSchedulingData).toBe(false);
    expect(mocks.state.fullEmployeeListEnabled).toEqual([false]);
    expect(mocks.state.clockingEmployeeOptionsEnabled).toEqual([false]);
  });

  it("uses only the clocking projection when Time Control needs scheduling data", () => {
    mocks.state.enabled.length = 0;
    mocks.state.clockingEmployeeOptionsEnabled.length = 0;
    mocks.state.fullEmployeeListEnabled.length = 0;

    renderHook(() => useScheduling(undefined, undefined, { useClockingOptions: true }));

    expect(mocks.state.fullEmployeeListEnabled).toEqual([false]);
    expect(mocks.state.clockingEmployeeOptionsEnabled).toEqual([true]);
  });

  it("loads only schedule datasets in schedule-enrichment mode", () => {
    mocks.state.enabled.length = 0;
    mocks.state.clockingEmployeeOptionsEnabled.length = 0;
    mocks.state.fullEmployeeListEnabled.length = 0;

    const { result } = renderHook(() =>
      useScheduling(undefined, undefined, {
        useClockingOptions: true,
        queryMode: "schedule-enrichment",
      }),
    );

    expect(mocks.state.enabled).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false,
    ]);
    expect(mocks.state.fullEmployeeListEnabled).toEqual([false]);
    expect(mocks.state.clockingEmployeeOptionsEnabled).toEqual([false]);
    expect(
      result.current.getEmployeeDailyScheduleInfo("unknown", new Date(Date.UTC(2026, 2, 2))),
    ).toEqual({
      scheduleText: "Sin Turno Asignado",
      isWorkDay: false,
      planningStatus: "SinTurnoAsignado",
    });
  });

  it("loads only correction requests in correction-requests mode", () => {
    mocks.state.enabled.length = 0;
    mocks.state.clockingEmployeeOptionsEnabled.length = 0;
    mocks.state.fullEmployeeListEnabled.length = 0;

    renderHook(() =>
      useScheduling(undefined, undefined, {
        queryMode: "correction-requests",
      }),
    );

    expect(mocks.state.enabled).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(mocks.state.fullEmployeeListEnabled).toEqual([false]);
    expect(mocks.state.clockingEmployeeOptionsEnabled).toEqual([false]);
  });

  it("reports the schedule datasets as loading while an enabled query is pending", () => {
    mocks.state.enabled.length = 0;
    mocks.state.shiftPatternsLoading = true;

    const { result } = renderHook(() => useScheduling());

    expect(result.current.isLoadingSchedulingData).toBe(true);
    mocks.state.shiftPatternsLoading = false;
  });

  it("keeps the daily schedule lookup stable when only query loading changes", () => {
    const { result, rerender } = renderHook(() => useScheduling());
    const getScheduleInfo = result.current.getEmployeeDailyScheduleInfo;

    mocks.state.shiftPatternsLoading = true;
    rerender();

    expect(result.current.getEmployeeDailyScheduleInfo).toBe(getScheduleInfo);
  });

  it("recreates the daily schedule lookup when its employee data changes", () => {
    const { result, rerender } = renderHook(() => useScheduling());
    const getScheduleInfo = result.current.getEmployeeDailyScheduleInfo;

    mocks.state.employeeList = [{ id: "e1" } as never];
    rerender();

    expect(result.current.getEmployeeDailyScheduleInfo).not.toBe(getScheduleInfo);
  });

  it("recreates the daily schedule lookup when leave data changes", () => {
    const { result, rerender } = renderHook(() => useScheduling());
    const getScheduleInfo = result.current.getEmployeeDailyScheduleInfo;

    mocks.state.leavesResponse = [
      {
        employeeId: "e1",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        type: "Vacaciones",
      },
    ];
    rerender();

    expect(result.current.getEmployeeDailyScheduleInfo).not.toBe(getScheduleInfo);
  });
});
