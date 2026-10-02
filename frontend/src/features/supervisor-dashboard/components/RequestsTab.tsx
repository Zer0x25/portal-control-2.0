import React, { useState, useMemo, FC, useRef, useEffect } from "react";
import { useCorrectionRequests } from "../../../hooks/useCorrectionRequests";
import { useCorrectionRequestsStatsQuery } from "../../../hooks/queries/useCorrectionRequestsStatsQuery";
import { useEmployees } from "../../../hooks/useEmployees";
import { useAuth } from "../../../hooks/useAuth";
import Button from "../../../components/ui/Button";
import { CorrectionRequest } from "../../../types/index";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { CORRECTION_REQUEST_STATUS_TEXT, TIME_RECORD_FIELD_LABELS } from "../../../utils/mappings";
import RejectionReasonModal from "../../../components/ui/RejectionReasonModal";
import AttachmentViewerModal from "../../../components/ui/AttachmentViewerModal";
import {
  ArrowPathIcon,
  AttachmentIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  InboxArrowDownIcon,
} from "../../../components/ui/icons/index";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";

type RequestStatusFilter = "pending" | "approved" | "rejected";

const ITEM_HEIGHTS = {
  pending: 200,
  approved: 130,
  rejected: 130,
};

// ------------------------------------------------------------------
// COMPONENTE: TARJETA PENDIENTE (ACCIONABLE INDUSTRIAL)
// ------------------------------------------------------------------
const PendingRequestCard: FC<{
  req: CorrectionRequest;
  onApprove: (id: string) => void;
  onReject: (req: CorrectionRequest) => void;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
  isProcessing?: boolean;
}> = ({ req, onApprove, onReject, onViewAttachment, isProcessing = false }) => {
  const { getEmployeeById } = useEmployees();
  const employee = getEmployeeById(req.employeeId);

  return (
    <motion.div className="p-6 rounded-sm bg-token-surface-card border border-token-border-technical shadow-sm group hover:border-sap-blue transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-sm bg-sap-blue border border-sap-blue shadow-lg shadow-sap-blue/20 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-token-text-primary uppercase tracking-tight">
              {employee?.name || "Operario Técnico"}
            </p>
            <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1">
              Modificación:{" "}
              <span className="text-sap-blue">{TIME_RECORD_FIELD_LABELS[req.recordField]}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[10px] font-bold uppercase tracking-widest">
          <ClockIcon className="w-3.5 h-3.5" />
          Pendiente de auditoría
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div className="p-3.5 rounded-sm bg-token-surface-stripe border border-token-border-subtle group-hover:border-token-border-technical transition-colors">
          <p className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider mb-1.5 opacity-70">
            Valor Original
          </p>
          <p className="text-[11px] font-bold text-token-text-tertiary line-through opacity-50 tabular-nums">
            {formatDisplayDateTime(req.originalValue)}
          </p>
        </div>
        <div className="p-3.5 rounded-sm bg-sap-blue/[0.03] border border-sap-blue/20 relative overflow-hidden group-hover:border-sap-blue/40 transition-colors">
          <div className="absolute top-0 right-0 w-8 h-8 bg-sap-blue/5 rounded-bl-full" />
          <p className="text-[10px] font-semibold text-sap-blue uppercase tracking-wider mb-1.5">
            Valor Solicitado
          </p>
          <p className="text-[11px] font-bold text-sap-blue tabular-nums">
            {formatDisplayDateTime(req.requestedValue)}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-token-border-subtle flex flex-col gap-4">
        <p className="text-[11px] font-bold text-token-text-secondary leading-relaxed italic px-4 py-3 bg-token-surface-stripe border-l-2 border-sap-blue rounded-sm">
          "{req.reason}"
        </p>
        {req.attachment && (
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-2 text-[10px] font-black text-sap-blue hover:text-indigo-700 uppercase tracking-widest transition-colors w-fit"
          >
            <AttachmentIcon className="w-3.5 h-3.5" /> VER EVIDENCIA ADJUNTA
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <Button
          variant="secondary"
          className="flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest rounded-sm bg-token-surface-card hover:bg-rose-500 hover:text-white border-token-border-technical hover:border-rose-600 transition-all duration-300"
          onClick={() => onReject(req)}
          disabled={isProcessing}
        >
          Denegar Solicitud
        </Button>
        <Button
          variant="primary"
          className="flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest rounded-sm bg-sap-blue hover:brightness-110 shadow-lg shadow-sap-blue/20 border-none text-white transition-all duration-300"
          onClick={() => onApprove(req.id)}
          loading={isProcessing}
        >
          Validar en Sistema
        </Button>
      </div>
    </motion.div>
  );
};

// ------------------------------------------------------------------
// COMPONENTE: TARJETA APROBADA (INDUSTRIAL COMPACTA)
// ------------------------------------------------------------------
const ApprovedRequestCard: FC<{
  req: CorrectionRequest;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
}> = ({ req, onViewAttachment }) => {
  const { getEmployeeById } = useEmployees();
  const employee = getEmployeeById(req.employeeId);

  return (
    <motion.div className="h-full p-4 rounded-sm bg-token-surface-card border border-token-border-technical border-l-4 border-l-emerald-500 shadow-sm transition-all group flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[12px] font-bold text-token-text-primary uppercase tracking-tight">
            {employee?.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">
              Solicitud validada
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="px-2 py-0.5 rounded-sm bg-emerald-500/10 text-[9px] font-bold text-emerald-700 uppercase tracking-wider border border-emerald-500/20">
            Auditor: {req.resolvedBy}
          </div>
          <p className="text-[9px] font-semibold text-token-text-tertiary uppercase tracking-wider">
            {req.resolvedAt ? formatDisplayDateTime(new Date(req.resolvedAt).toISOString()) : "-"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 py-1.5 px-3 bg-emerald-500/5 rounded-sm border border-emerald-500/10 w-fit my-2">
        <span className="text-[11px] font-semibold text-token-text-tertiary line-through opacity-50">
          {formatDisplayDateTime(req.originalValue)}
        </span>
        <span className="text-emerald-600 font-bold">→</span>
        <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
          {formatDisplayDateTime(req.requestedValue)}
        </span>
      </div>

      {req.attachment && (
        <div className="mt-auto pt-2 border-t border-token-border-subtle flex justify-end">
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-1 text-[8px] font-black text-sap-blue hover:text-indigo-700 uppercase tracking-widest transition-colors"
          >
            <AttachmentIcon className="w-3 h-3" /> VER EVIDENCIA
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ------------------------------------------------------------------
// COMPONENTE: TARJETA RECHAZADA (INDUSTRIAL COMPACTA)
// ------------------------------------------------------------------
const RejectedRequestCard: FC<{
  req: CorrectionRequest;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
}> = ({ req, onViewAttachment }) => {
  const { getEmployeeById } = useEmployees();
  const employee = getEmployeeById(req.employeeId);

  return (
    <motion.div className="h-full p-4 rounded-sm bg-token-surface-card border border-token-border-technical border-l-4 border-l-rose-500 shadow-sm transition-all group flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[12px] font-bold text-token-text-primary uppercase tracking-tight">
            {employee?.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <XCircleIcon className="w-3 h-3 text-rose-500" />
            <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-widest">
              Solicitud rechazada
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <div className="px-2 py-0.5 rounded-sm bg-rose-500/10 text-[9px] font-bold text-rose-700 uppercase tracking-wider border border-rose-500/20">
            Auditor: {req.resolvedBy}
          </div>
          <p className="text-[9px] font-semibold text-token-text-tertiary uppercase tracking-wider">
            {req.resolvedAt ? formatDisplayDateTime(new Date(req.resolvedAt).toISOString()) : "-"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 py-2 px-3 bg-rose-500/5 rounded-sm border border-rose-500/10 w-full my-2">
        <p className="text-[11px] text-rose-700 font-bold italic line-clamp-2 leading-tight">
          "{req.rejectionReason}"
        </p>
      </div>

      {req.attachment && (
        <div className="mt-auto pt-2 border-t border-token-border-subtle flex justify-end">
          <button
            onClick={() => onViewAttachment(req.attachment!)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-sap-blue hover:text-indigo-700 uppercase tracking-wider transition-colors"
          >
            <AttachmentIcon className="w-3.5 h-3.5" /> Ver evidencia
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ------------------------------------------------------------------
// LISTA VIRTUALIZADA INDUSTRIAL
// ------------------------------------------------------------------
const VirtualizedRequestList: FC<{
  requests: CorrectionRequest[];
  itemHeight: number;
  onApprove: (id: string) => void;
  onReject: (req: CorrectionRequest) => void;
  onViewAttachment: (att: CorrectionRequest["attachment"]) => void;
  isProcessing?: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
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
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= requests.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    requests.length,
    fetchNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

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
                  onApprove={onApprove}
                  onReject={onReject}
                  onViewAttachment={onViewAttachment}
                  isProcessing={isProcessing}
                />
              )}
              {req.status === "approved" && (
                <ApprovedRequestCard req={req} onViewAttachment={onViewAttachment} />
              )}
              {req.status === "rejected" && (
                <RejectedRequestCard req={req} onViewAttachment={onViewAttachment} />
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

const RequestsTab: React.FC = () => {
  const { currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("pending");
  const [requestToReject, setRequestToReject] = useState<CorrectionRequest | null>(null);
  const [attachmentToView, setAttachmentToView] = useState<CorrectionRequest["attachment"]>();
  const processingIdsRef = useRef<Set<string>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useCorrectionRequestsStatsQuery();

  const since = useMemo(() => {
    if (statusFilter === "pending") return undefined;
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.getTime();
  }, [statusFilter]);

  const {
    requests,
    isLoadingRequests,
    updateRequestStatus,
    isUpdatingRequestStatus,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCorrectionRequests(statusFilter, since);

  const filteredRequests = useMemo(() => {
    return [...requests].sort(
      (a: CorrectionRequest, b: CorrectionRequest) => b.createdAt - a.createdAt,
    );
  }, [requests]);

  const handleApprove = async (requestId: string) => {
    if (!currentUser || processingIdsRef.current.has(requestId)) return;

    processingIdsRef.current.add(requestId);
    try {
      await updateRequestStatus({
        id: requestId,
        status: "approved",
        resolvedBy: currentUser.username,
      });
    } finally {
      processingIdsRef.current.delete(requestId);
    }
  };

  const handleReject = (request: CorrectionRequest) => {
    setRequestToReject(request);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!requestToReject || !currentUser) return;

    if (processingIdsRef.current.has(requestToReject.id)) {
      setRequestToReject(null);
      return;
    }

    const requestId = requestToReject.id;
    processingIdsRef.current.add(requestId);
    setRequestToReject(null);

    try {
      await updateRequestStatus({
        id: requestId,
        status: "rejected",
        resolvedBy: currentUser.username,
        rejectionReason: reason,
      });
    } finally {
      processingIdsRef.current.delete(requestId);
    }
  };

  if (isLoadingRequests) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-12 h-12 border-4 border-sap-blue/20 border-t-sap-blue rounded-full"
          />
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
                  <motion.div
                    layoutId="activeFilterPill"
                    className={`absolute inset-0 shadow-md rounded-sm -z-10 ${
                      status === "pending"
                        ? "bg-amber-500 shadow-amber-500/20"
                        : status === "approved"
                          ? "bg-emerald-500 shadow-emerald-500/20"
                          : "bg-rose-600 shadow-rose-600/20"
                    }`}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <span className="relative z-10">{CORRECTION_REQUEST_STATUS_TEXT[status]}</span>
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

        <AnimatePresence mode="wait">
          <motion.div
            key={statusFilter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {statusFilter === "pending" ? (
              <div className="max-h-[65vh] overflow-y-auto custom-scrollbar pr-6 -mr-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-10">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((req: CorrectionRequest) => (
                      <PendingRequestCard
                        key={req.id}
                        req={req}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onViewAttachment={setAttachmentToView}
                        isProcessing={isUpdatingRequestStatus}
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
          </motion.div>
        </AnimatePresence>
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

export default RequestsTab;
