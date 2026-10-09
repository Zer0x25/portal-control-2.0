import React, { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LeaveRecord } from "../../../types/index";
import Button from "../../../components/ui/Button";
import { EditIcon, DeleteIcon } from "../../../components/ui/icons/index";
import {
  LIST_ROW_HEIGHT,
  ROW_BASE_CLASS,
  ROW_HOVER_CLASS,
  ROW_ARCHIVED_CLASS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  TEXT_MONO,
} from "./listTokens";
import {
  addBusinessDaysChile,
  compareBusinessDate,
  toBusinessDateChile,
} from "../../../utils/dateUtils";

type ProcessedLeave = LeaveRecord & { employeeName: string };

interface LeaveListDesktopProps {
  leaves: ProcessedLeave[];
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  onEdit: (leave: LeaveRecord) => void;
  onDelete: (leave: ProcessedLeave) => void;
}

const ROW_HEIGHT = LIST_ROW_HEIGHT;

const LeaveListDesktop: React.FC<LeaveListDesktopProps> = ({
  leaves,
  isLoading,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  refetch,
  onEdit,
  onDelete,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const todayStr = toBusinessDateChile();

  const rowVirtualizer = useVirtualizer({
    count: leaves.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= leaves.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    leaves.length,
    fetchNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Shared grid layout — used by both header and virtual rows
  const gridTemplateColumns = "1.5fr 1fr 0.8fr 0.8fr 1.5fr 100px";

  return (
    <div className="overflow-hidden border border-token-border-technical rounded-lg shadow-sm bg-token-surface-card">
      {/* Standard Grid Header */}
      <div
        className="grid items-center px-0 py-3 bg-token-surface-header border-b border-token-border-technical text-xs font-bold text-token-text-tertiary uppercase tracking-wider"
        style={{ gridTemplateColumns }}
      >
        <div className="pl-6">Empleado</div>
        <div className="px-4">Tipo</div>
        <div className="px-4">Inicio</div>
        <div className="px-4">Fin</div>
        <div className="px-4">Notas</div>
        <div className="text-center pr-6">Acciones</div>
      </div>

      <div
        ref={parentRef}
        className="overflow-y-auto custom-scrollbar"
        style={{ height: "500px", contain: "strict" }}
      >
        {isError ? (
          <div className="flex flex-col justify-center items-center h-full text-center p-4">
            <div className="text-token-status-error mb-2">Error al cargar permisos</div>
            <div className="text-token-text-secondary text-sm mb-4">
              {(error as Error)?.message || "Error desconocido"}
            </div>
            <Button onClick={() => refetch()} variant="secondary" size="sm">
              Reintentar
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-token-accent-brand"></div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const leave = leaves[virtualRow.index];
              if (!leave) return null;

              const limitDate = addBusinessDaysChile(todayStr, -7);

              const isArchived = compareBusinessDate(leave.endDate, todayStr) < 0;
              const isPastLimit = compareBusinessDate(leave.startDate, limitDate) < 0;
              const isRecentlyCreated =
                leave.createdAt &&
                Date.now() - new Date(leave.createdAt).getTime() < 24 * 60 * 60 * 1000;

              const isEditable = !isArchived && !isPastLimit;
              const isDeletable = !isPastLimit && (!isArchived || isRecentlyCreated);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns,
                    alignItems: "center",
                  }}
                  className={`${ROW_BASE_CLASS} ${isArchived ? ROW_ARCHIVED_CLASS : ROW_HOVER_CLASS}`}
                >
                  <div className={`pl-6 truncate pr-4 ${TEXT_PRIMARY}`}>{leave.employeeName}</div>
                  <div className={`px-4 ${TEXT_SECONDARY}`}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-token-surface-active text-token-text-primary border border-token-border-subtle uppercase tracking-tighter">
                      {leave.type}
                    </span>
                  </div>
                  <div className={`px-4 font-medium font-mono ${TEXT_MONO}`}>
                    {new Date(leave.startDate).toLocaleDateString("es-CL", {
                      timeZone: "UTC",
                    })}
                  </div>
                  <div className={`px-4 font-medium font-mono ${TEXT_MONO}`}>
                    {new Date(leave.endDate).toLocaleDateString("es-CL", {
                      timeZone: "UTC",
                    })}
                  </div>
                  <div className={`px-4 truncate italic ${TEXT_MUTED}`} title={leave.notes}>
                    {leave.notes || "-"}
                  </div>
                  <div className="pr-6 flex justify-center gap-1">
                    {isEditable && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => onEdit(leave)}
                        className="p-1.5 rounded-lg border-token-border-subtle"
                        title="Editar"
                      >
                        <EditIcon className="w-4 h-4 text-token-accent-brand" />
                      </Button>
                    )}
                    {isDeletable && (
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => onDelete(leave)}
                        className="p-1.5 rounded-lg"
                        title="Eliminar"
                      >
                        <DeleteIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {isFetchingNextPage && !isLoading && (
        <div className="p-4 text-center text-sm text-token-text-secondary bg-token-surface-card/50 border-t border-token-border-subtle">
          Cargando más registros...
        </div>
      )}
    </div>
  );
};

export default LeaveListDesktop;
