import { CorrectionRequest, CorrectionHistoryEvent } from "../types/index";
import { apiClient } from "./apiClient";

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
    const data = (await apiClient.get("/api/corrections" as never, {
      params: options,
    })) as { requests: ApiCorrectionRequest[]; total: number };

    const mappedRequests = (data.requests || []).map((item) => ({
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
    const item = (await apiClient.post("/api/corrections" as never, {
      body: request as never,
    })) as ApiCorrectionRequest;

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
    const item = (await apiClient.patch(`/api/corrections/${id}/status` as never, {
      body: { status, resolvedBy, rejectionReason } as never,
    })) as ApiCorrectionRequest;

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
    return apiClient.get("/api/corrections/stats" as never) as Promise<{
      pending: number;
      approved: number;
      rejected: number;
    }>;
  },

  async getHistory(id: string): Promise<CorrectionHistoryEvent[]> {
    const result = (await apiClient.get(`/api/corrections/${id}/history` as never)) as {
      data?: CorrectionHistoryEvent[];
    };
    return (result?.data || []) as CorrectionHistoryEvent[];
  },
};
