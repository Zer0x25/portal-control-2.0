import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CorrectionRequest } from "../../../types/index";

export interface UseRequestsTabVirtualizerOptions {
  requests: CorrectionRequest[];
  itemHeight: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/** Estado de scroll y paginación de la lista histórica virtualizada. */
export const useRequestsTabVirtualizer = ({
  requests,
  itemHeight,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: UseRequestsTabVirtualizerOptions) => {
  const parentRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual returns an instance that the React Compiler cannot safely memoize.
  // eslint-disable-next-line react-hooks/incompatible-library -- Keep the virtualizer instance for scroll state.
  const rowVirtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= requests.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, requests.length, fetchNextPage, virtualItems]);

  return { parentRef, rowVirtualizer };
};
