import { useQuery } from "@tanstack/react-query";
import { auditLogService } from "../../services/auditLogService";

export interface IntegrityStatusSnapshot {
  status: "ok" | "degraded";
  lastRunAt: string | null;
  lastCheckedCount: number;
  lastBrokenCount: number;
  bulkModeLastRun: boolean;
  lastBrokenByReason: {
    missingHash: number;
    hashMismatch: number;
    prevHashMismatch: number;
  };
  lastBackfillAt: string | null;
  lastBackfillProcessed: number;
  lastBackfillErrors: number;
  bulkAlert: {
    lastSignature: string | null;
    lastAlertAt: string | null;
    suppressedCount: number;
  };
}

export const useIntegrityStatus = () => {
  return useQuery<IntegrityStatusSnapshot>({
    queryKey: ["integrityStatus"],
    queryFn: () => auditLogService.getIntegrityStatus(),
    refetchInterval: 1000 * 30, // Poll every 30 seconds
    staleTime: 1000 * 10,
  });
};
