import React from "react";
import { AugmentedTimeRecord, DailyTimeRecord, CorrectionRequest } from "../../../types/index";
import { ArrowPathIcon } from "../../../components/ui/icons/index";
import TimeRecordMobileCard from "./TimeRecordMobileCard";
import { useInfiniteVirtualizedList } from "../hooks/useInfiniteVirtualizedList";

interface TimeRecordTableViewMobileProps {
  records: AugmentedTimeRecord[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  onRowDoubleClick: (record: AugmentedTimeRecord) => void;
  onAddComment: (record: DailyTimeRecord) => void;
  onDelete: (record: DailyTimeRecord) => void;
  isActionDisabledForRole: boolean;
  accountingLockDate: string | null;
  isControlInternoEnabled: boolean;
  pendingRequestsMap: Map<string, CorrectionRequest>;
}

const TimeRecordTableViewMobile: React.FC<TimeRecordTableViewMobileProps> = ({
  records,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  onRowDoubleClick,
  onAddComment,
  onDelete,
  isActionDisabledForRole,
  accountingLockDate,
  isControlInternoEnabled,
  pendingRequestsMap,
}) => {
  const { parentRef, sentinelRef, virtualizer } = useInfiniteVirtualizedList({
    count: records.length,
    estimateSize: 280,
    overscan: 5,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const renderSentinel = () => (
    <div className="w-full py-6 flex flex-col items-center justify-center text-token-text-tertiary">
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
    <div
      ref={parentRef}
      className="overflow-y-auto h-[600px] pr-2 custom-scrollbar"
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
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TimeRecordMobileCard
                record={record}
                onRowDoubleClick={onRowDoubleClick}
                onAddComment={onAddComment}
                onDelete={onDelete}
                isActionDisabledForRole={isActionDisabledForRole}
                accountingLockDate={accountingLockDate}
                isControlInternoEnabled={isControlInternoEnabled}
                externalPendingRequest={pendingRequestsMap.get(String(record.id))}
              />
            </div>
          );
        })}
      </div>
      {virtualizer.getVirtualItems().length === 0 && !isLoading && (
        <p className="text-center text-sm text-token-text-tertiary py-4">
          No hay registros que coincidan con su filtro.
        </p>
      )}
      <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
        {renderSentinel()}
      </div>
    </div>
  );
};

export default React.memo(TimeRecordTableViewMobile);
