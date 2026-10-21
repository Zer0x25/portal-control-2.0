import { request as apiRequest } from "./apiClient";
import { AuditLog } from "../types/index";

/**
 * Envoltura variable del listado de auditoria: el backend puede devolver
 * `{ data: [...] }`, `{ items: [...] }` o el array suelto.
 */
interface AuditLogListPayload {
  items?: AuditLog[];
  data?: AuditLog[];
  total?: number;
  page?: number;
  totalPages?: number;
  nextCursor?: string | null;
}

/**
 * Listado de auditoria con la forma que consume el frontend.
 *
 * El item es generico porque cada consumidor conoce su propio `details`
 * (p. ej. el historial de asignaciones de turno): el service normaliza el
 * `details` serializado y devuelve la lista con esa forma.
 */
export interface AuditLogListResult<T = AuditLog> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

/** Estado de integridad de la auditoria (respuesta de `integrity-status`). */
export interface AuditIntegrityStatus {
  status: "ok" | "degraded";
  lastRunAt: string | null;
  lastCheckedCount: number;
  lastBrokenCount: number;
  bulkModeLastRun: boolean;
  lastBrokenByReason: {
    missingHash: number;
    hashMismatch: number;
    prevHashMismatch: number;
  };
  lastBackfillAt: string | null;
  lastBackfillProcessed: number;
  lastBackfillErrors: number;
  bulkAlert: {
    lastSignature: string | null;
    lastAlertAt: string | null;
    suppressedCount: number;
  };
}

/** Respuesta de las operaciones de escritura (el toast usa `message`). */
interface AuditActionResponse {
  message?: string;
  [key: string]: unknown;
}

interface AuditIntegrityStatusResponse {
  data?: AuditIntegrityStatus;
}

export const auditLogService = {
  async getAll<T = AuditLog>(params: {
    page: number;
    pageSize: number;
    filters: Record<string, string | string[] | undefined>;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    cursor?: string;
  }): Promise<AuditLogListResult<T>> {
    // Los filtros son dinamicos (y pueden repetirse: `category=a&category=b`),
    // asi que se construyen como query plana y los arrays se repiten.
    const filters: Record<string, string | string[] | undefined> = {};
    Object.entries(params.filters).forEach(([key, value]) => {
      if (!value) return;
      filters[key === "actorUsername" ? "actor" : key] = value;
    });

    const result = await apiRequest<AuditLogListPayload>({
      method: "GET",
      url: "/api/audit-logs",
      params: {
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        cursor: params.cursor,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        ...filters,
      },
    });

    // El backend devuelve `{ items, total, page, totalPages }`; otras
    // envolturas (array suelto o `{ data: [...] }`) tambien se aceptan.
    const raw = (result.data ?? result) as AuditLogListPayload | AuditLog[];
    const payload: AuditLogListPayload = Array.isArray(raw) ? {} : raw;

    // Use 'items' from the standardized structure, or fallback to 'data' or the array itself
    let items = Array.isArray(raw) ? raw : payload.items || payload.data || [];

    // Ensure 'details' is parsed safely in all items
    if (Array.isArray(items)) {
      items = items.map((log: AuditLog) => {
        let parsedDetails = log.details;
        if (typeof log.details === "string") {
          try {
            parsedDetails = JSON.parse(log.details);
          } catch {
            // Parsing failed (e.g. plain text "ATENCIÓN..."), wrap it so it fits the Schema (object)
            parsedDetails = { message: log.details };
          }
        }
        return {
          ...log,
          details: parsedDetails,
        };
      });
    }

    // Return the full metadata object with the processed items
    return {
      ...(typeof payload === "object" ? payload : {}),
      // El `details` normalizado es un `AuditLog`; el consumidor puede
      // tipar el item con su propia forma (`T`).
      data: items as unknown as T[], // Map back to 'data' for compat with components
      total: payload.total ?? 0,
      page: payload.page ?? 0,
      totalPages: payload.totalPages ?? 0,
    };
  },

  async cleanup(months: number = 6): Promise<AuditActionResponse> {
    return apiRequest<AuditActionResponse>({
      method: "POST",
      url: "/api/audit-logs/cleanup",
      body: { months },
    });
  },

  async create(logData: Partial<AuditLog>): Promise<AuditActionResponse> {
    return apiRequest<AuditActionResponse>({
      method: "POST",
      url: "/api/audit-logs",
      body: logData,
    });
  },

  async verifyIntegrity(): Promise<AuditActionResponse> {
    return apiRequest<AuditActionResponse>({
      method: "GET",
      url: "/api/audit-logs/verify-integrity",
    });
  },

  async getIntegrityStatus(): Promise<AuditIntegrityStatus> {
    const result = await apiRequest<AuditIntegrityStatusResponse>({
      method: "GET",
      url: "/api/audit-logs/integrity-status",
    });

    return (result?.data || result) as AuditIntegrityStatus;
  },
};
