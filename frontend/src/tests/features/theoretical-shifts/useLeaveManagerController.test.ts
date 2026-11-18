import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLeaveManagerController } from "../../../features/theoretical-shifts/hooks/useLeaveManagerController";

const { useLeavesInfiniteQueryMock, createLeaveMock, deleteLeaveMock } = vi.hoisted(() => ({
  useLeavesInfiniteQueryMock: vi.fn(),
  createLeaveMock: vi.fn(),
  deleteLeaveMock: vi.fn(),
}));

vi.mock("../../../hooks/queries/useLeavesInfiniteQuery", () => ({
  useLeavesInfiniteQuery: useLeavesInfiniteQueryMock,
}));

vi.mock("../../../hooks/useLeaveMutations", () => ({
  useLeaveMutations: () => ({
    createLeave: createLeaveMock,
    deleteLeave: deleteLeaveMock,
    isPending: false,
  }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    activeEmployees: [{ id: "emp-1", name: "Ana Perez" }],
    getEmployeeById: (id: string) => (id === "emp-1" ? { id: "emp-1", name: "Ana Perez" } : null),
  }),
}));

vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (val: string) => val,
}));

describe("useLeaveManagerController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLeavesInfiniteQueryMock.mockReturnValue({
      data: { pages: [{ data: [], meta: { total: 0, page: 1, pageSize: 50, totalPages: 1 } }] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("passes type and trimmed search filters to useLeavesInfiniteQuery", () => {
    const { result } = renderHook(() => useLeaveManagerController());

    act(() => {
      result.current.setFilterType("Vacaciones");
      result.current.setFilterEmployeeName("  Ana  ");
    });

    expect(useLeavesInfiniteQueryMock).toHaveBeenLastCalledWith({
      showArchived: false,
      employeeId: undefined,
      type: "Vacaciones",
      search: "Ana",
    });
  });

  it("submits leave once via createLeave without calling justifyRecordsForLeave", async () => {
    createLeaveMock.mockResolvedValue({
      id: "leave-1",
      employeeId: "emp-1",
      type: "Vacaciones",
      startDate: "2026-11-18",
      endDate: "2026-11-19",
      notes: "",
    });

    const { result } = renderHook(() => useLeaveManagerController());

    act(() => {
      result.current.setIsFormVisible(true);
      result.current.setValue("employeeId", "emp-1");
      result.current.setValue("type", "Vacaciones");
      result.current.setValue("startDate", "2026-11-18");
      result.current.setValue("endDate", "2026-11-19");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(createLeaveMock).toHaveBeenCalledTimes(1);
    expect(createLeaveMock).toHaveBeenCalledWith({
      employeeId: "emp-1",
      type: "Vacaciones",
      startDate: "2026-11-18",
      endDate: "2026-11-19",
      notes: "",
    });
    expect(result.current.isFormVisible).toBe(false);
  });
});
