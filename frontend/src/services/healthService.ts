import { apiClient } from "./apiClient";
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
    const result = (await apiClient.get("/api/health" as never)) as { data: HealthData };
    return result.data;
  },

  async getBackups(): Promise<BackupFile[]> {
    const result = (await apiClient.get("/api/admin/backups" as never)) as { data: BackupFile[] };
    return result.data;
  },

  async restoreBackup(filename: string): Promise<void> {
    await apiClient.post("/api/admin/restore" as never, {
      body: { filename } as never,
    });
  },

  async restartBackend(): Promise<void> {
    await apiClient.post("/api/admin/restart" as never, {
      body: {} as never,
    });
  },

  async triggerBackup(): Promise<{ success: boolean; message?: string }> {
    return (await apiClient.post("/api/admin/trigger-backup" as never, {
      body: {} as never,
    })) as { success: boolean; message?: string };
  },

  async triggerAutoClose(): Promise<number> {
    const res = (await apiClient.post("/api/admin/trigger-autoclose" as never, {
      body: {} as never,
    })) as { data?: { closedCount: number }; closedCount?: number };
    return res?.data?.closedCount ?? res?.closedCount ?? 0;
  },

  async purgeSessions(username?: string): Promise<number> {
    const res = (await apiClient.post("/api/admin/purge-sessions" as never, {
      body: { username } as never,
    })) as { data?: { deletedCount: number }; deletedCount?: number };
    return res?.data?.deletedCount ?? res?.deletedCount ?? 0;
  },

  async getStats(): Promise<unknown> {
    const res = (await apiClient.get("/api/admin/stats" as never)) as { data?: unknown };
    return res?.data || res;
  },

  async diagnoseAutoClose(): Promise<unknown> {
    const res = (await apiClient.get("/api/admin/diagnose-autoclose" as never)) as {
      data?: unknown;
    };
    return res?.data || res;
  },

  async resetPassword(username: string, newPassword: string): Promise<unknown> {
    const res = (await apiClient.post("/api/admin/reset-password" as never, {
      body: { username, newPassword } as never,
    })) as { data?: unknown };
    return res?.data || res;
  },

  async clearDatabase(): Promise<void> {
    await apiClient.delete("/api/maintenance/clear-database" as never);
  },

  async triggerAccountingAutoClose(): Promise<unknown> {
    const res = (await apiClient.post("/api/admin/trigger-accounting-autoclose" as never, {
      body: {} as never,
    })) as { data?: unknown };
    return res?.data || res;
  },

  async getSecurityInsights(): Promise<{ stats?: unknown; recentAlerts?: unknown[] }> {
    const res = (await apiClient.get("/api/admin/security-insights" as never)) as {
      data?: { stats?: unknown; recentAlerts?: unknown[] };
      stats?: unknown;
      recentAlerts?: unknown[];
    };
    return res?.data || res;
  },
};
