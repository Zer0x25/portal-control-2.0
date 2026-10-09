import React, { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Holiday } from "../../../types";
import Button from "../../../components/ui/Button";
import { EditIcon, DeleteIcon } from "../../../components/ui/icons/index";
import { LIST_MOBILE_HEIGHT_STYLE } from "./listTokens";
import { compareBusinessDate, toBusinessDateChile } from "../../../utils/dateUtils";

interface HolidayListMobileProps {
  holidays: Holiday[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onEdit: (holiday: Holiday) => void;
  onDelete: (holiday: Holiday) => void;
  showArchived: boolean;
}

const HolidayListMobile: React.FC<HolidayListMobileProps> = ({
  holidays,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onEdit,
  onDelete,
  showArchived,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: holidays.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;
    if (lastItem.index >= holidays.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    holidays.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  const today = toBusinessDateChile();

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
          const h = holidays[virtualRow.index];
          // Simple parsing for comparison (yyyy-mm-dd)
          const isArchived = compareBusinessDate(h.date, today) < 0;

          return (
            <div
              key={h.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 w-full px-2"
              style={{
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={`relative bg-token-surface-card rounded-xl shadow-sm border-l-4 p-4 mb-3 transition-all active:scale-[0.98] 
                  ${isArchived ? "opacity-60 grayscale border-l-token-border-subtle" : "border-l-orange-500"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-sm font-bold text-token-text-primary truncate">{h.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        {h.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => onEdit(h)}
                      className="p-1.5 text-token-text-secondary hover:text-token-accent-brand hover:bg-token-surface-hover rounded-lg transition-colors"
                      disabled={isArchived && !showArchived}
                    >
                      <EditIcon className="w-5 h-5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => onDelete(h)}
                      className="p-1.5 text-token-text-secondary hover:text-token-status-error hover:bg-red-500/10 rounded-lg transition-colors"
                      disabled={isArchived && !showArchived}
                    >
                      <DeleteIcon className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 pl-1 border-t border-token-border-subtle pt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
                    Fecha
                  </span>
                  <span className="text-xs font-mono font-medium text-token-text-secondary">
                    {new Date(h.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {isFetchingNextPage && (
        <div className="py-3 text-center text-xs text-token-text-secondary">
          Cargando más feriados...
        </div>
      )}
    </div>
  );
};

export default HolidayListMobile;
