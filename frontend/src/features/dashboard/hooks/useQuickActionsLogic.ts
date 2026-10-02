import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../constants";
import {
  ClockIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  UsersIcon,
} from "../../../components/ui/icons/index";
import { ActionConfig, NavigationHandler, ColorTheme } from "../types";

export const useQuickActionsLogic = () => {
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
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
    slate: "text-slate-600 dark:text-gray-400 bg-gray-500/10",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
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
