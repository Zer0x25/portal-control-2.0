import { SeedingOptions } from "../features/configuration/components/SeedingOptionsModal";
import { apiClient } from "./apiClient";

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

export const seedPhase1 = async (
  options: SeedingOptions,
  onProgress: (message: string) => void,
): Promise<{ success: boolean; error?: string }> => {
  try {
    onProgress("Conectando con el servidor (Fase 1)...");
    const response = await apiClient.request<Response>("/api/maintenance/seed/phase1", {
      method: "POST",
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
): Promise<{ success: boolean; job: SeedPhase2Job }> => {
  return (await apiClient.post("/api/maintenance/seed/phase2/start" as never, {
    body: options as never,
  })) as { success: boolean; job: SeedPhase2Job };
};

export const pauseSeedPhase2 = async (jobId: string) => {
  return apiClient.post("/api/maintenance/seed/phase2/pause" as never, {
    body: { jobId } as never,
  });
};

export const resumeSeedPhase2 = async (jobId: string) => {
  return apiClient.post("/api/maintenance/seed/phase2/resume" as never, {
    body: { jobId } as never,
  });
};

export const stopSeedPhase2 = async (jobId: string) => {
  return apiClient.post("/api/maintenance/seed/phase2/stop" as never, {
    body: { jobId } as never,
  });
};

export const getSeedPhase2Status = async (
  jobId?: string,
): Promise<{ success: boolean; job: SeedPhase2Job | null }> => {
  return (await apiClient.get("/api/maintenance/seed/phase2/status" as never, {
    params: jobId ? { jobId } : undefined,
    dedup: false,
  })) as { success: boolean; job: SeedPhase2Job | null };
};

export const getSeedPhase2Logs = async (
  jobId: string,
): Promise<{
  success: boolean;
  logs: Array<{ createdAt: string | number | Date; message: string; [key: string]: unknown }>;
}> => {
  return (await apiClient.get("/api/maintenance/seed/phase2/logs" as never, {
    params: { jobId, limit: 200 },
    dedup: false,
  })) as {
    success: boolean;
    logs: Array<{ createdAt: string | number | Date; message: string; [key: string]: unknown }>;
  };
};

// Backward compatibility for existing calls
export const seedDatabase = seedPhase1;
