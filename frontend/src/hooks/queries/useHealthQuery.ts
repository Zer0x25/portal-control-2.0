import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";

export interface HealthData {
  status: "healthy" | "degraded";
  timestamp: string;
  uptime: number;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    cpus: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    os: {
      freeMem: number;
      totalMem: number;
      loadAvg: number[];
    };
  };
  database: {
    status: "OK" | "ERROR";
    latency: number;
    size: string;
  };
  backup: {
    enabled: boolean;
    isScheduledEnabled: boolean;
    stale: boolean;
    staleThresholdHours: number;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    latestFileAt: string | null;
    latestFileAgeHours: number | null;
    latestFileSize: string | null;
    backupCount: number;
    mode?: string;
  };
  integrity: {
    status: string;
    lastRunAt: string | null;
    lastCheckedCount: number;
    lastBrokenCount: number;
    lastBrokenByReason: {
      hashMismatch: number;
      prevHashMismatch: number;
    };
  };
  responseTime: number;
}

export interface HealthResponse {
  success: boolean;
  data: HealthData;
}

export const useHealthQuery = (options: { refetchInterval?: number } = {}) => {
  return useQuery({
    queryKey: ["system", "health"],
    queryFn: async () => {
      // Use type assertion for the path since /health might not be in the auto-generated types yet
      const response = await apiClient.get("/health" as never);
      return (response as unknown as HealthResponse).data;
    },
    refetchInterval: options.refetchInterval || false,
    retry: false,
  });
};
