import { apiClient } from "./apiClient";
import type { User } from "../types";

export const userService = {
  /**
   * Obtiene todos los usuarios, soportando filtro 'since' y deduplicación.
   */
  async getAll(since?: number): Promise<User[]> {
    const response = await apiClient.get("/api/users", {
      params: since ? { since: String(since) } : undefined,
    });

    // Handle OneOf response (Array or Paginated Object)
    let users: User[] = [];
    if (Array.isArray(response)) {
      users = response as unknown as User[];
    } else if (response && typeof response === "object" && "data" in response) {
      users = (response as { data: User[] }).data;
    }

    // Deduplicate by username (legacy behavior preserved)
    const uniqueUsers = Array.from(new Map(users.map((u) => [u.username, u])).values());
    return uniqueUsers;
  },

  /**
   * Obtiene usuarios paginados con filtros.
   */
  async getPaginated(page: number, pageSize: number, filters?: { search?: string; role?: string }) {
    const response = await apiClient.get("/api/users", {
      params: {
        page,
        pageSize,
        search: filters?.search,
        role: filters?.role === "Todos" ? undefined : filters?.role,
      },
    });

    // Cast response to expected paginated format
    // Use unknown first to avoid intersection issues
    const resObj = response as unknown as {
      data: User[];
      pagination: { total: number; page: number; totalPages: number };
    };

    return {
      data: resObj.data,
      pagination: resObj.pagination,
    };
  },

  /**
   * Crea un nuevo usuario.
   */
  async create(user: Partial<User>): Promise<User> {
    const response = await apiClient.post("/api/users", {
      body: user as unknown as User, // Schema match logic handled by backend validation
    });
    return response as unknown as User;
  },

  /**
   * Actualiza un usuario existente.
   */
  async update(id: string, user: Partial<User>): Promise<User> {
    const response = await apiClient.put("/api/users/{id}", {
      path: { id },
      body: user as unknown as never, // Cast to satisfy API client strict generic mismatch
    });
    return response as unknown as User;
  },

  /**
   * Elimina un usuario.
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete("/api/users/{id}", {
      path: { id },
    });
  },
};
