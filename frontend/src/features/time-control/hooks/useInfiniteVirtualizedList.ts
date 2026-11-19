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

  // eslint-disable-next-line react-hooks/incompatible-library -- Preserve the measured virtualizer as a documented compiler bail-out.
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

  // Se calculan dentro del hook (compiler bail-out de `useVirtualizer`) para evitar
  // que React Compiler memoize `getVirtualItems()` al array vacío del primer render.
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return {
    parentRef,
    sentinelRef,
    virtualItems,
    totalSize,
  };
};
