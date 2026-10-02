import { AttendanceRecord, DailyTimeRecord } from "../types";
import { apiClient } from "./apiClient";
import { API_BASE_URL } from "./apiBase";

const RECORDS_ENDPOINT = "/api/records";
type ForcedPunchType = "entrada" | "inicioColacion" | "finColacion" | "salida";
type AnomalyResolution =
  | "ABSENCE_MARK"
  | "SHIFT_HOURS_ACK"
  | "PERMIT_MARK"
  | "DAY_OFF_MARK"
  | "VACATION_MARK";

export interface TimeRecordQueryParams {
  page?: number;
  pageSize?: number;
  since?: string | number;
  filters?: Record<string, string | number | boolean | null | undefined>;
}

interface TimeRecordsResult {
  data: AttendanceRecord[];
  total: number;
  totalPages: number;
}

interface BulkSaveResult {
  success: boolean;
  count: number;
}

interface PunchResponse {
  success: boolean;
  action: string;
  record: AttendanceRecord;
  timestamp: string;
}

const isRecordArray = (value: unknown): value is AttendanceRecord[] => Array.isArray(value);

const isTimeRecordsResult = (value: unknown): value is TimeRecordsResult => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    data?: unknown;
    total?: unknown;
    totalPages?: unknown;
  };
  return (
    isRecordArray(candidate.data) &&
    typeof candidate.total === "number" &&
    typeof candidate.totalPages === "number"
  );
};

const isBulkSaveResult = (value: unknown): value is BulkSaveResult => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { success?: unknown; count?: unknown };
  return typeof candidate.success === "boolean" && typeof candidate.count === "number";
};

const isPunchResponse = (value: unknown): value is PunchResponse => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    success?: unknown;
    action?: unknown;
    record?: unknown;
    timestamp?: unknown;
  };
  return (
    typeof candidate.success === "boolean" &&
    typeof candidate.action === "string" &&
    typeof candidate.timestamp === "string" &&
    !!candidate.record &&
    typeof candidate.record === "object"
  );
};

const normalizeForcedType = (forcedType?: string): ForcedPunchType | undefined => {
  if (!forcedType) return undefined;

  const mapping: Record<string, ForcedPunchType> = {
    // Canonical API values
    entrada: "entrada",
    salida: "salida",
    inicioColacion: "inicioColacion",
    finColacion: "finColacion",
    // Backward-compatible aliases used in parts of the frontend
    inicio_colacion: "inicioColacion",
    fin_colacion: "finColacion",
    colacion_inicio: "inicioColacion",
    colacion_fin: "finColacion",
  };

  return mapping[forcedType];
};

export const timeRecordService = {
  async getAll(params: TimeRecordQueryParams = {}): Promise<TimeRecordsResult> {
    const queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = params.page.toString();
    if (params.pageSize) queryParams.pageSize = params.pageSize.toString();
    if (params.since) queryParams.since = params.since.toString();
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams[key] = String(value);
        }
      });
    }

    const response = await apiClient.get(RECORDS_ENDPOINT, {
      params: queryParams,
    });
    const payload: unknown = response;

    // Accept both plain and envelope formats defensively.
    const normalized = isTimeRecordsResult(payload)
      ? payload
      : payload &&
          typeof payload === "object" &&
          "data" in payload &&
          isTimeRecordsResult((payload as { data?: unknown }).data)
        ? (payload as { data: TimeRecordsResult }).data
        : null;

    if (!normalized) {
      console.error("[timeRecordService.getAll] Unexpected response shape:", payload);
      throw new Error("Respuesta invalida de /api/records");
    }

    return {
      data: normalized.data,
      total: Number(normalized.total) || 0,
      totalPages: Number(normalized.totalPages) || 1,
    };
  },

  async getExportData(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const response = await apiClient.get(`${RECORDS_ENDPOINT}/export`, {
      params: { startDate, endDate },
    });

    if (isRecordArray(response)) return response;
    throw new Error("Respuesta invalida de /api/records/export");
  },

  getExportUrl(startDate: string, endDate: string, format: "csv" | "xml" | "json" = "csv"): string {
    const query = new URLSearchParams({
      startDate,
      endDate,
      format,
    });
    return `${API_BASE_URL}/records/export?${query.toString()}`;
  },

  async save(record: DailyTimeRecord): Promise<AttendanceRecord> {
    const response = await apiClient.post(RECORDS_ENDPOINT, {
      body: record,
    });

    if (response && typeof response === "object") return response as AttendanceRecord;
    throw new Error("Respuesta invalida al guardar registro");
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${RECORDS_ENDPOINT}/{id}`, {
      path: { id },
    });
  },

  async bulkSave(records: DailyTimeRecord[]): Promise<BulkSaveResult> {
    const response = await apiClient.post(`${RECORDS_ENDPOINT}/bulk`, {
      body: records,
    });

    if (isBulkSaveResult(response)) return response;
    throw new Error("Respuesta invalida en guardado masivo");
  },

  async punch(
    employeeId: string,
    source: string = "WEB",
    forcedType?: string,
    geolocation?: { latitude: number; longitude: number },
  ): Promise<PunchResponse> {
    const normalizedForcedType = normalizeForcedType(forcedType);

    const body: {
      employeeId: string;
      source: string;
      forcedType?: ForcedPunchType;
      latitude?: number;
      longitude?: number;
    } = {
      employeeId,
      source,
      forcedType: normalizedForcedType,
    };

    if (geolocation) {
      body.latitude = geolocation.latitude;
      body.longitude = geolocation.longitude;
    }

    const response = await apiClient.post(`${RECORDS_ENDPOINT}/punch`, {
      body,
    });

    if (isPunchResponse(response)) return response;
    throw new Error("Respuesta invalida al registrar marcaje");
  },

  async resolveAnomaly(id: string, resolution: AnomalyResolution): Promise<AttendanceRecord> {
    const response = await apiClient.post(`${RECORDS_ENDPOINT}/{id}/resolve-anomaly`, {
      path: { id },
      body: { resolution },
    });

    if (response && typeof response === "object") return response as AttendanceRecord;
    throw new Error("Respuesta invalida al resolver anomalía");
  },
};
