import { apiClient } from "./apiClient";
import {
  TheoreticalShiftPattern,
  AssignedShift,
  ScheduleInfo,
  PaginationOptions,
  PaginatedResponse,
} from "../types/scheduling";

interface ShiftPatternsPaginatedOptions {
  page: number;
  pageSize: number;
  showArchived?: boolean;
  search?: string;
}

interface BulkCountResponse {
  count: number;
}

interface SuggestedPatternNameResponse {
  suggestedName: string;
}

type ScheduleMatrix = Record<string, Record<string, ScheduleInfo>>;
type MonthlyPlanPayload = Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const isPaginatedResponse = <T>(value: unknown): value is PaginatedResponse<T> => {
  if (!isObject(value)) return false;
  if (!Array.isArray(value.data)) return false;
  if (!isObject(value.meta)) return false;
  return (
    typeof value.meta.total === "number" &&
    typeof value.meta.page === "number" &&
    typeof value.meta.pageSize === "number" &&
    typeof value.meta.totalPages === "number"
  );
};

const hasCount = (value: unknown): value is BulkCountResponse =>
  isObject(value) && typeof value.count === "number";

const hasSuggestedName = (value: unknown): value is SuggestedPatternNameResponse =>
  isObject(value) && typeof value.suggestedName === "string";

const isScheduleMatrix = (value: unknown): value is ScheduleMatrix => {
  if (!isObject(value)) return false;
  return Object.values(value).every((inner) => isObject(inner));
};

export const shiftService = {
  async getPatterns(
    options: {
      since?: number;
      showArchived?: boolean;
    } = {},
  ): Promise<TheoreticalShiftPattern[]> {
    const response = await apiClient.get("/api/shifts/patterns", {
      params: {
        since: options.since?.toString(),
        showArchived: options.showArchived,
      },
    });
    if (Array.isArray(response)) return response as TheoreticalShiftPattern[];
    throw new Error("Respuesta invalida de patrones de turno");
  },

  async getPatternsPaginated(
    options: ShiftPatternsPaginatedOptions,
  ): Promise<PaginatedResponse<TheoreticalShiftPattern>> {
    const response = await apiClient.get("/api/shifts/patterns", {
      params: {
        page: options.page,
        pageSize: options.pageSize,
        showArchived: options.showArchived,
        search: options.search,
      } as unknown as never,
    });
    if (isPaginatedResponse<TheoreticalShiftPattern>(response)) return response;
    throw new Error("Respuesta paginada invalida de patrones");
  },

  async savePattern(pattern: TheoreticalShiftPattern): Promise<TheoreticalShiftPattern> {
    const response = await apiClient.post("/api/shifts/patterns", {
      body: pattern as unknown as never,
    });
    if (isObject(response)) return response as TheoreticalShiftPattern;
    throw new Error("Respuesta invalida al crear patrón");
  },

  async updatePattern(pattern: TheoreticalShiftPattern): Promise<TheoreticalShiftPattern> {
    const response = await apiClient.put("/api/shifts/patterns/{id}", {
      path: { id: pattern.id },
      body: pattern as unknown as never,
    });
    if (isObject(response)) return response as TheoreticalShiftPattern;
    throw new Error("Respuesta invalida al actualizar patrón");
  },

  async deletePattern(id: string): Promise<void> {
    await apiClient.delete("/api/shifts/patterns/{id}", {
      path: { id },
    });
  },

  async getAssignments(options: PaginationOptions = {}): Promise<PaginatedResponse<AssignedShift>> {
    const response = await apiClient.get("/api/shifts/assignments", {
      params: {
        page: options.page,
        pageSize: options.pageSize,
        startDate: options.startDate,
        endDate: options.endDate,
        employeeId: options.employeeId,
        since: options.since,
        showArchived: options.showArchived,
      },
    });
    if (isPaginatedResponse<AssignedShift>(response)) return response;
    throw new Error("Respuesta paginada invalida de asignaciones");
  },

  async assignShift(assignment: AssignedShift): Promise<AssignedShift> {
    const response = await apiClient.post("/api/shifts/assignments", {
      body: assignment as unknown as never,
    });
    if (isObject(response)) return response as AssignedShift;
    throw new Error("Respuesta invalida al asignar turno");
  },

  async updateAssignment(id: string, assignment: AssignedShift): Promise<AssignedShift> {
    const response = await apiClient.put("/api/shifts/assignments/{id}", {
      path: { id },
      body: assignment as unknown as never,
    });
    if (isObject(response)) return response as AssignedShift;
    throw new Error("Respuesta invalida al actualizar asignación");
  },

  async deleteAssignment(id: string): Promise<void> {
    await apiClient.delete("/api/shifts/assignments/{id}", {
      path: { id },
    });
  },

  async bulkSavePatterns(patterns: TheoreticalShiftPattern[]): Promise<BulkCountResponse> {
    const response = await apiClient.post("/api/shifts/patterns/bulk", {
      body: patterns as unknown as never,
    });
    if (hasCount(response)) return response;
    throw new Error("Respuesta invalida en guardado masivo de patrones");
  },

  async bulkSaveAssignments(assignments: AssignedShift[]): Promise<BulkCountResponse> {
    const response = await apiClient.post("/api/shifts/assignments/bulk", {
      body: assignments as unknown as never,
    });
    if (hasCount(response)) return response;
    throw new Error("Respuesta invalida en guardado masivo de asignaciones");
  },

  async getCalendarMatrix(
    startDate: string,
    endDate: string,
    employeeIds?: string[],
  ): Promise<ScheduleMatrix> {
    const response = await apiClient.post("/api/shifts/schedule/matrix", {
      body: { startDate, endDate, employeeIds },
    });
    if (isScheduleMatrix(response)) return response;
    throw new Error("Respuesta invalida de matriz de calendario");
  },

  async createMonthlyPlan(planData: MonthlyPlanPayload): Promise<void> {
    await apiClient.post("/api/shifts/monthly-plan", {
      body: planData as unknown as never,
    });
  },

  async getSuggestedPatternName(employeeId: string, year: number, month: number): Promise<string> {
    const response = await apiClient.get("/api/shifts/suggest-pattern-name", {
      params: {
        employeeId,
        year: year.toString(),
        month: month.toString(),
      },
    });
    if (hasSuggestedName(response)) return response.suggestedName;
    throw new Error("Respuesta invalida para nombre sugerido de patrón");
  },
};
