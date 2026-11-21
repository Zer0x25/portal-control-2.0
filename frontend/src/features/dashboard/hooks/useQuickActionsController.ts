import { useNavigate } from "react-router";
import { ROUTES } from "../../../constants";
import {
  ClockIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  UsersIcon,
} from "../../../components/ui/icons/index";
import { ActionConfig, NavigationHandler, ColorTheme } from "../types";

export const useQuickActionsController = () => {
  const navigate = useNavigate();

  const actions: ActionConfig[] = [
    {
      id: "time",
      label: "Horarios",
      icon: ClockIcon,
      route: ROUTES.TIME_CONTROL,
      color: "emerald" as ColorTheme,
    },
    {
      id: "log",
      label: "Novedades",
      icon: BookOpenIcon,
      route: ROUTES.LOGBOOK,
      color: "indigo" as ColorTheme,
    },
    {
      id: "cal",
      label: "Calendario",
      icon: CalendarDaysIcon,
      route: ROUTES.SHIFT_CALENDAR,
      color: "slate" as ColorTheme,
    },
    {
      id: "users",
      label: "Personal",
      icon: UsersIcon,
      route: ROUTES.EMPLOYEE_MANAGEMENT,
      color: "orange" as ColorTheme,
    },
  ];

  const colorClasses: Record<string, string> = {
    emerald: "text-token-status-success-text bg-token-status-success/10",
    indigo: "text-token-accent-brand bg-token-accent-brand/10",
    slate: "text-token-text-secondary bg-token-surface-hover",
    orange: "text-token-status-sin-marcaje-text bg-token-status-sin-marcaje/10",
  };

  const handleNavigate: NavigationHandler = (route: string) => {
    navigate(route);
  };

  return {
    actions,
    colorClasses,
    handleNavigate,
  };
};
