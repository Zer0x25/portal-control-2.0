import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAssignmentManagerController } from "../../../features/theoretical-shifts/hooks/useAssignmentManagerController";

const { useAssignedShiftsInfiniteQueryMock } = vi.hoisted(() => ({
  useAssignedShiftsInfiniteQueryMock: vi.fn(),
}));

vi.mock("../../../hooks/queries/useShiftPatternsQuery", () => ({
  useShiftPatternsQuery: () => ({ data: [] }),
}));

vi.mock("../../../hooks/queries/useAssignedShiftsInfiniteQuery", () => ({
  useAssignedShiftsInfiniteQuery: useAssignedShiftsInfiniteQueryMock,
}));

vi.mock("../../../hooks/useShiftMutations", () => ({
  useShiftMutations: () => ({
    deleteAssignment: vi.fn(),
    updateAssignment: vi.fn(),
  }),
}));

vi.mock("../../../hooks/useShiftAssignmentForm", () => ({
  useShiftAssignmentForm: () => ({
    clearForm: vi.fn(),
    setEditingAssignment: vi.fn(),
  }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({ activeEmployees: [] }),
}));

vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (val: string) => val,
}));

vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

const emptyConflicts = new Set<string>();
vi.mock("../../../features/theoretical-shifts/hooks/useAssignmentConflicts", () => ({
  useAssignmentConflicts: () => emptyConflicts,
}));

describe("useAssignmentManagerController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAssignedShiftsInfiniteQueryMock.mockReturnValue({
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

  it("passes trimmed searchTerm to useAssignedShiftsInfiniteQuery for server-side search", () => {
    const { result } = renderHook(() => useAssignmentManagerController());

    expect(useAssignedShiftsInfiniteQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageSize: 50,
        showArchived: false,
        search: undefined,
      }),
    );

    act(() => {
      result.current.setSearchTerm("  Carlos Perez  ");
    });

    expect(useAssignedShiftsInfiniteQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageSize: 50,
        showArchived: false,
        search: "Carlos Perez",
      }),
    );
  });
});
