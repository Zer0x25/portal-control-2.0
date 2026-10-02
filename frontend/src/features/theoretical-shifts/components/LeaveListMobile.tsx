import React, { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LeaveRecord } from "../../../types/index";
import Button from "../../../components/ui/Button";
import {
  EditIcon,
  DeleteIcon,
  CalendarDaysIcon,
  UserIcon,
} from "../../../components/ui/icons/index";
import { motion } from "framer-motion";
import { LIST_MOBILE_HEIGHT_STYLE } from "./listTokens";
import {
  addBusinessDaysChile,
  compareBusinessDate,
  toBusinessDateChile,
} from "../../../utils/dateUtils";

type ProcessedLeave = LeaveRecord & { employeeName: string };

interface LeaveListMobileProps {
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

const CARD_HEIGHT = 160;

const LeaveListMobile: React.FC<LeaveListMobileProps> = ({
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
    estimateSize: () => CARD_HEIGHT,
    overscan: 3,
  });

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= leaves.length - 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    leaves.length,
    fetchNextPage,
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
            <div className="text-red-500 mb-2 text-sm font-bold">Error al cargar permisos</div>
            <div className="text-gray-500 text-xs mb-4">
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
                  }}
                  className="p-3"
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative flex flex-col h-full bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-sm overflow-hidden ${
                      isArchived ? "opacity-60 grayscale-[0.3]" : ""
                    }`}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/80"></div>

                    <div className="flex justify-between items-start p-4 pb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3 h-3 text-gray-400" />
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                            {leave.employeeName}
                          </h4>
                        </div>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {leave.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isEditable && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => onEdit(leave)}
                            className="p-1.5 rounded-lg"
                          >
                            <EditIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        )}
                        {isDeletable && (
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => onDelete(leave)}
                            className="p-1.5 rounded-lg"
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto p-4 pt-2 border-t border-gray-100/50 dark:border-gray-700/30">
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                        <CalendarDaysIcon className="w-3 h-3" />
                        <span className="flex-1">Período</span>
                        <span className="text-gray-900 dark:text-gray-200 font-mono">
                          {new Date(leave.startDate).toLocaleDateString("es-CL", {
                            timeZone: "UTC",
                          })}
                          <span className="mx-1 opacity-40">-</span>
                          {new Date(leave.endDate).toLocaleDateString("es-CL", { timeZone: "UTC" })}
                        </span>
                      </div>
                      {leave.notes && (
                        <p className="mt-2 text-[11px] text-gray-400 italic truncate pl-5">
                          "{leave.notes}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
        {isFetchingNextPage && !isLoading && (
          <div className="p-4 text-center text-xs text-gray-500">Cargando más registros...</div>
        )}
      </div>
    </div>
  );
};

export default LeaveListMobile;
