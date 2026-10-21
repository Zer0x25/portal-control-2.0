import { useQuery } from "@tanstack/react-query";
import { employeeService } from "../../services/employeeService";
import { authService } from "../../services/authService";
import { Employee } from "../../types";

/**
 * Colección remota de empleados (spec 032 T5): única fuente, sin espejo en
 * Zustand ni escritura manual a IndexedDB. El persist cache de queries la
 * sirve offline y el logout la purga.
 */
export const useEmployeesQuery = () => {
  const hasToken = !!authService.getToken();

  return useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const employees = await employeeService.getAll();
      return employees.filter((employee) => !employee.isDeleted);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: hasToken,
  });
};

/**
 * Lista reducida para el kiosk: igual criterio que el servicio, pero como
 * query para que el modo sin red sirva desde el cache persistido (AC3).
 */
export const useKioskEmployeesQuery = () => {
  const hasToken = !!authService.getToken();

  return useQuery<Employee[]>({
    queryKey: ["employees", "kiosk"],
    queryFn: () => employeeService.getKioskEmployees(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: hasToken,
  });
};
