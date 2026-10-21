import { SeedingOptions } from "../features/configuration/components/SeedingOptionsModal";
import { request as apiRequest } from "./apiClient";

export type SeedPhase2JobStatus =
  "pending" | "running" | "paused" | "completed" | "failed" | "stopped";

export interface SeedPhase2Job {
  id: string;
  status: SeedPhase2JobStatus;
  config: Record<string, unknown>;
  progress: {
    currentDay: number;
    totalDays: number;
    processedRecords: number;
    sealedRecords: number;
    errors: number;
  };
  errorSummary?: string;
}

/** Linea de log de la fase 2. */
export interface SeedPhase2Log {
  createdAt: string | number | Date;
  message: string;
}

/** Respuesta de las acciones de fase 2 (iniciar/pausar/reanudar/detener). */
export interface SeedPhase2ActionResponse {
  success: boolean;
  job: SeedPhase2Job;
}

/** Respuesta del listado de logs de fase 2. */
export interface SeedPhase2LogsResponse {
  success: boolean;
  logs: SeedPhase2Log[];
}

/**
 * Fase 1 del seeding: el backend responde con **JSON por lineas** (una linea
 * por progreso). El cliente entrega la `Response` cruda (`responseType:
 * "stream"`) para que este service lea el flujo linea a linea.
 */
export const seedPhase1 = async (
  options: SeedingOptions,
  onProgress: (message: string) => void,
): Promise<{ success: boolean; error?: string }> => {
  try {
    onProgress("Conectando con el servidor (Fase 1)...");
    const response = await apiRequest<Response>({
      method: "POST",
      url: "/api/maintenance/seed/phase1",
      body: options,
      responseType: "stream",
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let success = false;
    let lastError = "";
    let pending = "";

    if (!reader) throw new Error("No se pudo inicializar el lector de flujo.");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.progress) onProgress(data.progress);
          if (data.success) success = true;
          if (data.error) lastError = data.error;
        } catch {
          // ignore parse chunks
        }
      }
    }

    // Require explicit success signal from backend
    if (!success) {
      throw new Error(lastError || "El servidor no confirmó la finalización de Fase 1.");
    }
    onProgress("Fase 1 completada en servidor.");
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    onProgress(`ERROR: ${error}`);
    return { success: false, error };
  }
};

export const startSeedPhase2 = async (
  options: Pick<SeedingOptions, "days" | "leaveRatio" | "correctionRequestRatio">,
): Promise<SeedPhase2ActionResponse> => {
  return apiRequest<SeedPhase2ActionResponse>({
    method: "POST",
    url: "/api/maintenance/seed/phase2/start",
    body: options,
  });
};

export const pauseSeedPhase2 = async (jobId: string): Promise<SeedPhase2ActionResponse> => {
  return apiRequest<SeedPhase2ActionResponse>({
    method: "POST",
    url: "/api/maintenance/seed/phase2/pause",
    body: { jobId },
  });
};

export const resumeSeedPhase2 = async (jobId: string): Promise<SeedPhase2ActionResponse> => {
  return apiRequest<SeedPhase2ActionResponse>({
    method: "POST",
    url: "/api/maintenance/seed/phase2/resume",
    body: { jobId },
  });
};

export const stopSeedPhase2 = async (jobId: string): Promise<SeedPhase2ActionResponse> => {
  return apiRequest<SeedPhase2ActionResponse>({
    method: "POST",
    url: "/api/maintenance/seed/phase2/stop",
    body: { jobId },
  });
};

export const getSeedPhase2Status = async (
  jobId?: string,
): Promise<{ success: boolean; job: SeedPhase2Job | null }> => {
  return apiRequest<{ success: boolean; job: SeedPhase2Job | null }>({
    method: "GET",
    url: "/api/maintenance/seed/phase2/status",
    params: { jobId },
    cache: "no-store",
  });
};

export const getSeedPhase2Logs = async (jobId: string): Promise<SeedPhase2LogsResponse> => {
  return apiRequest<SeedPhase2LogsResponse>({
    method: "GET",
    url: "/api/maintenance/seed/phase2/logs",
    params: { jobId, limit: 200 },
    cache: "no-store",
  });
};

// Backward compatibility for existing calls
export const seedDatabase = seedPhase1;
