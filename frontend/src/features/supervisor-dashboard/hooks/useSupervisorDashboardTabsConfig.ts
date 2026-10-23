import {
  ShieldCheckIcon,
  ActivityIcon,
  ClockIcon,
  KeyIcon,
  DocumentChartBarIcon,
} from "../../../components/ui/icons";
import { SupervisorTabConfig } from "./useSupervisorDashboardTabs";

/**
 * Hook para la configuración de tabs del supervisor dashboard
 */
export const useSupervisorDashboardTabsConfig = (requestCount: number) => {
  const tabs: SupervisorTabConfig[] = [
    { id: "dashboard", label: "Resumen Hoy", icon: ActivityIcon },
    { id: "kpis", label: "Indicadores", icon: DocumentChartBarIcon },
    { id: "analytics", label: "Analytics", icon: ActivityIcon },
    { id: "employees", label: "Empleados", icon: ClockIcon, badge: requestCount },
    { id: "reports", label: "Reportes", icon: ShieldCheckIcon },
    { id: "shifts", label: "Turnos", icon: KeyIcon },
  ];

  return { tabs };
};
