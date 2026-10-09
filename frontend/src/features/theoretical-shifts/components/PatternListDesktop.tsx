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
    <div className="flex flex-col h-full bg-token-surface-card border border-token-border-technical rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="grid items-center px-4 py-3 bg-token-surface-header border-b border-token-border-technical text-xs font-bold text-token-text-tertiary uppercase tracking-wider sticky top-0 z-10"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-token-accent-brand"></div>
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
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-token-accent-brand/10 text-token-accent-brand border border-token-accent-brand/20">
                      {p.cycleLengthDays} días
                    </span>
                  </div>

                  {/* Max Hours */}
                  <div className="text-center font-mono text-sm font-bold text-token-accent-brand">
                    {p.maxHoursPattern?.toFixed(2) || globalMaxWeeklyHours}
                  </div>

                  {/* Color */}
                  <div className="flex justify-center">
                    <div
                      className="w-5 h-5 rounded-md shadow-sm border border-token-border-technical ring-2 ring-transparent hover:ring-token-border-focus transition-all duration-200"
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
