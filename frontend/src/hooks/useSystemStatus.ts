import { useCallback } from "react";
import { useHealthQuery, deriveBackendStatus } from "./queries/useHealthQuery";

export type SystemStatus = "online" | "offline" | "degraded";

interface UseSystemStatusReturn {
  isOnline: boolean;
  status: SystemStatus;
  checkHealth: () => Promise<void>;
}

/**
 * Thin adapter over the shared useHealthQuery (Fase 1).
 * Same return contract as before; transport now deduplicated by queryKey.
 */
export const useSystemStatus = (): UseSystemStatusReturn => {
  const { data, error, isLoading, refetch } = useHealthQuery();
  const backend = deriveBackendStatus(data, error, isLoading);

  const status: SystemStatus =
    backend === "healthy" ? "online" : backend === "degraded" ? "degraded" : "offline";

  const checkHealth = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return { isOnline: status !== "offline", status, checkHealth };
};
