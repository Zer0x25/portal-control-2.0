import { useQuery } from "@tanstack/react-query";
import { auditLogService } from "../../services/auditLogService";
import { AuditLog } from "../../types/index";
import { queryKeys } from "../../lib/queryKeys";

export const useRecordHistory = (recordId: string | null) => {
  return useQuery({
    queryKey: queryKeys.recordHistory(recordId),
    queryFn: async () => {
      if (!recordId) return [];
      const result = await auditLogService.getAll({
        page: 1,
        pageSize: 50,
        filters: { recordId },
      });
      return result.data as AuditLog[];
    },
    enabled: !!recordId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
