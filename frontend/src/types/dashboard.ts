import { Syncable } from "./common";
import { Employee, DailyTimeRecord, UserRole } from "./index";

export interface QuickNote extends Syncable {
  id: string;
  content: string;
  authorUsername: string;
  isArchived?: boolean;
  color?: string;
  reminderEnabled?: boolean;
  createdAt: number;
}

// --- NEW METER CONFIGURATION & READING TYPES ---

export const METER_CATEGORIES = {
  electricity: "Electricidad",
  water: "Agua",
  fuel_liquid: "Combustible Líquido",
  fuel_gas: "Combustible Gas",
  thermal: "Térmico",
  air_pressure: "Presión de Aire",
  chemical: "Químico",
  custom: "Personalizado",
};
export type MeterCategory = keyof typeof METER_CATEGORIES;

export const METER_UNITS: Record<MeterCategory, string[]> = {
  electricity: ["kWh", "MWh"],
  water: ["L", "m³"],
  fuel_liquid: ["L", "m³", "gal"],
  fuel_gas: ["m³", "Kg", "L"],
  thermal: ["°C", "°F", "K"],
  air_pressure: ["bar", "psi"],
  chemical: ["L", "Kg", "m³"],
  custom: ["unidades", "%", "L", "Kg"],
};

export type MeterType = "CONSUMPTION" | "LEVEL" | "PERCENT" | "INSTANT";

export interface MeterConfig extends Syncable {
  id: string;
  name: string;
  category: MeterCategory;
  type: MeterType;
  unit: string;
  maxCapacity?: number;
  conversionFactor?: number; // Optional, for future use (e.g., Kg to m³)
}

export type ReadingEventType =
  | "CONSUMPTION"
  | "RECHARGE"
  | "FULL_RECHARGE"
  | "INITIAL"
  | "INSTANTANEOUS"
  | "ADJUSTMENT"
  | "UNKNOWN";

export interface MeterReadingItem extends Syncable {
  id: string;
  meterConfigId: string;
  timestamp: number;
  authorUsername: string;

  // Stored Values
  value: number; // The value as it was entered
  isRecharge: boolean; // Was the input prefixed with '+'?

  // Calculated & Enriched Values
  normalizedValue: number; // The value converted to the base unit (e.g., % -> L)
  delta: number; // The difference from the previous reading
  eventType: ReadingEventType;
  previousReadingId?: string;
}

// --- OLD TYPES (kept for data migration) ---
export interface LegacyMeterConfig {
  id: string;
  label: string;
}

export interface WeatherData {
  location: string;
  temperature: number;
  condition: "Sunny" | "Cloudy" | "Rainy" | "Partly Cloudy";
  uvIndex: number;
}

export interface UpcomingEmployeeStatus {
  employee: Employee;
  shiftStartTime: Date;
  status: "ontime" | "late_warn" | "late_alert" | "absent";
  statusText: string;
  latenessMinutes: number;
}

export interface MissingClockOutStatus {
  employee: Employee;
  shiftEndTime: string;
  timeDifferenceMinutes: number;
  status: "upcoming" | "late";
  recordId: string;
  recordDate: string;
}

export interface TeamStatus {
  present: number;
  total: number;
  anomalies: DailyTimeRecord[];
  presentRecords: DailyTimeRecord[];
}

export interface UserClockingInfo {
  status: "unknown" | "not_employee" | "in" | "out";
  time?: string;
}

// --- Dashboard Customization Types ---
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
