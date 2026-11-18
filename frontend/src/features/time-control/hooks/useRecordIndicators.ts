import { useQuery } from "@tanstack/react-query";
import { request } from "../../../services/apiClient";
import { queryKeys } from "../../../lib/queryKeys";
import type { AuditLog, CorrectionRequest } from "../../../types";

export type PendingIndicator = Pick<CorrectionRequest, "id" | "timeRecordId" | "status">;
type IndicatorResponse = {
  edits: Array<Pick<AuditLog, "id" | "action" | "timestamp" | "actorUsername" | "details">>;
  pending: PendingIndicator[];
};

export function useRecordIndicators(ids: string[]) {
  const key = JSON.stringify([...new Set(ids)].sort());
  return useQuery({
    queryKey: queryKeys.timeRecordIndicators(key),
    enabled: ids.length > 0,
    queryFn: async () => {
      const unique = JSON.parse(key) as string[];
      const results: IndicatorResponse[] = [];
      for (let offset = 0; offset < unique.length; offset += 100) {
        results.push(
          await request<IndicatorResponse>({
            method: "GET",
            url: "/api/records/indicators",
            params: {
              ids: unique
                .slice(offset, offset + 100)
                .map(encodeURIComponent)
                .join(","),
            },
          }),
        );
      }
      return {
        edits: results
          .flatMap((result) => result.edits)
          .map((entry) => ({
            ...entry,
            lastModified: entry.timestamp,
            syncStatus: "synced" as const,
            isDeleted: false,
          })),
        pending: results.flatMap((result) => result.pending),
      };
    },
  });
}
