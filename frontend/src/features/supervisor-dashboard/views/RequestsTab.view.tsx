import type { FC } from "react";
import { CorrectionRequest } from "../../../types/index";
import { CORRECTION_REQUEST_STATUS_TEXT } from "../../../utils/mappings";
import RejectionReasonModal from "../components/RejectionReasonModal.container";
import AttachmentViewerModal from "../components/AttachmentViewerModal";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  InboxArrowDownIcon,
} from "../../../components/ui/icons/index";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { Z } from "../../../constants/zScale";
import { PendingRequestCard } from "../components/RequestsTabCards";
import { VirtualizedRequestList } from "../components/RequestsTabVirtualizedList";
import type { RequestsTabController, RequestStatusFilter } from "../hooks/useRequestsTabController";

const ITEM_HEIGHTS = { pending: 200, approved: 130, rejected: 130 };

const RequestsTabView: FC<RequestsTabController> = (controller) => {
  const {
    statusFilter,
    setStatusFilter,
    requestToReject,
    setRequestToReject,
    attachmentToView,
    setAttachmentToView,
    processingIds,
    loadMoreRef,
    stats,
    isLoadingRequests,
    isUpdatingRequestStatus,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    filteredRequests,
    handleApprove,
    handleReject,
    handleConfirmReject,
    getEmployeeName,
  } = controller;

  if (isLoadingRequests) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <LoadingSpinner size="lg" variant="default" />
          <div className="absolute inset-0 flex items-center justify-center">
            <InboxArrowDownIcon className="w-5 h-5 text-sap-blue animate-pulse" />
          </div>
        </div>
        <p className="text-[11px] font-bold text-sap-blue uppercase tracking-widest animate-pulse">
          Auditando bandeja de entrada...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col gap-6">
        {/* Navigation Filters */}
        <div className="flex bg-token-surface-stripe p-1 rounded-sm border border-token-border-technical shadow-sm w-full md:w-auto overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {(["pending", "approved", "rejected"] as RequestStatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  relative px-6 py-3 text-[11px] font-bold uppercase tracking-widest transition-all duration-300 rounded-sm flex items-center gap-3 whitespace-nowrap shrink-0
                  ${
                    statusFilter === status
                      ? "text-white"
                      : "text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-active"
                  }
                `}
              >
                {statusFilter === status && (
                  <div
                    className={`absolute inset-0 shadow-md rounded-sm -${Z.sticky} animate-in fade-in ${
                      status === "pending"
                        ? "bg-amber-500 shadow-amber-500/20"
                        : status === "approved"
                          ? "bg-emerald-500 shadow-emerald-500/20"
                          : "bg-rose-600 shadow-rose-600/20"
                    }`}
                  />
                )}
                <span className={`relative ${Z.sticky}`}>
                  {CORRECTION_REQUEST_STATUS_TEXT[status]}
                </span>
                <span
                  className={`
                    px-2 py-0.5 rounded-sm text-[10px] font-bold transition-colors
                    ${
                      statusFilter === status
                        ? "bg-white/20 text-white"
                        : "bg-token-surface-stripe text-token-text-tertiary"
                    }
                  `}
                >
                  {stats?.[status] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div key={statusFilter} className="animate-in fade-in slide-in-from-top-2">
          {statusFilter === "pending" ? (
            <div className="max-h-[65vh] overflow-y-auto custom-scrollbar pr-6 -mr-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-10">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req: CorrectionRequest) => (
                    <PendingRequestCard
                      key={req.id}
                      req={req}
                      employeeName={getEmployeeName(req.employeeId)}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onViewAttachment={setAttachmentToView}
                      isProcessing={processingIds.has(req.id) || isUpdatingRequestStatus}
                    />
                  ))
                ) : (
                  <div className="sm:col-span-2 flex flex-col items-center justify-center py-40 opacity-30">
                    <div className="w-24 h-24 rounded-sm bg-token-surface-stripe flex items-center justify-center mb-8 border border-token-border-technical shadow-inner">
                      <CheckCircleIcon className="w-12 h-12 text-sap-blue" />
                    </div>
                    <p className="text-[11px] font-black text-token-text-tertiary uppercase tracking-[0.4em]">
                      AUDITADO. SIN PENDIENTES.
                    </p>
                  </div>
                )}
              </div>
              <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-3 text-[10px] font-black text-sap-blue uppercase tracking-widest animate-pulse">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    SINCRONIZANDO MÁS ENTREGAS...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pb-10">
              <VirtualizedRequestList
                requests={filteredRequests}
                itemHeight={ITEM_HEIGHTS[statusFilter]}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewAttachment={setAttachmentToView}
                isProcessing={isUpdatingRequestStatus}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                getEmployeeName={getEmployeeName}
              />
              <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-6">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-3 text-[10px] font-black text-sap-blue uppercase tracking-widest animate-pulse">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    RECUPERANDO HISTORIAL...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {requestToReject && (
        <RejectionReasonModal
          isOpen={!!requestToReject}
          onClose={() => setRequestToReject(null)}
          onConfirm={handleConfirmReject}
          isSubmitting={isUpdatingRequestStatus}
        />
      )}
      {attachmentToView && (
        <AttachmentViewerModal
          isOpen={!!attachmentToView}
          onClose={() => setAttachmentToView(undefined)}
          attachment={attachmentToView}
        />
      )}
    </div>
  );
};

export default RequestsTabView;
