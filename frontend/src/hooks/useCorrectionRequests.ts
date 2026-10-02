import { useScheduling } from "./useScheduling";

export const useCorrectionRequests = (status?: string, since?: number) => {
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
  } = useScheduling(status, since);

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
