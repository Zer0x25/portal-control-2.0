import React, { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AssignedShift } from "../../../types/index";
import Button from "../../../components/ui/Button";
import { EditIcon, DeleteIcon, ExclamationTriangleIcon } from "../../../components/ui/icons/index";
import { LIST_MOBILE_HEIGHT_STYLE } from "./listTokens";
import { compareBusinessDate, toBusinessDateChile } from "../../../utils/dateUtils";

interface ProcessedAssignment extends AssignedShift {
  assignmentWeeklyHours: number;
  employeeName: string;
  shiftPatternName: string;
}

interface AssignmentListMobileProps {
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

// Estimated row height for cards
const ROW_HEIGHT = 160;

const AssignmentListMobile: React.FC<AssignmentListMobileProps> = ({
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

  return (
    <div className="border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl overflow-hidden">
      <div
        ref={parentRef}
        className="overflow-y-auto custom-scrollbar"
        style={LIST_MOBILE_HEIGHT_STYLE}
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
              if (!assignment) return null;

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
                  }}
                  className="p-2"
                >
                  <div
                    className={`p-4 rounded-xl border ${hasConflict ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/20" : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60"} shadow-sm ${isArchived ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {hasConflict && (
                          <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                        )}
                        <h4 className="font-bold text-gray-900 dark:text-white truncate max-w-[180px]">
                          {assignment.employeeName}
                        </h4>
                      </div>
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                        {assignment.assignmentWeeklyHours > 0
                          ? `${assignment.assignmentWeeklyHours.toFixed(1)}h`
                          : "-"}
                      </span>
                    </div>

                    <div className="mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sap-blue/10 text-sap-blue dark:bg-sap-light-blue/10 dark:text-sap-light-blue uppercase tracking-tighter w-full justify-center">
                        {assignment.shiftPatternName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div>
                        <span className="block text-xs uppercase text-gray-400">Inicio</span>
                        {new Date(assignment.startDate).toLocaleDateString("es-CL", {
                          timeZone: "UTC",
                        })}
                      </div>
                      <div>
                        <span className="block text-xs uppercase text-gray-400">Fin</span>
                        {assignment.endDate ? (
                          <span className={isArchived ? "text-red-400" : ""}>
                            {new Date(assignment.endDate).toLocaleDateString("es-CL", {
                              timeZone: "UTC",
                            })}
                          </span>
                        ) : (
                          <span className="italic">Indefinido</span>
                        )}
                      </div>
                    </div>

                    {!isArchived && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onEdit(assignment)}
                          className="flex-1 py-1"
                        >
                          <EditIcon className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onDelete(assignment.id)}
                          className="flex-1 py-1"
                        >
                          <DeleteIcon className="w-4 h-4 mr-1" /> Eliminar
                        </Button>
                      </div>
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

export default AssignmentListMobile;
