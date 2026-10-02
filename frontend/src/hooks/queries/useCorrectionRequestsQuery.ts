import { useInfiniteQuery } from "@tanstack/react-query";
import { correctionService } from "../../services/correctionService";
import { useAuth } from "../useAuth";

export const useCorrectionRequestsQuery = (status?: string, since?: number) => {
  const { currentUser } = useAuth();
  const isAuthorized = !!currentUser;

  return useInfiniteQuery({
    queryKey: ["correctionRequests", { status, since }],
    queryFn: async ({ pageParam = 0 }) => {
      if (!isAuthorized) return { requests: [], total: 0 };
      return await correctionService.getAll({
        offset: pageParam as number,
        limit: 30,
        status,
        since,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, p) => acc + p.requests.length, 0);
      return loadedCount < (lastPage.total || 0) ? loadedCount : undefined;
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};
