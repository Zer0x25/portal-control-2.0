import { useStore } from "../store/useStore";
import { useUsers } from "./useUsers";
import { useToasts } from "./useToasts";
import { shiftService } from "../services/shiftService";
import { timeRecordService } from "../services/timeRecordService";
import { employeeService } from "../services/employeeService";
import { Employee, EmployeeStatus } from "../types";
import { useEffect, useMemo, useState } from "react";
import { toBusinessDateChile } from "../utils/dateUtils";
import { UserRole } from "../types/user";

export const useEmployees = (_isKiosk: boolean = false) => {
  const { users: usersData, deleteUser: hardDeleteUser, addUser: recreateUser } = useUsers();
  const allEmployees = useStore((state) => state.employees);
  const isLoading = useStore((state) => state.isLoadingEmployees);
  const currentUser = useStore((state) => state.currentUser);

  const loadEmployees = useStore((state) => state.loadEmployees);
  const { addToast } = useToasts();
  const [kioskEmployees, setKioskEmployees] = useState<Employee[]>([]);
  const [isLoadingKioskEmployees, setIsLoadingKioskEmployees] = useState(_isKiosk);

  useEffect(() => {
    if (!_isKiosk) return;

    let cancelled = false;

    const loadKioskEmployees = async () => {
      setIsLoadingKioskEmployees(true);
      try {
        const employees = await employeeService.getKioskEmployees();
        if (!cancelled) {
          setKioskEmployees(employees.filter((employee) => employee.status === "Activo"));
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Error al cargar empleados";
          addToast(message, "error");
          setKioskEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingKioskEmployees(false);
        }
      }
    };

    loadKioskEmployees();

    return () => {
      cancelled = true;
    };
  }, [_isKiosk, addToast]);

  const data = useMemo(() => {
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
  }, [_isKiosk, allEmployees, currentUser, kioskEmployees]);

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

  const generateTemporaryPassword = (): string => {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
  };

  return {
    // Data from Store
    employees: data?.active || [],
    activeEmployees: data?.activeForWork || [],
    archivedEmployees: data?.archived || [],
    allEmployees: data?.all || [],
    archivedCount: data?.archivedCount || 0,
    isLoadingEmployees: _isKiosk ? isLoadingKioskEmployees : isLoading,
    isError: false,

    // Actions via Service
    addEmployee: async (emp: Partial<Employee>): Promise<Employee | null> => {
      try {
        const newEmp = await employeeService.create(emp as Employee);
        await loadEmployees();
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
        await loadEmployees();
        addToast("Empleado actualizado", "success");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al actualizar empleado";
        addToast(message, "error");
        return false;
      }
    },
    updateEmployeeStatus: async (id: string, status: EmployeeStatus) => {
      try {
        await employeeService.update(id, { status, lastModified: Date.now() });
        await loadEmployees();
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
        await loadEmployees();
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
        await loadEmployees();
        return { count: employees.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error en carga masiva";
        addToast(message, "error");
        throw error;
      }
    },

    // Enterprise Archiving Logic
    archiveEmployee: async (employee: Employee) => {
      try {
        // 1. Perform Archive (Status Update)
        await employeeService.update(employee.id, {
          status: "Archivado",
          lastModified: Date.now(),
        });

        // 2. Delete associated user (Hard Delete)
        const linkedUser = usersData.find((u) => u.employeeId === employee.id);
        if (linkedUser) {
          await hardDeleteUser(linkedUser.id);
          addToast(`Usuario '${linkedUser.username}' eliminado permanentemente.`, "info");
        }

        // 3. Archive Assignments (Terminate future shifts)
        const assignmentsResponse = await shiftService.getAssignments();
        const allAssignments = assignmentsResponse.data;
        const employeeAssignments = allAssignments.filter((a) => a.employeeId === employee.id);
        const todayStr = toBusinessDateChile();

        const terminationPromises = employeeAssignments.map(async (assignment) => {
          if (assignment.startDate > todayStr) {
            // Future assignment: Hard delete
            return shiftService.deleteAssignment(assignment.id);
          } else if (!assignment.endDate || assignment.endDate > todayStr) {
            // Active assignment: Terminate today
            return shiftService.updateAssignment(assignment.id, {
              ...assignment,
              endDate: todayStr,
            });
          }
        });

        if (terminationPromises.length > 0) {
          await Promise.all(terminationPromises);
          addToast(
            `${terminationPromises.length} asignaciones de turno cerradas/eliminadas.`,
            "info",
          );
        }

        // Trigger backgrounds reloads instead of invalidation
        useStore.getState().loadEmployees();
        useStore.getState().loadUsers();
        // Shift reports/assignments still use Query for now
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al archivar empleado";
        addToast(message, "error");
        return false;
      }
    },

    // Enterprise Reactivation Logic
    reactivateEmployee: async (employee: Employee) => {
      try {
        // 1. Change Status to Active
        await employeeService.update(employee.id, { status: "Activo", lastModified: Date.now() });

        // 2. Automatically recreate User Account
        // Pattern: username = name normalized, pass/pin default
        const username = employee.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, ".");
        const temporaryPassword = generateTemporaryPassword();

        await recreateUser({
          username,
          password: temporaryPassword,
          role: "Usuario" as UserRole,
          employeeId: employee.id,
          mustChangePassword: true,
          lastModified: Date.now(),
          syncStatus: "pending",
          isDeleted: false,
        });

        addToast(
          `Empleado reactivado. Usuario '${username}' creado con clave temporal (cambio obligatorio en primer ingreso).`,
          "success",
        );

        useStore.getState().loadEmployees();
        useStore.getState().loadUsers();
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
    refreshEmployees: () => useStore.getState().loadEmployees(),
  };
};
