import React, { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TheoreticalShiftPattern } from "../../../types";
import { EditIcon, DeleteIcon, DocumentDuplicateIcon } from "../../../components/ui/icons/index";
import Button from "../../../components/ui/Button";
import { LIST_ROW_HEIGHT, ROW_BASE_CLASS, ROW_HOVER_CLASS, TEXT_PRIMARY } from "./listTokens";

interface PatternListDesktopProps {
  patterns: TheoreticalShiftPattern[];
  isLoading: boolean;
  refetch: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  globalMaxWeeklyHours: number;
  onEdit: (pattern: TheoreticalShiftPattern) => void;
  onCopy: (pattern: TheoreticalShiftPattern) => void;
  onDelete: (id: string) => void;
}

const PatternListDesktop: React.FC<PatternListDesktopProps> = ({
  patterns,
  isLoading,
  refetch,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  globalMaxWeeklyHours,
  onEdit,
  onCopy,
  onDelete,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: patterns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => LIST_ROW_HEIGHT,
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

  // Grid layout consistent with Assignments/Leaves
  // Columns: Name | Cycle | Max Hours | Color | Actions
  const gridTemplateColumns = "minmax(200px, 1fr) 120px 120px 80px 140px";

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="grid items-center px-4 py-3 bg-gray-50/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 z-10"
        style={{ gridTemplateColumns }}
      >
        <div className="pl-4">Nombre del Patrón</div>
        <div className="text-center">Ciclo (días)</div>
        <div className="text-center">Hrs Máx/Sem</div>
        <div className="text-center">Color</div>
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
              const p = patterns[virtualRow.index];
              if (!p) return null;
              return (
                <div
                  key={p.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`absolute top-0 left-0 w-full grid items-center px-4 py-3 ${ROW_BASE_CLASS} ${ROW_HOVER_CLASS}`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns,
                  }}
                >
                  {/* Name */}
                  <div className={`pl-4 truncate ${TEXT_PRIMARY}`}>{p.name}</div>

                  {/* Cycle Length */}
                  <div className="flex justify-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {p.cycleLengthDays} días
                    </span>
                  </div>

                  {/* Max Hours */}
                  <div className="text-center font-mono text-sm font-bold text-sap-blue dark:text-sap-light-blue">
                    {p.maxHoursPattern?.toFixed(2) || globalMaxWeeklyHours}
                  </div>

                  {/* Color */}
                  <div className="flex justify-center">
                    <div
                      className="w-6 h-6 rounded-lg shadow-sm border-2 border-white dark:border-gray-600 ring-4 ring-transparent hover:ring-white/20 transition-all duration-200"
                      style={{ backgroundColor: p.color || "transparent" }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center gap-1 pr-4">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => onEdit(p)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="Editar"
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => onCopy(p)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
                      title="Duplicar"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() => onDelete(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
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
          <div className="p-4 text-center text-sm text-gray-500">Cargando más patrones...</div>
        )}
        {!isLoading && patterns.length === 0 && (
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

export default PatternListDesktop;
