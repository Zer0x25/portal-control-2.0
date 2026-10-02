import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInfiniteVirtualizedList } from "../../../features/time-control/hooks/useInfiniteVirtualizedList";

const { useIntersectionObserverMock } = vi.hoisted(() => ({
  useIntersectionObserverMock: vi.fn(),
}));

vi.mock("../../../hooks/useIntersectionObserver", () => ({
  useIntersectionObserver: (...args: unknown[]) => useIntersectionObserverMock(...args),
}));

describe("useInfiniteVirtualizedList", () => {
  it("creates refs and virtualizer with provided options", () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteVirtualizedList({
        count: 20,
        estimateSize: 66,
        overscan: 10,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    expect(result.current.parentRef.current).toBe(null);
    expect(result.current.sentinelRef.current).toBe(null);
    expect(result.current.virtualizer).toBeDefined();
    expect(useIntersectionObserverMock).toHaveBeenCalled();
  });
});
