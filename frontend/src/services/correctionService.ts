import { CorrectionRequest, CorrectionHistoryEvent } from "../types/index";
import { request as apiRequest } from "./apiClient";

type ApiCorrectionRequest = CorrectionRequest & {
  createdAt: string | number;
  resolvedAt?: string | number | null;
  updatedAt?: string | number;
};

/**
 * El contrato OpenAPI del modulo de correcciones esta **desfasado** respecto a
 * la implementacion del backend (`GET /api/corrections` devuelve
 * `{ requests, total }` y `GET /api/corrections/stats` devuelve
 * `{ pending, approved, rejected }`, no las envolturas `{ data }` del
 * swagger). El service declara por eso sus propias formas de respuesta en
 * lugar de usar `paths[P]`: la migracion no puede cambiar el contrato
 * publico (spec 034, T9).
 */
interface CorrectionListResponse {
  requests: ApiCorrectionRequest[];
  total: number;
}

interface CorrectionStatsResponse {
  pending: number;
  approved: number;
  rejected: number;
}

interface CorrectionHistoryResponse {
  data?: CorrectionHistoryEvent[];
}

/** Normaliza la fila del backend al modelo que consume el frontend. */
const toCorrectionRequest = (item: ApiCorrectionRequest): CorrectionRequest => ({
  ...item,
  createdAt: new Date(item.createdAt).getTime(),
  resolvedAt: item.resolvedAt ? new Date(item.resolvedAt).getTime() : undefined,
  lastModified: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
  syncStatus: "synced" as const,
  isDeleted: false,
});

export const correctionService = {
  async getAll(options?: {
    since?: number;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ requests: CorrectionRequest[]; total: number }> {
    const data = await apiRequest<CorrectionListResponse>({
      method: "GET",
      url: "/api/corrections",
      params: {
        // `|| undefined` conserva el filtrado del codigo anterior: un 0 no
        // se enviaia (no es un delta ni un offset valido).
        since: options?.since || undefined,
        limit: options?.limit || undefined,
        offset: options?.offset || undefined,
        status: options?.status,
      },
    });

    const mappedRequests = data.requests.map(toCorrectionRequest);

    return { requests: mappedRequests, total: data.total };
  },

  async create(request: CorrectionRequest): Promise<CorrectionRequest> {
    const item = await apiRequest<ApiCorrectionRequest>({
      method: "POST",
      url: "/api/corrections",
      body: request,
    });

    return toCorrectionRequest(item);
  },

  async updateStatus(
    id: string,
    status: string,
    resolvedBy: string,
    rejectionReason?: string,
  ): Promise<CorrectionRequest> {
    const item = await apiRequest<ApiCorrectionRequest>({
      method: "PATCH",
      url: "/api/corrections/{id}/status",
      path: { id },
      body: { status, resolvedBy, rejectionReason },
    });

    return toCorrectionRequest(item);
  },

  async getStats(): Promise<{ pending: number; approved: number; rejected: number }> {
    return apiRequest<CorrectionStatsResponse>({
      method: "GET",
      url: "/api/corrections/stats",
    });
  },

  async getHistory(id: string): Promise<CorrectionHistoryEvent[]> {
    const result = await apiRequest<CorrectionHistoryResponse>({
      method: "GET",
      url: "/api/corrections/{id}/history",
      path: { id },
    });

    return result?.data || [];
  },
};
