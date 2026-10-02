import { API_BASE_URL } from "./apiBase";
import { authService } from "./authService";
import type { BackupFile } from "../types";

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
  backup?: {
    enabled: boolean;
    stale: boolean;
    staleThresholdHours: number;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    latestFileAt: string | null;
    latestFileAgeHours: number | null;
    latestFileSize: string | null;
    backupCount: number;
  };
  integrity: {
    status: "ok" | "degraded";
    lastRunAt: string | null;
    lastCheckedCount: number;
    lastBrokenCount: number;
    lastBrokenByReason: {
      missingHash: number;
      hashMismatch: number;
      prevHashMismatch: number;
    };
  };
  responseTime: number;
}

export const healthService = {
  async getHealth(): Promise<HealthData> {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
      },
    });
    if (!response.ok && response.status !== 503) {
      throw new Error("Failed to fetch health data");
    }
    const result = await response.json();
    return result.data;
  },

  async getBackups(): Promise<BackupFile[]> {
    const response = await fetch(`${API_BASE_URL}/admin/backups`, {
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch backups");
    }
    const result = await response.json();
    return result.data;
  },

  async restoreBackup(filename: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authService.getToken()}`,
      },
      body: JSON.stringify({ filename }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to restore backup");
    }
  },

  async restartBackend(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/restart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to restart backend");
    }
  },

  async triggerBackup(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/trigger-backup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to trigger backup");
    }
  },

  async triggerAutoClose(): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/admin/trigger-autoclose`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to trigger auto-close");
    }
    const result = await response.json();
    return result.data.closedCount;
  },

  async purgeSessions(username?: string): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/admin/purge-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authService.getToken()}`,
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to purge sessions");
    }
    const result = await response.json();
    return result.data.deletedCount;
  },
};
