import React from "react";
import {
  AugmentedTimeRecord,
  DailyTimeRecord,
  CorrectionRequest,
  AuditLog,
} from "../../../types/index";
import { ArrowPathIcon } from "../../../components/ui/icons/index";
import TimeRecordRow from "./TimeRecordRow";
import { useInfiniteVirtualizedList } from "../hooks/useInfiniteVirtualizedList";

interface TimeRecordTableViewDesktopProps {
  records: AugmentedTimeRecord[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  onRowDoubleClick: (record: AugmentedTimeRecord) => void;
  onAddComment: (record: DailyTimeRecord) => void;
  onDelete: (record: DailyTimeRecord) => void;
  isActionDisabledForRole: boolean;
  roleBasedTooltip: string;
  accountingLockDate: string | null;
  isControlInternoEnabled: boolean;
  onViewHistory: (record: DailyTimeRecord) => void;
  editsMapAll: Map<string, AuditLog[]>;
  pendingRequestsMap: Map<string, CorrectionRequest>;
}

const TimeRecordTableViewDesktop: React.FC<TimeRecordTableViewDesktopProps> = ({
  records,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  onRowDoubleClick,
  onAddComment,
  onDelete,
  isActionDisabledForRole,
  roleBasedTooltip,
  accountingLockDate,
  isControlInternoEnabled,
  onViewHistory,
  editsMapAll,
  pendingRequestsMap,
}) => {
  const { parentRef, sentinelRef, virtualizer } = useInfiniteVirtualizedList({
    count: records.length,
    estimateSize: 66,
    overscan: 20,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const renderSentinel = () => (
    <div
      ref={sentinelRef}
      className="w-full py-6 flex flex-col items-center justify-center text-token-text-tertiary h-20"
    >
      {isFetchingNextPage ? (
        <div className="flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5 animate-spin text-sap-blue" />
          <span className="text-xs font-black uppercase tracking-widest">
            Cargando más registros...
          </span>
        </div>
      ) : !hasNextPage && records.length > 0 ? (
        <span className="text-[10px] uppercase tracking-widest opacity-50">
          Fin de los registros
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-x-auto min-w-full">
        <table className="min-w-full divide-y divide-token-border-technical relative table-fixed">
          <thead className="bg-token-surface-header sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="w-[12%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical hidden sm:table-cell">
                Área
              </th>
              <th className="w-[20%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Nombre
              </th>
              <th className="w-[10%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Fecha
              </th>
              <th className="w-[8%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Inicio
              </th>
              <th className="w-[8%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Ini Col
              </th>
              <th className="w-[8%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Fin Col
              </th>
              <th className="w-[8%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Fin
              </th>
              <th className="w-[10%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Estado
              </th>
              <th className="w-[16%] px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary border-b border-token-border-technical">
                Acciones
              </th>
            </tr>
          </thead>
        </table>
        <div
          ref={parentRef}
          className="overflow-y-auto h-[500px] custom-scrollbar"
          style={{ contain: "strict" }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
              willChange: "transform",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const record = records[virtualItem.index];
              if (!record) return null;
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="border-b border-token-border-subtle hover:bg-token-surface-active"
                >
                  <div className="flex items-center h-full px-0">
                    <TimeRecordRow
                      record={record}
                      onRowDoubleClick={onRowDoubleClick}
                      onAddComment={onAddComment}
                      onDelete={onDelete}
                      isActionDisabledForRole={isActionDisabledForRole}
                      roleBasedTooltip={roleBasedTooltip}
                      accountingLockDate={accountingLockDate}
                      isControlInternoEnabled={isControlInternoEnabled}
                      onViewHistory={onViewHistory}
                      layoutMode="table-row-div"
                      externalEdits={editsMapAll.get(String(record.id))}
                      externalPendingRequest={pendingRequestsMap.get(String(record.id))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {renderSentinel()}
        </div>
      </div>
      {records.length === 0 && !isLoading && (
        <div className="p-8 text-center">
          <p className="text-sm text-token-text-tertiary">
            No hay registros que coincidan con su filtro.
          </p>
        </div>
      )}
      {isLoading && records.length === 0 && (
        <div className="p-12 flex justify-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-token-text-tertiary" />
        </div>
      )}
    </div>
  );
};

export default React.memo(TimeRecordTableViewDesktop);
