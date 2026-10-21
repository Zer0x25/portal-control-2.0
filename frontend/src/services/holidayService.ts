import { Holiday } from "../types/index";
import { apiClient } from "./apiClient";
import { BulkCreateHolidayPayload, PaginatedResponse } from "../types/scheduling";

export type CreateHolidayPayload = Pick<Holiday, "name" | "date" | "type"> & { id?: string };

export const holidayService = {
  async getAll(since?: number): Promise<Holiday[]> {
    return (await apiClient.get("/api/holidays" as never, {
      params: since ? { since } : undefined,
    })) as Holiday[];
  },

  async getAllPaginated(options: {
    page: number;
    pageSize: number;
    search?: string;
    showArchived?: boolean;
  }): Promise<PaginatedResponse<Holiday>> {
    return (await apiClient.get("/api/holidays" as never, {
      params: {
        page: options.page,
        pageSize: options.pageSize,
        search: options.search,
        showArchived: options.showArchived,
      },
    })) as PaginatedResponse<Holiday>;
  },

  async save(holiday: Holiday): Promise<Holiday> {
    return (await apiClient.post("/api/holidays" as never, {
      body: holiday as never,
    })) as Holiday;
  },

  async create(holiday: CreateHolidayPayload): Promise<Holiday> {
    return (await apiClient.post("/api/holidays" as never, {
      body: holiday as never,
    })) as Holiday;
  },

  async update(
    id: string,
    holiday: Partial<Pick<Holiday, "name" | "date" | "type">>,
  ): Promise<Holiday> {
    return (await apiClient.post("/api/holidays" as never, {
      body: { ...holiday, id } as never,
    })) as Holiday;
  },

  async bulkCreate(holidays: BulkCreateHolidayPayload[]): Promise<{ count: number }> {
    return (await apiClient.post("/api/holidays/bulk" as never, {
      body: holidays as never,
    })) as { count: number };
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/holidays/${id}` as never);
  },

  async syncExternalHolidays(year = new Date().getFullYear()): Promise<{
    total: number;
    added: number;
    skipped: number;
  }> {
    try {
      return (await apiClient.post("/api/holidays/sync" as never, {
        body: { year } as never,
      })) as {
        total: number;
        added: number;
        skipped: number;
      };
    } catch {
      throw new Error("Error al sincronizar feriados externos");
    }
  },
};
