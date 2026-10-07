import { MeterReadingItem } from "../types/index";
import { apiClient, Schema } from "./apiClient";

type SDKMeterReading = Schema<"MeterReading">;
type PaginatedMeterReadingResponse = Schema<"PaginatedMeterReadingResponse">;

export const meterService = {
  /**
   * Obtiene todas las lecturas de medidores.
   */
  async getAll(since?: number): Promise<MeterReadingItem[]> {
    const response = await apiClient.get("/api/meters", {
      params: since !== undefined ? { since: String(since) } : undefined,
    });

    // Both possible responses have a 'data' property which is an array of MeterReading
    const data = response.data || [];
    return data as unknown as MeterReadingItem[];
  },

  /**
   * Obtiene lecturas paginadas con filtros.
   */
  async getPaginated(
    page: number,
    pageSize: number,
    filters?: {
      month?: string;
      meterId?: string;
      startDate?: string;
      endDate?: string;
      since?: number;
    },
  ): Promise<{
    data: MeterReadingItem[];
    pagination: { total: number; page: number; totalPages: number };
  }> {
    const response = await apiClient.get("/api/meters", {
      params: {
        page: page,
        pageSize: pageSize,
        month: filters?.month,
        meterId: filters?.meterId,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        since: filters?.since !== undefined ? String(filters.since) : undefined,
      },
    });

    // Inspect if response is paginated or list. API client inference might return union.
    // Based on schema, if page/pageSize are sent, backend should return Paginated.
    // However, TypeScript treats it as Union.
    // We can assume it has pagination if we requested it, or check properties.
    const result = response as PaginatedMeterReadingResponse;

    return {
      data: (result.data || []) as unknown as MeterReadingItem[],
      pagination: result.pagination || { total: 0, page: 1, totalPages: 1 },
    };
  },

  /**
   * Guarda lecturas en lote.
   */
  async saveBulk(readings: Partial<MeterReadingItem>[]): Promise<MeterReadingItem[]> {
    const response = await apiClient.post("/api/meters/bulk", {
      body: readings as unknown as SDKMeterReading[],
    });

    const data = response.data || [];
    return data as unknown as MeterReadingItem[];
  },
};
