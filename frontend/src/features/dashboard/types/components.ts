import { ReactNode } from "react";
import { StatusInfo, TeamStatusData } from "./hooks";
import { DailyTimeRecord } from "../../../types";

/**
 * Tipos específicos para props de componentes del dashboard
 */

// Welcome Component Props
export interface WelcomeProps {
  weather: import("../../../types/dashboard").WeatherData | null;
  isLoadingWeather: boolean;
  welcomeName: string;
  greeting: string;
}

// Quick Actions Component Props
export interface QuickActionsProps {
  actions: import("./hooks").ActionConfig[];
  colorClasses: Record<string, string>;
  onNavigate: import("./hooks").NavigationHandler;
}

// Tools Component Props
export interface ToolsProps {
  tools: import("./hooks").ToolConfig[];
  colorClasses: Record<string, string>;
  itemClass: string;
  iconBoxClass: string;
}

// My Status Component Props
export interface MyStatusProps {
  currentStatus: StatusInfo;
  timeText: string;
  showActiveShift: boolean;
  responsibleName: string;
  isControlInternoEnabled: boolean;
}

// Team Status Component Props
export interface TeamStatusProps {
  teamStatus: TeamStatusData;
  unscheduledPresent: DailyTimeRecord[];
  hasUnscheduledPresent: boolean;
  hasAnomalies: boolean;
  hasPresent: boolean;
}

// Generic Widget Container Props
export interface WidgetContainerProps {
  title: string;
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
}
