import { UserRole } from "../types/index";
import { ROUTES } from "../constants";

/**
 * Determines the default route for a user based on their role.
 * This centralizes redirection logic.
 * @param role The role of the user.
 * @returns The path of the default route.
 */
export const getDefaultRouteForRole = (
  role: UserRole,
  isControlInternoEnabled: boolean = true,
): string => {
  switch (role) {
    case "Supervisor":
      return ROUTES.SUPERVISOR_DASHBOARD;
    case "Usuario":
      return ROUTES.WORKER_PORTAL;
    case "Fiscalizador":
      return ROUTES.TIME_CONTROL;
    case "Reloj_Control":
    case "Administrador":
    case "Supervisor_Elevado":
    default:
      return isControlInternoEnabled ? ROUTES.DASHBOARD : ROUTES.SUPERVISOR_DASHBOARD;
  }
};
