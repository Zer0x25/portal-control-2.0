import type { FC } from "react";
import type { CorrectionRequest } from "../../../types/index";
import { ClockIcon } from "../../../components/ui/icons/index";
import { PendingRequestCard, ApprovedRequestCard, RejectedRequestCard } from "./RequestsTabCards";
import { useRequestsTabVirtualizer } from "../hooks/useRequestsTabVirtualizer";

export const VirtualizedRequestList: FC<{
  requests: CorrectionRequest[];
  itemHeight: number;
  onApprove: (id: string) => void;
  onReject: (req: CorrectionRequest) => void;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
  isProcessing?: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  getEmployeeName: (employeeId: string) => string | undefined;
}> = ({
  requests,
  itemHeight,
  onApprove,
  onReject,
  onViewAttachment,
  isProcessing,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  getEmployeeName,
}) => {
  const { parentRef, rowVirtualizer } = useRequestsTabVirtualizer({
    requests,
    itemHeight,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <div
      ref={parentRef}
      className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-6 -mr-6 min-h-[450px]"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const req = requests[virtualRow.index];
          if (!req) return null;

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
              className="py-3 px-1"
            >
              {req.status === "pending" && (
                <PendingRequestCard
                  req={req}
                  employeeName={getEmployeeName(req.employeeId)}
                  onApprove={onApprove}
                  onReject={onReject}
                  onViewAttachment={onViewAttachment}
                  isProcessing={isProcessing}
                />
              )}
              {req.status === "approved" && (
                <ApprovedRequestCard
                  req={req}
                  employeeName={getEmployeeName(req.employeeId)}
                  onViewAttachment={onViewAttachment}
                />
              )}
              {req.status === "rejected" && (
                <RejectedRequestCard
                  req={req}
                  employeeName={getEmployeeName(req.employeeId)}
                  onViewAttachment={onViewAttachment}
                />
              )}
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center py-24 opacity-30">
            <div className="w-20 h-20 rounded-sm bg-token-surface-stripe flex items-center justify-center mb-6 border border-token-border-technical shadow-inner">
              <ClockIcon className="w-10 h-10 text-token-text-tertiary" />
            </div>
            <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest text-center">
              NO SE IDENTIFICARON REGISTROS
              <br />
              EN ESTE SEGMENTO
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
