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
  const rowVirtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= requests.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    requests.length,
    fetchNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  return { parentRef, rowVirtualizer };
};
