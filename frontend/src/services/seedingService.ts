import { SeedingOptions } from "../components/ui/SeedingOptionsModal";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

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

const API_URL = `${API_BASE_URL}/maintenance`;

export const seedPhase1 = async (
  options: SeedingOptions,
  onProgress: (message: string) => void,
): Promise<{ success: boolean; error?: string }> => {
  try {
    onProgress("Conectando con el servidor (Fase 1)...");
    const response = await fetch(`${API_URL}/seed/phase1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Falló fase 1 en el servidor.");
    }

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
) => {
  const response = await fetch(`${API_URL}/seed/phase2/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authService.getAuthHeader() as Record<string, string>),
    },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error("No se pudo iniciar Fase 2");
  return response.json();
};

export const pauseSeedPhase2 = async (jobId: string) => {
  const response = await fetch(`${API_URL}/seed/phase2/pause`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authService.getAuthHeader() as Record<string, string>),
    },
    body: JSON.stringify({ jobId }),
  });
  if (!response.ok) throw new Error("No se pudo pausar");
  return response.json();
};

export const resumeSeedPhase2 = async (jobId: string) => {
  const response = await fetch(`${API_URL}/seed/phase2/resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authService.getAuthHeader() as Record<string, string>),
    },
    body: JSON.stringify({ jobId }),
  });
  if (!response.ok) throw new Error("No se pudo reanudar");
  return response.json();
};

export const stopSeedPhase2 = async (jobId: string) => {
  const response = await fetch(`${API_URL}/seed/phase2/stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authService.getAuthHeader() as Record<string, string>),
    },
    body: JSON.stringify({ jobId }),
  });
  if (!response.ok) throw new Error("No se pudo detener");
  return response.json();
};

export const getSeedPhase2Status = async (
  jobId?: string,
): Promise<{ success: boolean; job: SeedPhase2Job | null }> => {
  const q = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
  const response = await fetch(`${API_URL}/seed/phase2/status${q}`, {
    cache: "no-store",
    headers: {
      ...(authService.getAuthHeader() as Record<string, string>),
    },
  });
  if (!response.ok) throw new Error("No se pudo consultar estado");
  return response.json();
};

export const getSeedPhase2Logs = async (jobId: string) => {
  const response = await fetch(
    `${API_URL}/seed/phase2/logs?jobId=${encodeURIComponent(jobId)}&limit=200`,
    {
      cache: "no-store",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    },
  );
  if (!response.ok) throw new Error("No se pudo consultar logs");
  return response.json();
};

// Backward compatibility for existing calls
export const seedDatabase = seedPhase1;
