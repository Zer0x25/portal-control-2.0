import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { queryKeys } from "../../lib/queryKeys";

export interface HealthData {
  status: "healthy" | "degraded";
  instanceId?: string | null;
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

type ReadinessDiagnosticsWindow = Window & {
  __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean;
  __PORTAL_SYNC_PERF_RUN_ID__?: string;
  __PORTAL_SYNC_PERF_SAMPLE__?: number;
};

const getReadinessDiagnosticParams = (): Record<string, string> | undefined => {
  if (typeof window === "undefined") return undefined;

  const diagnostics = window as ReadinessDiagnosticsWindow;
  const runId = diagnostics.__PORTAL_SYNC_PERF_RUN_ID__;
  const sample = diagnostics.__PORTAL_SYNC_PERF_SAMPLE__;
  if (
    diagnostics.__PORTAL_SYNC_PERF_DIAGNOSTICS__ !== true ||
    !runId ||
    !/^[a-z0-9-]{1,64}$/i.test(runId) ||
    !Number.isInteger(sample) ||
    sample === undefined ||
    sample < 1 ||
    sample > 3
  ) {
    return undefined;
  }

  const probeId = `${runId}-s${sample}`;
  return { performance_probe: probeId };
};

const emitReadinessQueryTiming = (startedAtMs: number, outcome: "success" | "failure"): void => {
  if (
    typeof window === "undefined" ||
    (window as ReadinessDiagnosticsWindow).__PORTAL_SYNC_PERF_DIAGNOSTICS__ !== true
  ) {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent("portal:readiness-query", {
        detail: {
          startedAtMs: Number(startedAtMs.toFixed(2)),
          resolvedAtMs: Number(performance.now().toFixed(2)),
          outcome,
        },
      }),
    );
  } catch {
    // Diagnostic timing must never affect the readiness query.
  }
};

const fetchReadiness = async () => {
  const diagnosticParams = getReadinessDiagnosticParams();
  const startedAtMs = performance.now();
  try {
    const response = await apiClient.get("/api/health/ready", {
      ...(diagnosticParams ? { params: diagnosticParams as never } : {}),
      timeoutMs: 5000,
      retry: false,
    });
    emitReadinessQueryTiming(startedAtMs, "success");
    return response;
  } catch (error) {
    emitReadinessQueryTiming(startedAtMs, "failure");
    throw error;
  }
};

export type HealthReadinessData = Awaited<ReturnType<typeof fetchReadiness>>;

export const HEALTH_QUERY_KEY = queryKeys.systemHealth();
export const READINESS_QUERY_KEY = queryKeys.systemReadiness();

/** Opciones compartidas para que el arranque reutilice el sondeo de salud. */
export const healthQueryOptions = {
  queryKey: HEALTH_QUERY_KEY,
  queryFn: async () => {
    // Use type assertion for the path since /health might not be in the auto-generated types yet
    const response = await apiClient.get("/health" as never, {
      timeoutMs: 5000,
      retry: false,
    });
    return (response as unknown as HealthResponse).data;
  },
  staleTime: 15000,
};

/** Startup/connection status without the detailed diagnostics payload. */
export const readinessQueryOptions = {
  queryKey: READINESS_QUERY_KEY,
  queryFn: fetchReadiness,
  staleTime: 15000,
};

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
    ...healthQueryOptions,
    refetchInterval: options.refetchInterval ?? 30000,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

/** Shared small readiness query for shell status and instance validation. */
export const useReadinessQuery = (options: { refetchInterval?: number } = {}) => {
  return useQuery({
    ...readinessQueryOptions,
    refetchInterval: options.refetchInterval ?? 30000,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
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

export function deriveReadinessStatus(
  data: HealthReadinessData | undefined,
  error: unknown,
  isLoading: boolean,
): BackendStatus {
  if (data?.healthStatus === "degraded") return "degraded";
  if (data) return "healthy";
  if (isLoading) return "healthy";
  return "offline";
}
