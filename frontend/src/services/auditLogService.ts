import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";
import { AuditLog } from "../types/index";

const API_URL = `${API_BASE_URL}/audit-logs`;

export const auditLogService = {
  async getAll(params: {
    page: number;
    pageSize: number;
    filters: Record<string, string | string[] | undefined>;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    cursor?: string;
  }) {
    const query = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });

    if (params.cursor) query.set("cursor", params.cursor);

    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);

    // Builder for multidimensional/multiple filters
    Object.entries(params.filters).forEach(([key, value]) => {
      if (!value) return;

      const mappedKey = key === "actorUsername" ? "actor" : key;

      if (Array.isArray(value)) {
        value.forEach((val) => query.append(mappedKey, val));
      } else {
        query.set(mappedKey, value as string);
      }
    });

    const response = await fetch(`${API_URL}?${query.toString()}`, {
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });
    if (!response.ok) throw new Error("Failed to fetch audit logs");

    const result = await response.json();
    const data = result.data || result;

    // Use 'items' from the standardized structure, or fallback to 'data' or the array itself
    let items = Array.isArray(data) ? data : data.items || data.data || [];

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
      ...(typeof data === "object" ? data : {}),
      data: items, // Map back to 'data' for compat with components
    };
  },

  async cleanup(months: number = 6) {
    const response = await fetch(`${API_URL}/cleanup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({ months }),
    });
    if (!response.ok) throw new Error("Failed to cleanup audit logs");
    return response.json();
  },

  async create(logData: Partial<AuditLog>) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(logData),
    });
    if (!response.ok) throw new Error("Failed to create audit log");
    return response.json();
  },

  async verifyIntegrity() {
    const response = await fetch(`${API_URL}/verify-integrity`, {
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });
    if (!response.ok) throw new Error("Failed to verify integrity");
    return response.json();
  },

  async getIntegrityStatus() {
    const response = await fetch(`${API_URL}/integrity-status`, {
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
    });
    if (!response.ok) throw new Error("Failed to fetch integrity status");
    const result = await response.json();
    return result.data || result;
  },
};
