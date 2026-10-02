import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";

interface UseInfiniteVirtualizedListParams {
  count: number;
  estimateSize: number;
  overscan: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export const useInfiniteVirtualizedList = ({
  count,
  estimateSize,
  overscan,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: UseInfiniteVirtualizedListParams) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  useIntersectionObserver(sentinelRef, {
    root: parentRef.current,
    threshold: 0.1,
    onChange: (entries) => {
      const firstEntry = entries[0];
      if (!firstEntry) return;
      if (firstEntry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  return {
    parentRef,
    sentinelRef,
    virtualizer,
  };
};
