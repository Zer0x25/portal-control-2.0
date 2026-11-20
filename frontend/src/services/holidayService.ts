import { Holiday } from "../types/index";
import { request as apiRequest } from "./apiClient";
import { BulkCreateHolidayPayload, PaginatedResponse } from "../types/scheduling";

export type CreateHolidayPayload = Pick<Holiday, "name" | "date" | "type" | "isRenounceable"> & {
  id?: string;
};

export type UpdateHolidayPayload = Partial<
  Pick<Holiday, "name" | "date" | "type" | "isRenounceable">
>;

/** Resultado de la sincronizacion de feriados externos. */
export interface HolidaySyncResult {
  success: boolean;
  total: number;
  year: number;
}

export const holidayService = {
  async getAll(since?: number): Promise<Holiday[]> {
    return apiRequest<Holiday[]>({
      method: "GET",
      url: "/api/holidays",
      params: { since: since || undefined },
    });
  },

  async getAllPaginated(options: {
    page: number;
    pageSize: number;
    search?: string;
    showArchived?: boolean;
  }): Promise<PaginatedResponse<Holiday>> {
    return apiRequest<PaginatedResponse<Holiday>>({
      method: "GET",
      url: "/api/holidays",
      params: {
        page: String(options.page),
        pageSize: String(options.pageSize),
        search: options.search,
        showArchived: options.showArchived !== undefined ? String(options.showArchived) : undefined,
      },
    });
  },

  async save(holiday: Holiday): Promise<Holiday> {
    return apiRequest<Holiday>({
      method: "POST",
      url: "/api/holidays",
      body: holiday,
    });
  },

  async create(holiday: CreateHolidayPayload): Promise<Holiday> {
    return apiRequest<Holiday>({
      method: "POST",
      url: "/api/holidays",
      body: holiday,
    });
  },

  async update(id: string, holiday: UpdateHolidayPayload): Promise<Holiday> {
    // El backend actualiza por `id` en el cuerpo (no por ruta).
    return apiRequest<Holiday>({
      method: "POST",
      url: "/api/holidays",
      body: { ...holiday, id },
    });
  },

  async bulkCreate(holidays: BulkCreateHolidayPayload[]): Promise<{ count: number }> {
    return apiRequest<{ count: number }>({
      method: "POST",
      url: "/api/holidays/bulk",
      body: holidays,
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>({
      method: "DELETE",
      url: "/api/holidays/{id}",
      path: { id },
    });
  },

  async syncExternalHolidays(year = new Date().getFullYear()): Promise<HolidaySyncResult> {
    return apiRequest<HolidaySyncResult>({
      method: "POST",
      url: "/api/holidays/sync",
      body: { year },
    });
  },
};
