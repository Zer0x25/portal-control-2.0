import { MeterReadingItem } from "../types/index";
import { apiClient, Schema } from "./apiClient";

type SDKMeterReading = Schema<"MeterReading">;
type PaginatedMeterReadingResponse = Schema<"PaginatedMeterReadingResponse">;

type MeterReadingPayload = SDKMeterReading & {
  normalizedValue?: number;
  delta?: number;
  eventType?: MeterReadingItem["eventType"];
  previousReadingId?: string;
};

const toMeterReadingItem = (raw: MeterReadingPayload): MeterReadingItem => {
  const parsedTimestamp =
    typeof raw.timestamp === "number"
      ? raw.timestamp
      : raw.timestamp
        ? new Date(raw.timestamp).getTime()
        : Date.now();
  const safeTimestamp = Number.isNaN(parsedTimestamp) ? Date.now() : parsedTimestamp;
  return {
    id: raw.id ?? "",
    meterConfigId: raw.meterConfigId,
    timestamp: safeTimestamp,
    authorUsername: raw.authorUsername,
    value: raw.value,
    isRecharge: Boolean(raw.isRecharge),
    normalizedValue: raw.normalizedValue ?? raw.value,
    delta: raw.delta ?? 0,
    eventType: raw.eventType ?? "UNKNOWN",
    previousReadingId: raw.previousReadingId,
    syncStatus: (raw.syncStatus as MeterReadingItem["syncStatus"]) ?? "synced",
    lastModified: raw.lastModified ?? safeTimestamp,
    isDeleted: Boolean(raw.isDeleted),
  };
};

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
    return data.map(toMeterReadingItem);
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
    // Los filtros vacíos ("") deben omitirse del query: el backend valida
    // `min(1)` y responde 400 ante `?meterId=&startDate=&endDate=`.
    // `buildQuery` ya excluye `undefined`/`null`.
    const clean = (v: string | undefined): string | undefined => {
      const t = v?.trim();
      return t ? t : undefined;
    };
    const response = await apiClient.get("/api/meters", {
      params: {
        page: page,
        pageSize: pageSize,
        month: clean(filters?.month),
        meterId: clean(filters?.meterId),
        startDate: clean(filters?.startDate),
        endDate: clean(filters?.endDate),
        since: filters?.since !== undefined ? String(filters.since) : undefined,
      },
    });

    // Inspect if response is paginated or list. API client inference might return union.
    // Based on schema, if page/pageSize are sent, backend should return Paginated.
    // However, TypeScript treats it as Union.
    // We can assume it has pagination if we requested it, or check properties.
    const result = response as PaginatedMeterReadingResponse;

    return {
      data: (result.data || []).map(toMeterReadingItem),
      pagination: result.pagination || { total: 0, page: 1, totalPages: 1 },
    };
  },

  /**
   * Guarda lecturas en lote.
   */
  async saveBulk(readings: SDKMeterReading[]): Promise<MeterReadingItem[]> {
    const response = await apiClient.post("/api/meters/bulk", {
      body: readings,
    });

    const data = response.data || [];
    return data.map(toMeterReadingItem);
  },
};
