import type { ComponentType } from "react";
import {
  HomeIcon,
  ClockIcon,
  BookOpenIcon,
  CogIcon,
  UsersIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  DocumentChartBarIcon,
  UserCircleIcon,
  ShieldIcon,
  CalculatorIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
} from "../../components/ui/icons/index";
import { ROUTES } from "../../constants";
import { ROLES } from "../../utils/mappings";
import type { UserRole } from "../../types";

export interface SidebarMenuItem {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  /** Marca opcional (ej. "Beta") para módulos en construcción. */
  badge?: string;
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
    role && ["Supervisor", "Super_Administrador", "Administrador"].includes(role);
  const isAdminOrElevated = role && (role === "Super_Administrador" || role === "Administrador");
  const isWorkerRole = role === "Usuario";
  const isAuditorRole = role === "Fiscalizador";
  const canManageEmployees =
    role && ["Super_Administrador", "Administrador", "Supervisor", "Reloj_Control"].includes(role);

  if (isAuditorRole) {
    return [
      { to: ROUTES.TIME_CONTROL, icon: ClockIcon, label: "Control" },
      ...(isControlInternoEnabled
        ? [{ to: ROUTES.COMMUNICATIONS, icon: ChatBubbleLeftRightIcon, label: "Comunicados" }]
        : []),
      { to: ROUTES.SHIFT_CALENDAR, icon: CalendarDaysIcon, label: "Calendario" },
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
    ["Super_Administrador", "Administrador", "Reloj_Control"].includes(role || "") &&
    isControlInternoEnabled
  ) {
    items.push({ to: ROUTES.LOGBOOK, icon: BookOpenIcon, label: "Libro" });
    items.push({ to: ROUTES.METER_READINGS, icon: CalculatorIcon, label: "Medidores" });
  }

  if (
    ["Reloj_Control", "Super_Administrador", "Administrador", "Supervisor"].includes(role || "") &&
    isControlInternoEnabled
  ) {
    items.push({ to: ROUTES.COMMUNICATIONS, icon: ChatBubbleLeftRightIcon, label: "Comunicados" });
  }

  items.push({ to: ROUTES.SHIFT_CALENDAR, icon: CalendarDaysIcon, label: "Calendario" });

  if (isElevatedRole) {
    items.push({ to: ROUTES.THEORETICAL_SHIFTS, icon: CalendarDaysIcon, label: "Turnos" });
    items.push({
      to: ROUTES.MONTHLY_PLANNING,
      icon: CalendarDaysIcon,
      label: "Planif. Mensual",
      badge: "Beta",
    });
  }

  if (canManageEmployees && !isAdminOrElevated) {
    items.push({
      to: `${ROUTES.PERSONNEL_MANAGEMENT}?tab=employees`,
      icon: UsersIcon,
      label: "Personal",
    });
  }

  if (isAdminOrElevated) {
    items.push({ to: ROUTES.PERSONNEL_MANAGEMENT, icon: UserPlusIcon, label: "Dotación" });
    if (role === "Super_Administrador" || role === "Administrador") {
      items.push({ to: ROUTES.GOVERNANCE_HUB, icon: ShieldIcon, label: "Gobernanza" });
    }
  }

  if (role === "Super_Administrador") {
    items.push({ to: ROUTES.DESIGN_SYSTEM, icon: SparklesIcon, label: "Design System" });
  }

  if (role === ROLES.ADMIN || role === ROLES.SUPERVISOR_ELEVATED) {
    items.push({ to: ROUTES.CONFIGURATION, icon: CogIcon, label: "Config" });
  }
  return items;
};
