import type { ComponentType } from "react";
import {
  HomeIcon,
  ClockIcon,
  BookOpenIcon,
  CogIcon,
  UsersIcon,
  CalendarDaysIcon,
  DocumentChartBarIcon,
  UserCircleIcon,
  ShieldIcon,
} from "../../components/ui/icons/index";
import { ROUTES } from "../../constants";
import type { UserRole } from "../../types";

export interface SidebarMenuItem {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
}

interface SidebarMenuParams {
  role?: UserRole;
  isControlInternoEnabled: boolean;
}

export const buildSidebarMenuByRole = ({
  role,
  isControlInternoEnabled,
}: SidebarMenuParams): SidebarMenuItem[] => {
  const isElevatedRole =
    role && ["Supervisor", "Administrador", "Supervisor_Elevado"].includes(role);
  const isAdminOrElevated = role && (role === "Administrador" || role === "Supervisor_Elevado");
  const isWorkerRole = role === "Usuario";
  const isAuditorRole = role === "Fiscalizador";
  const canManageEmployees =
    role && ["Administrador", "Supervisor_Elevado", "Supervisor", "Reloj_Control"].includes(role);

  if (isAuditorRole) {
    return [
      { to: ROUTES.TIME_CONTROL, icon: ClockIcon, label: "Control" },
      { to: ROUTES.SUPERVISOR_DASHBOARD, icon: DocumentChartBarIcon, label: "Supervisión" },
      { to: ROUTES.AUDIT_LOGS, icon: ShieldIcon, label: "Auditoría" },
    ];
  }

  if (isWorkerRole) {
    return [
      { to: ROUTES.WORKER_PORTAL, icon: UserCircleIcon, label: "Portal", end: true },
      { to: ROUTES.SHIFT_CALENDAR, icon: CalendarDaysIcon, label: "Calendario" },
    ];
  }

  const items: SidebarMenuItem[] = [];

  if (role !== "Supervisor" && isControlInternoEnabled) {
    items.push({ to: ROUTES.DASHBOARD, icon: HomeIcon, label: "Inicio", end: true });
  }

  if (isElevatedRole) {
    items.push({
      to: ROUTES.SUPERVISOR_DASHBOARD,
      icon: DocumentChartBarIcon,
      label: "Supervisión",
      end: true,
    });
  }

  items.push({ to: ROUTES.TIME_CONTROL, icon: ClockIcon, label: "Control" });

  if (
    ["Administrador", "Supervisor_Elevado", "Reloj_Control"].includes(role || "") &&
    isControlInternoEnabled
  ) {
    items.push({ to: ROUTES.LOGBOOK, icon: BookOpenIcon, label: "Libro" });
  }

  items.push({ to: ROUTES.SHIFT_CALENDAR, icon: CalendarDaysIcon, label: "Calendario" });

  if (isElevatedRole) {
    items.push({ to: ROUTES.THEORETICAL_SHIFTS, icon: CalendarDaysIcon, label: "Turnos" });
    items.push({ to: ROUTES.MONTHLY_PLANNING, icon: CalendarDaysIcon, label: "Planif. Mensual" });
  }

  if (canManageEmployees) {
    items.push({ to: ROUTES.EMPLOYEE_MANAGEMENT, icon: UsersIcon, label: "Personal" });
  }

  if (isAdminOrElevated) {
    items.push({ to: ROUTES.USER_MANAGEMENT, icon: UsersIcon, label: "Usuarios" });
    if (role === "Administrador" || role === "Supervisor_Elevado") {
      items.push({ to: ROUTES.GOVERNANCE_HUB, icon: ShieldIcon, label: "Gobernanza" });
    }
  }

  items.push({ to: ROUTES.CONFIGURATION, icon: CogIcon, label: "Config" });
  return items;
};
