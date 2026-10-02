import { apiClient } from "./apiClient";
import { LeaveRecord, PaginationOptions, PaginatedResponse } from "../types/scheduling";

// type LeaveRecord = components["schemas"]["LeaveRecord"];

export const leaveService = {
  /**
   * Obtiene lista de ausencias/permisos paginada.
   */
  async getLeaves(options: PaginationOptions = {}): Promise<PaginatedResponse<LeaveRecord>> {
    const response = await apiClient.get("/api/leaves", {
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
    return response as unknown as PaginatedResponse<LeaveRecord>;
  },

  /**
   * Obtiene todas las licencias, soportando filtro 'since' (vía wrapper).
   */
  async getAll(since?: number): Promise<PaginatedResponse<LeaveRecord>> {
    return this.getLeaves({ since: since?.toString() });
  },

  /**
   * Registra una nueva ausencia o permiso.
   */
  async createLeave(
    leave: Omit<LeaveRecord, "id" | "lastModified" | "syncStatus" | "isDeleted"> & { id?: string },
  ): Promise<LeaveRecord> {
    const response = await apiClient.post("/api/leaves", {
      body: leave as unknown as never,
    });
    return response.data! as unknown as LeaveRecord;
  },

  /**
   * Elimina un registro de ausencia.
   */
  async deleteLeave(id: string): Promise<void> {
    await apiClient.delete("/api/leaves/{id}", {
      path: { id },
    });
  },
};
