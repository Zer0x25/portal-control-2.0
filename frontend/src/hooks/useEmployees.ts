import { useQueryClient } from "@tanstack/react-query";
import { useToasts } from "./useToasts";
import { useEmployeesQuery, useKioskEmployeesQuery } from "./queries/useEmployeesQuery";
import { useStore } from "../store/useStore";
import { timeRecordService } from "../services/timeRecordService";
import { employeeService } from "../services/employeeService";
import { Employee, EmployeeStatus } from "../types";
import { useEffect } from "react";
import { queryKeys } from "../lib/queryKeys";

const EMPTY_EMPLOYEES: Employee[] = [];

/**
 * Empleados: única fuente = `useEmployeesQuery` (spec 032 T5).
 * El store deja de duplicar la colección ni a escribir IndexedDB; cada
 * acción invalida `employees` para que react-query refresque.
 */
export const useEmployees = (_isKiosk: boolean = false, options: { enabled?: boolean } = {}) => {
  const currentUser = useStore((state) => state.currentUser);

  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const employeesQuery = useEmployeesQuery(!_isKiosk && (options.enabled ?? true));
  const kioskQuery = useKioskEmployeesQuery(_isKiosk);

  const invalidateEmployees = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.employees() });

  const allEmployees = employeesQuery.data ?? EMPTY_EMPLOYEES;
  const isLoading = employeesQuery.isLoading;

  const kioskEmployees = kioskQuery.data ?? EMPTY_EMPLOYEES;
  const isLoadingKioskEmployees = kioskQuery.isLoading;

  useEffect(() => {
    if (!_isKiosk || !kioskQuery.isError) return;
    const message =
      kioskQuery.error instanceof Error ? kioskQuery.error.message : "Error al cargar empleados";
    addToast(message, "error");
  }, [_isKiosk, kioskQuery.isError, kioskQuery.error, addToast]);

  const data = (() => {
    if (_isKiosk) {
      const activeForWork = kioskEmployees
        .filter((e) => e.status === "Activo")
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        all: kioskEmployees,
        active: activeForWork,
        activeForWork,
        archived: [],
        archivedCount: 0,
      };
    }

    // Selection logic remains the same
    const allActiveStatus: EmployeeStatus[] = ["Activo"];
    let baseActiveAndVisible = allEmployees.filter(
      (e) => e.status && allActiveStatus.includes(e.status),
    );
    let baseArchived = allEmployees.filter((e) => e.status === "Archivado");

    if (currentUser?.role === "Supervisor" && currentUser.employeeId) {
      const supervisorEmployee = allEmployees.find((e) => e.id === currentUser.employeeId);
      if (supervisorEmployee) {
        baseActiveAndVisible = baseActiveAndVisible.filter(
          (emp) => emp.area === supervisorEmployee.area,
        );
        baseArchived = baseArchived.filter((emp) => emp.area === supervisorEmployee.area);
      } else {
        baseActiveAndVisible = [];
        baseArchived = [];
      }
    }

    const activeForWork = baseActiveAndVisible
      .filter((e) => e.status === "Activo")
      .sort((a, b) => a.name.localeCompare(b.name));

    const archivedSorted = baseArchived.sort((a, b) => a.name.localeCompare(b.name));

    return {
      all: allEmployees,
      active: baseActiveAndVisible,
      activeForWork,
      archived: archivedSorted,
      archivedCount: archivedSorted.length,
    };
  })();

  const getNextEmployeeId = () => {
    const list = data?.all || [];
    if (list.length === 0) return "EMP-1001";
    const ids = list
      .map((e) => {
        const parts = e.id.split("-");
        return parts.length > 1 ? parseInt(parts[1]) : NaN;
      })
      .filter((id) => !isNaN(id));
    const maxId = ids.length > 0 ? Math.max(...ids) : 1000;
    return `EMP-${maxId + 1}`;
  };

  return {
    // Data from Query
    employees: data?.active || [],
    activeEmployees: data?.activeForWork || [],
    archivedEmployees: data?.archived || [],
    allEmployees: data?.all || [],
    archivedCount: data?.archivedCount || 0,
    isLoadingEmployees: _isKiosk ? isLoadingKioskEmployees : isLoading,
    isError: _isKiosk ? kioskQuery.isError : employeesQuery.isError,
    refetchKioskEmployees: kioskQuery.refetch,

    // Actions via Service
    addEmployee: async (emp: Partial<Employee>): Promise<Employee | null> => {
      try {
        const newEmp = await employeeService.create(emp as Employee);
        await invalidateEmployees();
        addToast("Empleado creado exitosamente", "success");
        return newEmp;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al crear empleado";
        addToast(message, "error");
        return null;
      }
    },
    updateEmployee: async (emp: Employee) => {
      try {
        await employeeService.update(emp.id, emp);
        await invalidateEmployees();
        addToast("Empleado actualizado", "success");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al actualizar empleado";
        addToast(message, "error");
        return false;
      }
    },
    updateKioskPin: async (id: string, pin: string): Promise<boolean> => {
      try {
        await employeeService.updateKioskPin(id, pin);
        await queryClient.invalidateQueries({ queryKey: queryKeys.employeesKiosk() });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al actualizar el PIN";
        addToast(message, "error");
        return false;
      }
    },
    updateEmployeeStatus: async (id: string, status: EmployeeStatus) => {
      try {
        await employeeService.update(id, { status, lastModified: Date.now() });
        await invalidateEmployees();
        addToast(`Estado actualizado a ${status}`, "success");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al cambiar estado";
        addToast(message, "error");
        return false;
      }
    },
    resetEmployeePin: async (id: string) => {
      try {
        await employeeService.update(id, {
          pin: undefined,
          pinFailedAttempts: 0,
          isPinBlocked: false,
          lastModified: Date.now(),
        });
        await invalidateEmployees();
        addToast("PIN reseteado correctamente", "success");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al resetear PIN";
        addToast(message, "error");
        return false;
      }
    },
    createBulkEmployees: async (employees: Employee[]) => {
      try {
        await employeeService.createBulk(employees);
        await invalidateEmployees();
        return { count: employees.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error en carga masiva";
        addToast(message, "error");
        throw error;
      }
    },

    // Enterprise Archiving Logic (delegated atomically to backend PUT /api/employees/:id)
    archiveEmployee: async (employee: Employee): Promise<boolean> => {
      try {
        await employeeService.update(employee.id, {
          status: "Archivado",
          lastModified: Date.now(),
        });

        await Promise.all([
          invalidateEmployees(),
          queryClient.invalidateQueries({ queryKey: queryKeys.users() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.assignedShifts() }),
        ]);
        addToast("Empleado archivado correctamente.", "success");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al archivar empleado";
        addToast(message, "error");
        return false;
      }
    },

    // Enterprise Reactivation Logic (delegated atomically to backend PUT /api/employees/:id)
    reactivateEmployee: async (employee: Employee): Promise<boolean> => {
      try {
        await employeeService.update(employee.id, {
          status: "Activo",
          lastModified: Date.now(),
        });

        await Promise.all([
          invalidateEmployees(),
          queryClient.invalidateQueries({ queryKey: queryKeys.users() }),
        ]);
        addToast("Empleado reactivado correctamente.", "success");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al reactivar empleado";
        addToast(message, "error");
        return false;
      }
    },

    checkOpenRecord: async (employeeId: string): Promise<boolean> => {
      try {
        const result = await timeRecordService.getAll({
          page: 1,
          pageSize: 1,
          filters: { employeeId },
        });
        const lastRecord = result.data[0];
        return !!(lastRecord && !lastRecord.salida);
      } catch {
        return false;
      }
    },

    // Selectors / Helpers
    getEmployeeById: (id: string) => data?.all?.find((e) => e.id === id),
    getNextEmployeeId,
    // Manual Refetch
    refreshEmployees: invalidateEmployees,
  };
};
