import { request as apiRequest, ApiHttpError } from "./apiClient";
import type { AuditLog, BackupFile } from "../types";

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

/** Envoltura `{ data }` de la API de salud y de administracion. */
interface DataEnvelope<T> {
  data: T;
}

/** Envoltura `{ success, data }` de la API de administracion. */
export interface AdminEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/** Estadisticas de mantenimiento del panel de governance. */
export interface AdminStats {
  usersCount: number;
  employeesCount: number;
  activeEmployeesCount: number;
  recordsCount: number;
  todayRecordsCount: number;
  auditLogsCount: number;
  criticalLogsCount: number;
  mfaStats: {
    enabled: number;
    disabled: number;
  };
}

/** Diagnostico de cierres huerfanos. */
export interface AutoCloseDiagnosis {
  success: boolean;
  message?: string;
  summary: {
    needingAction: number;
    totalChecked: number;
  };
}

/** Insights de seguridad del panel de governance. */
export interface SecurityInsights {
  stats: {
    totalUsers: number;
    mfaUsers: number;
    mfaAdoption: number;
    criticalAlertsCount: number;
  };
  recentAlerts: AuditLog[];
}

/** Resultado de una accion de administracion con mensaje de negocio. */
export interface AdminActionResult {
  message?: string;
  closedCount?: number;
  deletedCount?: number;
}

export const healthService = {
  async getHealth(): Promise<HealthData> {
    try {
      const result = await apiRequest<DataEnvelope<HealthData>>({
        method: "GET",
        url: "/api/health",
        // Un sonda de salud no se reintenta: se informa de inmediato.
        retry: false,
      });
      return result.data;
    } catch (error) {
      // Un 503 es un estado "degraded" valido: el backend responde con el
      // snapshot de salud y el frontend lo muestra como caida de base de datos.
      if (error instanceof ApiHttpError && error.status === 503) {
        const payload = error.data as DataEnvelope<HealthData> | undefined;
        if (payload?.data) return payload.data;
      }
      throw error;
    }
  },

  async getBackups(): Promise<BackupFile[]> {
    const result = await apiRequest<DataEnvelope<BackupFile[]>>({
      method: "GET",
      url: "/api/admin/backups",
    });
    return result.data;
  },

  async restoreBackup(filename: string): Promise<void> {
    await apiRequest<void>({
      method: "POST",
      url: "/api/admin/restore",
      body: { filename },
    });
  },

  async restartBackend(): Promise<void> {
    await apiRequest<void>({
      method: "POST",
      url: "/api/admin/restart",
    });
  },

  async triggerBackup(): Promise<AdminEnvelope<AdminActionResult>> {
    return apiRequest<AdminEnvelope<AdminActionResult>>({
      method: "POST",
      url: "/api/admin/trigger-backup",
    });
  },

  async triggerAutoClose(): Promise<AdminEnvelope<AdminActionResult>> {
    return apiRequest<AdminEnvelope<AdminActionResult>>({
      method: "POST",
      url: "/api/admin/trigger-autoclose",
    });
  },

  async purgeSessions(username?: string): Promise<AdminEnvelope<AdminActionResult>> {
    return apiRequest<AdminEnvelope<AdminActionResult>>({
      method: "POST",
      url: "/api/admin/purge-sessions",
      body: { username },
    });
  },

  /** Estadisticas de mantenimiento del panel de governance. */
  async getAdminStats(): Promise<AdminStats> {
    const result = await apiRequest<AdminEnvelope<AdminStats>>({
      method: "GET",
      url: "/api/admin/stats",
    });
    if (!result.success || !result.data) {
      throw new Error(result.message ?? "No se pudieron obtener las estadísticas de mantenimiento");
    }
    return result.data;
  },

  /** Diagnostico de cierres huerfanos. */
  async diagnoseAutoClose(): Promise<AutoCloseDiagnosis> {
    const result = await apiRequest<AdminEnvelope<AutoCloseDiagnosis>>({
      method: "GET",
      url: "/api/admin/diagnose-autoclose",
    });
    if (!result.success || !result.data) {
      throw new Error(result.message ?? "Error en diagnóstico");
    }
    return result.data;
  },

  /** Restablece la contrasena de un usuario. */
  async resetPassword(
    username: string,
    newPassword: string,
  ): Promise<AdminEnvelope<AdminActionResult>> {
    return apiRequest<AdminEnvelope<AdminActionResult>>({
      method: "POST",
      url: "/api/admin/reset-password",
      body: { username, newPassword },
    });
  },

  /** Elimina los datos del servidor (reset maestro). */
  async clearDatabase(): Promise<void> {
    await apiRequest<void>({
      method: "DELETE",
      url: "/api/maintenance/clear-database",
    });
  },

  /** Dispara el cierre contable automatico. */
  async triggerAccountingAutoClose(): Promise<AdminEnvelope<AdminActionResult>> {
    return apiRequest<AdminEnvelope<AdminActionResult>>({
      method: "POST",
      url: "/api/admin/trigger-accounting-autoclose",
    });
  },

  /** Insights de seguridad (adopcion de MFA y alertas criticas). */
  async getSecurityInsights(): Promise<SecurityInsights> {
    const result = await apiRequest<AdminEnvelope<SecurityInsights>>({
      method: "GET",
      url: "/api/admin/security-insights",
    });
    if (!result.success || !result.data) {
      throw new Error(result.message ?? "No se pudieron obtener los insights de seguridad");
    }
    return result.data;
  },
};
