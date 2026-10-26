import { useReadinessQuery, deriveReadinessStatus } from "./queries/useHealthQuery";

export type SystemStatus = "online" | "offline" | "degraded";

interface UseSystemStatusReturn {
  isOnline: boolean;
  status: SystemStatus;
  checkHealth: () => Promise<void>;
}

/**
 * Thin adapter over the shared lightweight readiness query.
 */
export const useSystemStatus = (): UseSystemStatusReturn => {
  const { data, error, isLoading, refetch } = useReadinessQuery();
  const backend = deriveReadinessStatus(data, error, isLoading);

  const status: SystemStatus =
    backend === "healthy" ? "online" : backend === "degraded" ? "degraded" : "offline";

  const checkHealth = async () => {
    await refetch();
  };

  return { isOnline: status !== "offline", status, checkHealth };
};
