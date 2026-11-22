import { useScheduling, type SchedulingQueryMode } from "./useScheduling";

export const useCorrectionRequests = (
  status?: string,
  since?: number,
  queryMode: SchedulingQueryMode = "full",
) => {
  const {
    requests,
    addCorrectionRequest,
    updateRequestStatus,
    getRequestsForEmployee,
    isUpdatingRequestStatus,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageCorrectionRequestsError,
    isLoadingCorrectionRequests: isLoadingRequests,
    isErrorCorrectionRequests: isErrorRequests,
    refetchCorrectionRequests: refetchRequests,
  } = useScheduling(status, since, { queryMode });

  return {
    requests,
    isLoadingRequests,
    isErrorRequests,
    refetchRequests,
    addCorrectionRequest,
    updateRequestStatus,
    getRequestsForEmployee,
    isUpdatingRequestStatus,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError: isFetchNextPageCorrectionRequestsError,
  };
};
