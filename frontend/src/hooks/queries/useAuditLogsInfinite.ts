import { useInfiniteQuery } from "@tanstack/react-query";
import { auditLogService } from "../../services/auditLogService";
import { AuditLog } from "../../types/index";

export interface AuditLogsFilterParams {
  pageSize: number;
  filters: {
    actorUsername?: string;
    action?: string;
    category?: string[];
    severity?: string[];
    outcome?: string[];
    startDate?: string;
    endDate?: string;
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuditLogsResponse {
  data: AuditLog[];
  page: number;
  totalPages: number;
  total: number;
}

export const useAuditLogsInfinite = (params: AuditLogsFilterParams) => {
  return useInfiniteQuery<AuditLogsResponse>({
    queryKey: ["auditLogs", params],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await auditLogService.getAll({
        ...params,
        page: pageParam as number,
      });

      return {
        ...result,
        page: pageParam as number,
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes, logs are mostly historical
    gcTime: 1000 * 60 * 30, // Keep in memory for 30 minutes
  });
};
