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
    isLoadingSchedulingData: isLoadingRequests,
  } = useScheduling(status, since, { queryMode });

  return {
    requests,
    isLoadingRequests,
    addCorrectionRequest,
    updateRequestStatus,
    getRequestsForEmployee,
    isUpdatingRequestStatus,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
