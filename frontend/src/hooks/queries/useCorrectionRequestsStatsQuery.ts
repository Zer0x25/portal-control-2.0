import { useQuery } from "@tanstack/react-query";
import { correctionService } from "../../services/correctionService";
import { useAuth } from "../useAuth";
import { queryKeys } from "../../lib/queryKeys";

export const useCorrectionRequestsStatsQuery = () => {
  const { currentUser } = useAuth();
  const isAuthorized = !!currentUser;

  return useQuery({
    queryKey: queryKeys.correctionRequestsStats(),
    queryFn: async () => {
      if (!isAuthorized) return { pending: 0, approved: 0, rejected: 0 };
      return await correctionService.getStats();
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
