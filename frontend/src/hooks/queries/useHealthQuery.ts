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

export const HEALTH_QUERY_KEY = ["system", "health"] as const;

/**
 * Single source of truth for backend liveness (Fase 1: shared query).
 * 30s poll replaces the former 3x10s independent fetch loops
 * (useSystemStatus + SyncStatus + SimpleConnectionIndicator).
 * NOTE (humano): si producto exige frescura 10s en header, pasar
 * refetchInterval: 10000 solo en ese consumidor; TanStack seguirá
 * deduplicando por queryKey mientras los intervalos coincidan.
 */
export const useHealthQuery = (options: { refetchInterval?: number } = {}) => {
  return useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: async () => {
      // Use type assertion for the path since /health might not be in the auto-generated types yet
      const response = await apiClient.get("/health" as never, {
        timeoutMs: 5000,
        retry: false,
      });
      return (response as unknown as HealthResponse).data;
    },
    refetchInterval: options.refetchInterval ?? 30000,
    staleTime: 15000,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export type BackendStatus = "healthy" | "degraded" | "offline";

/**
 * Unified mapping (Fase 1, sin cambio visual intencional):
 * - data.status degraded => degraded
 * - HTTP 503 (DB down) => offline (rojo). Decisión producto 2026-10-09:
 *   caída de DB es "Servidor Desconectado", no ámbar.
 * - resto de errores/red => offline
 */
export function deriveBackendStatus(
  data: HealthData | undefined,
  error: unknown,
  isLoading: boolean,
): BackendStatus {
  if (data?.status === "degraded") return "degraded";
  if (data) return "healthy";
  if (isLoading) return "healthy";
  return "offline";
}
