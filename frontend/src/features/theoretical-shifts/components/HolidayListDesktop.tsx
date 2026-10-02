import React, { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Holiday } from "../../../types";
import Button from "../../../components/ui/Button";
import { EditIcon, DeleteIcon } from "../../../components/ui/icons/index";
import {
  LIST_ROW_HEIGHT,
  ROW_BASE_CLASS,
  ROW_HOVER_CLASS,
  ROW_ARCHIVED_CLASS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "./listTokens";
import { compareBusinessDate, toBusinessDateChile } from "../../../utils/dateUtils";

interface HolidayListDesktopProps {
  holidays: Holiday[];
  isLoading: boolean;
  refetch: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onEdit: (holiday: Holiday) => void;
  onDelete: (holiday: Holiday) => void;
  showArchived: boolean;
}

const HolidayListDesktop: React.FC<HolidayListDesktopProps> = ({
  holidays,
  isLoading,
  refetch,
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
    estimateSize: () => LIST_ROW_HEIGHT,
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

  // Grid layout
  // Date | Name | Type | Actions
  const gridTemplateColumns = "160px minmax(200px, 1fr) 140px 100px";

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="grid items-center px-4 py-3 bg-gray-50/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 z-10"
        style={{ gridTemplateColumns }}
      >
        <div className="pl-4">Fecha</div>
        <div className="pl-4">Nombre</div>
        <div className="text-center">Tipo</div>
        <div className="text-center pr-4">Acciones</div>
      </div>

      {/* Virtualized List */}
      <div
        ref={parentRef}
        className="overflow-y-auto custom-scrollbar"
        style={{ height: "500px", contain: "strict" }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sap-blue"></div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const h = holidays[virtualRow.index];
              if (!h) return null;
              const isArchived = compareBusinessDate(h.date, today) < 0;

              return (
                <div
                  key={h.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`absolute top-0 left-0 w-full grid items-center px-4 py-3 ${ROW_BASE_CLASS} ${
                    isArchived ? ROW_ARCHIVED_CLASS : ROW_HOVER_CLASS
                  }`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns,
                  }}
                >
                  {/* Date */}
                  <div className={`pl-4 ${TEXT_PRIMARY}`}>
                    {new Date(h.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}
                  </div>

                  {/* Name */}
                  <div className={`pl-4 font-medium truncate ${TEXT_SECONDARY}`}>{h.name}</div>

                  {/* Type */}
                  <div className="flex justify-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50">
                      {h.type}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center gap-1 pr-4">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => onEdit(h)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      disabled={isArchived && !showArchived} // Allow edit if specifically showing archived? Or strictly follow rule? Assuming restrictive for now as per original code.
                      title="Editar"
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() => onDelete(h)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                      disabled={isArchived && !showArchived}
                      title="Eliminar"
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isFetchingNextPage && !isLoading && (
          <div className="p-4 text-center text-sm text-gray-500">Cargando más feriados...</div>
        )}
        {!isLoading && holidays.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            Sin resultados.{" "}
            <button className="underline" onClick={refetch}>
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidayListDesktop;
