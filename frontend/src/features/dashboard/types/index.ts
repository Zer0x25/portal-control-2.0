/**
 * Barrel export de todos los tipos del dashboard feature
 */

// Hooks types
export * from "./hooks";

// Components types
export * from "./components";

// Widgets types
export * from "./widgets";

// Re-export common dashboard types from global types
export type {
  WeatherData,
  TeamStatus,
  UserClockingInfo,
  QuickNote,
} from "../../../types/dashboard";
