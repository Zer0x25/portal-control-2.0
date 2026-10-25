import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTimeControlScheduleEnrichment } from "../../../features/time-control/hooks/useTimeControlScheduleEnrichment";

const mocks = vi.hoisted(() => ({
  shiftPatternsQuery: vi.fn(),
  assignedShiftsQuery: vi.fn(),
  holidaysQuery: vi.fn(),
  leavesQuery: vi.fn(),
  scheduleLookup: vi.fn(),
}));

vi.mock("../../../hooks/queries/useShiftPatternsQuery", () => ({
  useShiftPatternsQuery: mocks.shiftPatternsQuery,
}));
vi.mock("../../../hooks/queries/useAssignedShiftsQuery", () => ({
  useAssignedShiftsQuery: mocks.assignedShiftsQuery,
}));
vi.mock("../../../hooks/queries/useHolidaysQuery", () => ({
  useHolidaysQuery: mocks.holidaysQuery,
}));
vi.mock("../../../hooks/queries/useLeavesQuery", () => ({
  useLeavesQuery: mocks.leavesQuery,
}));
vi.mock("../../../hooks/useEmployeeDailyScheduleLookup", () => ({
  extractScheduleLeaves: () => [],
  useEmployeeDailyScheduleLookup: mocks.scheduleLookup,
}));

describe("useTimeControlScheduleEnrichment", () => {
  it("subscribes only to schedule datasets and allows unresolved employee records", () => {
    const shiftPatterns = [{ id: "pattern-1" }];
    const assignedShifts = [{ id: "assignment-1" }];
    const holidays = [{ id: "holiday-1" }];
    const leavesResponse = { data: [{ id: "leave-1" }] };
    const lookup = vi.fn();
    mocks.shiftPatternsQuery.mockReturnValue({ data: shiftPatterns });
    mocks.assignedShiftsQuery.mockReturnValue({ data: assignedShifts });
    mocks.holidaysQuery.mockReturnValue({ data: holidays });
    mocks.leavesQuery.mockReturnValue({ data: leavesResponse });
    mocks.scheduleLookup.mockReturnValue(lookup);

    const { result } = renderHook(() => useTimeControlScheduleEnrichment());

    expect(mocks.shiftPatternsQuery).toHaveBeenCalledOnce();
    expect(mocks.assignedShiftsQuery).toHaveBeenCalledOnce();
    expect(mocks.holidaysQuery).toHaveBeenCalledOnce();
    expect(mocks.leavesQuery).toHaveBeenCalledOnce();
    expect(mocks.scheduleLookup).toHaveBeenCalledWith({
      holidays,
      leaves: [],
      assignedShifts,
      shiftPatterns,
      allowUnknownEmployees: true,
    });
    expect(result.current).toBe(lookup);
  });
});
