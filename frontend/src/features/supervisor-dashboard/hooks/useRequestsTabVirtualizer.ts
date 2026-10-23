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
  // TanStack Virtual is intentionally a compiler bail-out; keep the virtualizer's instance API local.
  // eslint-disable-next-line react-hooks/incompatible-library -- the compiler cannot safely memoize Virtualizer methods
  const rowVirtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  const lastVirtualItemIndex = rowVirtualizer.getVirtualItems().at(-1)?.index ?? -1;

  useEffect(() => {
    if (lastVirtualItemIndex >= requests.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, requests.length, fetchNextPage, lastVirtualItemIndex]);

  return { parentRef, rowVirtualizer };
};
