import React, { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TheoreticalShiftPattern } from "../../../types";
import { EditIcon, DeleteIcon } from "../../../components/ui/icons/index";
import Button from "../../../components/ui/Button";

import { LIST_MOBILE_HEIGHT_STYLE } from "./listTokens";

interface PatternListMobileProps {
  patterns: TheoreticalShiftPattern[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  globalMaxWeeklyHours: number;
  onEdit: (pattern: TheoreticalShiftPattern) => void;
  onDelete: (id: string) => void;
}

const PatternListMobile: React.FC<PatternListMobileProps> = ({
  patterns,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  globalMaxWeeklyHours,
  onEdit,
  onDelete,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: patterns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated card height
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;
    if (lastItem.index >= patterns.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    patterns.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto px-1 pb-20 custom-scrollbar"
      style={LIST_MOBILE_HEIGHT_STYLE}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const p = patterns[virtualRow.index];
          return (
            <div
              key={p.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 w-full px-2"
              style={{
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 p-4 mb-3 transition-all active:scale-[0.98]"
                style={{ borderLeftColor: p.color || "#3b82f6" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                        {p.cycleLengthDays} días
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                        Top {p.maxHoursPattern?.toFixed(1) || globalMaxWeeklyHours}h
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="xs"
                      variant="ghost"
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      onClick={() => onEdit(p)}
                    >
                      <EditIcon className="w-5 h-5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      onClick={() => onDelete(p.id)}
                    >
                      <DeleteIcon className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {isFetchingNextPage && (
        <div className="py-3 text-center text-xs text-gray-500">Cargando más patrones...</div>
      )}
    </div>
  );
};

export default PatternListMobile;
