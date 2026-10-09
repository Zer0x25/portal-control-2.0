import { CorrectionRequest, CorrectionHistoryEvent } from "../types/index";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

const API_URL = `${API_BASE_URL}/corrections`;
type ApiCorrectionRequest = CorrectionRequest & {
  createdAt: string | number;
  resolvedAt?: string | number | null;
  updatedAt?: string | number;
};

export const correctionService = {
  async getAll(options?: {
    since?: number;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ requests: CorrectionRequest[]; total: number }> {
    let url = API_URL;
    const params = new URLSearchParams();
    if (options?.since) params.append("since", options.since.toString());
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.status) params.append("status", options.status);

    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) throw new Error("Error al obtener solicitudes");
    const data = await response.json();

    const mappedRequests = (data.requests as ApiCorrectionRequest[]).map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt).getTime(),
      resolvedAt: item.resolvedAt ? new Date(item.resolvedAt).getTime() : undefined,
      lastModified: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
      syncStatus: "synced" as const,
      isDeleted: false,
    }));

    return { requests: mappedRequests, total: data.total };
  },

  async create(request: CorrectionRequest): Promise<CorrectionRequest> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error del backend al crear solicitud:", errorData);
      throw new Error(errorData.message || "Error al crear solicitud");
    }
    const item = await response.json();
    return {
      ...item,
      createdAt: new Date(item.createdAt).getTime(),
      resolvedAt: item.resolvedAt ? new Date(item.resolvedAt).getTime() : undefined,
      lastModified: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
      syncStatus: "synced" as const,
      isDeleted: false,
    };
  },

  async updateStatus(
    id: string,
    status: string,
    resolvedBy: string,
    rejectionReason?: string,
  ): Promise<CorrectionRequest> {
    const response = await fetch(`${API_URL}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({ status, resolvedBy, rejectionReason }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Error al actualizar estado");
    }
    const item = await response.json();
    return {
      ...item,
      createdAt: new Date(item.createdAt).getTime(),
      resolvedAt: item.resolvedAt ? new Date(item.resolvedAt).getTime() : undefined,
      lastModified: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
      syncStatus: "synced" as const,
      isDeleted: false,
    };
  },

  async getStats(): Promise<{ pending: number; approved: number; rejected: number }> {
    const response = await fetch(`${API_URL}/stats`, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) throw new Error("Error al obtener estadísticas");
    return await response.json();
  },

  async getHistory(id: string): Promise<CorrectionHistoryEvent[]> {
    const response = await fetch(`${API_URL}/${id}/history`, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) throw new Error("Error al obtener historial de la solicitud");
    const result = await response.json();
    return (result?.data || []) as CorrectionHistoryEvent[];
  },
};
