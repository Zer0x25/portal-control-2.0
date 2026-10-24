import type { Employee } from "../types";
import type { UserRole } from "../types/user";

export const shouldLoadAutoStartSchedule = (
  role: UserRole | undefined,
  employeeId: string | null | undefined,
  employee: Employee | undefined,
): boolean => {
  if (!employeeId || !employee) return false;
  if (role === "Reloj_Control") return true;

  return (
    (role === "Administrador" || role === "Supervisor_Elevado") &&
    employee.position === "Reloj_Control"
  );
};
