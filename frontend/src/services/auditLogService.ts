import { apiClient } from "./apiClient";
import { AuditLog } from "../types/index";
import type { IntegrityStatusSnapshot } from "../hooks/queries/useIntegrityStatus";

export interface AuditLogsResult {
  data: AuditLog[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  [key: string]: unknown;
}

export const auditLogService = {
  async getAll(params: {
    page: number;
    pageSize: number;
    filters: Record<string, string | string[] | undefined>;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    cursor?: string;
  }): Promise<AuditLogsResult> {
    const queryParams: Record<string, unknown> = {
      page: params.page,
      pageSize: params.pageSize,
    };

    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

    // Builder for multidimensional/multiple filters
    Object.entries(params.filters).forEach(([key, value]) => {
      if (!value) return;
      const mappedKey = key === "actorUsername" ? "actor" : key;
      queryParams[mappedKey] = value;
    });

    const result = (await apiClient.get("/api/audit-logs" as never, {
      params: queryParams,
    })) as {
      data?: unknown;
      items?: unknown;
      total?: number;
      totalPages?: number;
      page?: number;
      pageSize?: number;
    };

    const data = result?.data || result;

    // Use 'items' from the standardized structure, or fallback to 'data' or the array itself
    let items = Array.isArray(data)
      ? data
      : (data as { items?: unknown; data?: unknown })?.items ||
        (data as { items?: unknown; data?: unknown })?.data ||
        [];

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
    const logItems = (Array.isArray(items) ? items : []) as AuditLog[];
    const metaObj = typeof data === "object" && data !== null ? data : {};
    return {
      total: (metaObj as { total?: number }).total ?? logItems.length,
      totalPages: (metaObj as { totalPages?: number }).totalPages ?? 1,
      page: params.page,
      pageSize: params.pageSize,
      ...metaObj,
      data: logItems,
    };
  },

  async cleanup(months: number = 6): Promise<{ message?: string; count?: number }> {
    return (await apiClient.post("/api/audit-logs/cleanup" as never, {
      body: { months } as never,
    })) as { message?: string; count?: number };
  },

  async create(logData: Partial<AuditLog>): Promise<AuditLog> {
    return (await apiClient.post("/api/audit-logs" as never, {
      body: logData as never,
    })) as AuditLog;
  },

  async verifyIntegrity(): Promise<{ message?: string; status?: string }> {
    return (await apiClient.get("/api/audit-logs/verify-integrity" as never)) as {
      message?: string;
      status?: string;
    };
  },

  async getIntegrityStatus(): Promise<IntegrityStatusSnapshot> {
    const result = (await apiClient.get("/api/audit-logs/integrity-status" as never)) as {
      data?: IntegrityStatusSnapshot;
    } & IntegrityStatusSnapshot;
    return (result?.data || result) as IntegrityStatusSnapshot;
  },
};
