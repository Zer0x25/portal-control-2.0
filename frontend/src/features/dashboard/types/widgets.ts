import { UserRole } from "../../../types";

/**
 * Tipos para configuración y gestión de widgets del dashboard
 */

export type WidgetId =
  "myStatus" | "quickActions" | "tools" | "alerts" | "teamStatus" | "latestReports";

export interface DashboardWidget {
  id: WidgetId;
  title: string;
  component: React.ComponentType<unknown>;
  defaultVisible: boolean;
  mobileVisible: boolean;
  roles: UserRole[];
  module?: "controlInterno";
}

export interface DashboardWidgetConfig {
  id: WidgetId;
  visible: boolean;
}

export interface DashboardLayout {
  widgets: DashboardWidgetConfig[];
}

// Widget-specific configuration types
export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order?: number;
  size?: "small" | "medium" | "large";
  customSettings?: Record<string, unknown>;
}
