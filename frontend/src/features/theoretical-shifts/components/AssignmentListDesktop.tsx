import React, { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AssignedShift } from "../../../types/index"; // Ensure correct path
import Button from "../../../components/ui/Button";
import { EditIcon, DeleteIcon, ExclamationTriangleIcon } from "../../../components/ui/icons/index";
import {
  LIST_ROW_HEIGHT,
  ROW_BASE_CLASS,
  ROW_HOVER_CLASS,
  ROW_ARCHIVED_CLASS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MONO,
} from "./listTokens";
import { compareBusinessDate, toBusinessDateChile } from "../../../utils/dateUtils";

// Define ProcessedAssignment type locally if not exported, or duplicate strictly necessary fields
// Ideally it should be imported from AssignmentManager or shared types, but for now defining strict interface
interface ProcessedAssignment extends AssignedShift {
  assignmentWeeklyHours: number;
  employeeName: string;
  shiftPatternName: string;
}

interface AssignmentListDesktopProps {
  assignments: ProcessedAssignment[];
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  onEdit: (assignment: AssignedShift) => void;
  onDelete: (id: string) => void;
  conflictingIds: Set<string>;
}

const ROW_HEIGHT = LIST_ROW_HEIGHT;

const AssignmentListDesktop: React.FC<AssignmentListDesktopProps> = ({
  assignments,
  isLoading,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  refetch,
  onEdit,
  onDelete,
  conflictingIds,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const today = toBusinessDateChile();

  const rowVirtualizer = useVirtualizer({
    count: assignments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Infinite Scroll Trigger
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= assignments.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    assignments.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Shared grid layout — used by both header and virtual rows
  const gridTemplateColumns = "minmax(180px, 1fr) minmax(160px, 1fr) 130px 130px 110px 120px";

  return (
    <div className="overflow-hidden border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl">
      {/* Standard Grid Header */}
      <div
        className="grid items-center px-4 py-3 bg-gray-50/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
        style={{ gridTemplateColumns }}
      >
        <div className="pl-4">Empleado</div>
        <div className="pl-4">Patrón</div>
        <div className="text-left">Inicio</div>
        <div className="text-left">Fin</div>
        <div className="text-left">Hrs/Sem</div>
        <div className="text-center pr-4">Acciones</div>
      </div>
      <div
        ref={parentRef}
        className="overflow-y-auto custom-scrollbar"
        style={{ height: "500px", contain: "strict" }}
      >
        {isError ? (
          <div className="flex flex-col justify-center items-center h-full text-center p-4">
            <div className="text-red-500 mb-2">Error al cargar asignaciones</div>
            <div className="text-gray-500 text-sm mb-4">
              {(error as Error)?.message || "Error desconocido"}
            </div>
            <Button onClick={() => refetch()} variant="secondary" size="sm">
              Reintentar
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sap-blue"></div>
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
              const assignment = assignments[virtualRow.index];
              if (!assignment) return null; // Safety check

              const isArchived =
                !!assignment.endDate && compareBusinessDate(assignment.endDate, today) < 0;
              const hasConflict = conflictingIds.has(assignment.id);

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
                  {/* Employee */}
                  <div
                    className={`px-4 py-2 pl-8 overflow-hidden flex items-center gap-2 ${TEXT_PRIMARY}`}
                  >
                    {hasConflict && (
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="truncate">{assignment.employeeName}</span>
                  </div>
                  {/* Pattern */}
                  <div className={`px-4 py-2 pl-8 overflow-hidden ${TEXT_SECONDARY}`}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sap-blue/10 text-sap-blue dark:bg-sap-light-blue/10 dark:text-sap-light-blue uppercase tracking-tighter truncate">
                      {assignment.shiftPatternName}
                    </span>
                  </div>
                  {/* Start Date */}
                  <div className={`px-4 py-2 ${TEXT_SECONDARY}`}>
                    {new Date(assignment.startDate).toLocaleDateString("es-CL", {
                      timeZone: "UTC",
                    })}
                  </div>
                  {/* End Date */}
                  <div className={`px-4 py-2 ${TEXT_SECONDARY}`}>
                    {assignment.endDate ? (
                      <span className={isArchived ? "text-red-400" : ""}>
                        {new Date(assignment.endDate).toLocaleDateString("es-CL", {
                          timeZone: "UTC",
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-medium italic">Indefinido</span>
                    )}
                  </div>
                  {/* Hrs/Week */}
                  <div className={`px-4 py-2 ${TEXT_MONO}`}>
                    {assignment.assignmentWeeklyHours > 0
                      ? assignment.assignmentWeeklyHours.toFixed(2)
                      : "-"}
                  </div>
                  {/* Actions */}
                  <div className="px-4 py-2 pr-8 flex justify-center gap-1">
                    {!isArchived && (
                      <>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => onEdit(assignment)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => onDelete(assignment.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isFetchingNextPage && !isLoading && (
          <div className="p-4 text-center text-sm text-gray-500">Cargando más asignaciones...</div>
        )}
      </div>
    </div>
  );
};

export default AssignmentListDesktop;
