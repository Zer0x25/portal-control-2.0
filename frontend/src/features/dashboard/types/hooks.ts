import { WeatherData } from "../../../types/dashboard";

import { DailyTimeRecord } from "../../../types";

/**
 * Tipos específicos para los hooks del dashboard
 */

// Welcome Logic Types
export interface WelcomeData {
  weather: WeatherData | null;
  isLoadingWeather: boolean;
  welcomeName: string;
  greeting: string;
}

// Quick Actions Types
export type ColorTheme = "emerald" | "indigo" | "slate" | "orange" | "violet";

export interface IconProps {
  className?: string;
  fill?: string;
}

export type IconComponent = React.FC<IconProps>;

export interface ActionConfig {
  id: string;
  label: string;
  icon: IconComponent;
  route: string;
  color: ColorTheme;
}

export type NavigationHandler = (route: string) => void;

// Tools Logic Types
export type ToolType = "button" | "link";

export interface ToolConfig {
  id: string;
  label: string;
  icon: IconComponent;
  action: string | (() => void);
  color: ColorTheme;
  type: ToolType;
  hasNotification?: boolean;
}

export type ToolAction = string | (() => void);

// My Status Logic Types
export type StatusType = "in" | "out" | "not_employee" | "unknown";

export interface StatusInfo {
  text: string;
  icon: React.ReactElement;
  variant: "success" | "danger" | "neutral";
  textColor: string;
  borderColor: string;
}

// Team Status Logic Types
export interface TeamStatusData {
  present: number;
  total: number;
  anomalies: DailyTimeRecord[];
  presentRecords: DailyTimeRecord[];
}
