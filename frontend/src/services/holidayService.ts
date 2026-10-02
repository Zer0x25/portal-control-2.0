import { Holiday } from "../types/index";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";
import { BulkCreateHolidayPayload, PaginatedResponse } from "../types/scheduling";

export type CreateHolidayPayload = Pick<Holiday, "name" | "date" | "type"> & { id?: string };

const API_URL = `${API_BASE_URL}/holidays`;

export const holidayService = {
  async getAll(since?: number): Promise<Holiday[]> {
    const url = since ? `${API_URL}?since=${since}` : API_URL;
    const response = await fetch(url, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error("Error al obtener feriados");
    }
    return response.json();
  },

  async getAllPaginated(options: {
    page: number;
    pageSize: number;
    search?: string;
    showArchived?: boolean;
  }): Promise<PaginatedResponse<Holiday>> {
    const params = new URLSearchParams({
      page: String(options.page),
      pageSize: String(options.pageSize),
    });
    if (options.search) params.set("search", options.search);
    if (options.showArchived !== undefined)
      params.set("showArchived", String(options.showArchived));

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error("Error al obtener feriados");
    }
    return response.json();
  },

  async save(holiday: Holiday): Promise<Holiday> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(holiday),
    });
    if (!response.ok) {
      throw new Error("Error al guardar feriado");
    }
    return response.json();
  },

  async create(holiday: CreateHolidayPayload): Promise<Holiday> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(holiday),
    });
    if (!response.ok) {
      throw new Error("Error al guardar feriado");
    }
    return response.json();
  },

  async update(
    id: string,
    holiday: Partial<Pick<Holiday, "name" | "date" | "type">>,
  ): Promise<Holiday> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({ ...holiday, id }),
    });
    if (!response.ok) {
      throw new Error("Error al actualizar feriado");
    }
    return response.json();
  },

  async bulkCreate(holidays: BulkCreateHolidayPayload[]): Promise<{ count: number }> {
    const response = await fetch(`${API_URL}/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify(holidays),
    });
    if (!response.ok) {
      throw new Error("Error en carga masiva de feriados");
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error("Error al eliminar feriado");
    }
  },

  async syncExternalHolidays(): Promise<{
    total: number;
    added: number;
    skipped: number;
  }> {
    const response = await fetch(`${API_URL}/sync`, {
      method: "POST",
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error("Error al sincronizar feriados externos");
    }
    return response.json();
  },
};
