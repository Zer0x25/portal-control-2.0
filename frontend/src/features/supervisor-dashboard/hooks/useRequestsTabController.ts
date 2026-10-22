import { useState, useMemo, useRef } from "react";
import { useCorrectionRequests } from "../../../hooks/useCorrectionRequests";
import { useCorrectionRequestsStatsQuery } from "../../../hooks/queries/useCorrectionRequestsStatsQuery";
import { useAuth } from "../../../hooks/useAuth";
import { CorrectionRequest } from "../../../types/index";
import { useEmployees } from "../../../hooks/useEmployees";

export type RequestStatusFilter = "pending" | "approved" | "rejected";

export const useRequestsTabController = () => {
  const { currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("pending");

  const [requestToReject, setRequestToReject] = useState<CorrectionRequest | null>(null);

  const [attachmentToView, setAttachmentToView] = useState<CorrectionRequest["attachment"]>();

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

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
    return requests
      .filter((r: CorrectionRequest) => r.status === statusFilter)
      .sort((a: CorrectionRequest, b: CorrectionRequest) => b.createdAt - a.createdAt);
  }, [requests, statusFilter]);

  const handleApprove = async (requestId: string) => {
    if (!currentUser || processingIdsRef.current.has(requestId)) return;

    processingIdsRef.current.add(requestId);
    setProcessingIds((prev) => new Set(prev).add(requestId));
    try {
      await updateRequestStatus({
        id: requestId,
        status: "approved",
        resolvedBy: currentUser.username,
      });
    } catch {
      // Handled by mutation onError toast
    } finally {
      processingIdsRef.current.delete(requestId);
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = (request: CorrectionRequest) => {
    setRequestToReject(request);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!requestToReject || !currentUser) return;

    const requestId = requestToReject.id;
    if (processingIdsRef.current.has(requestId)) {
      setRequestToReject(null);
      return;
    }

    processingIdsRef.current.add(requestId);
    setProcessingIds((prev) => new Set(prev).add(requestId));
    setRequestToReject(null);

    try {
      await updateRequestStatus({
        id: requestId,
        status: "rejected",
        resolvedBy: currentUser.username,
        rejectionReason: reason,
      });
    } catch {
      // Handled by mutation onError toast
    } finally {
      processingIdsRef.current.delete(requestId);
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const { getEmployeeById } = useEmployees();
  const getEmployeeName = (employeeId: string) => getEmployeeById(employeeId)?.name;

  return {
    currentUser,
    statusFilter,
    setStatusFilter,
    requestToReject,
    setRequestToReject,
    attachmentToView,
    setAttachmentToView,
    processingIds,
    setProcessingIds,
    processingIdsRef,
    loadMoreRef,
    stats,
    since,
    requests,
    isLoadingRequests,
    updateRequestStatus,
    isUpdatingRequestStatus,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    filteredRequests,
    handleApprove,
    handleReject,
    handleConfirmReject,
    getEmployeeName,
  };
};

export type RequestsTabController = ReturnType<typeof useRequestsTabController>;
