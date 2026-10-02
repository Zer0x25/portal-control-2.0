import { Employee } from "../types/index";
import { apiClient, Schema } from "./apiClient";

type EmployeeSchema = Schema<"Employee">;
type PaginatedEmployeeResponse = {
  data: EmployeeSchema[];
  pagination: { total: number; page: number; totalPages: number };
};

export const employeeService = {
  /**
   * Obtiene todos los empleados, soportando filtro 'since'.
   */
  async getAll(since?: number): Promise<Employee[]> {
    const response = await apiClient.get("/api/employees", {
      params: since ? { since: String(since) } : undefined,
    });
    return response as unknown as Employee[];
  },

  /**
   * Obtiene empleados paginados con filtros.
   */
  async getPaginated(
    page: number,
    pageSize: number,
    filters?: { search?: string; status?: string; area?: string },
  ): Promise<{
    data: Employee[];
    pagination: { total: number; page: number; totalPages: number };
  }> {
    const response = await apiClient.get("/api/employees", {
      params: {
        page,
        pageSize,
        search: filters?.search,
        status: filters?.status,
        area: filters?.area,
      },
    });

    const typedResponse = response as unknown as PaginatedEmployeeResponse;
    return {
      data: typedResponse.data as unknown as Employee[],
      pagination: typedResponse.pagination,
    };
  },

  /**
   * Obtiene lista de empleados para modo Kiosko.
   */
  async getKioskEmployees(): Promise<Employee[]> {
    const response = await apiClient.get("/api/employees/kiosk");
    return response as unknown as Employee[];
  },

  /**
   * Crea un nuevo empleado.
   */
  async create(employee: Employee): Promise<Employee> {
    const response = await apiClient.post("/api/employees", {
      body: employee as unknown as EmployeeSchema,
    });
    return response as unknown as Employee;
  },

  /**
   * Actualiza un empleado existente.
   */
  async update(id: string, employee: Partial<Employee>): Promise<Employee> {
    const response = await apiClient.put("/api/employees/{id}", {
      path: { id },
      body: employee as unknown as EmployeeSchema,
    });
    return response as unknown as Employee;
  },

  /**
   * Importación masiva de empleados.
   */
  async createBulk(employees: Employee[]): Promise<{ count: number }> {
    const response = await apiClient.post("/api/employees/bulk", {
      body: employees as unknown as EmployeeSchema[],
    });
    return response as unknown as { count: number };
  },
};
