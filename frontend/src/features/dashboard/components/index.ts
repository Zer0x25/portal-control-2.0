import { withDashboardLazy } from "./withDashboardLazy";

// Lazy loading de componentes del dashboard para mejor performance
export const WelcomePanel = withDashboardLazy(() => import("../components/WelcomePanel"));
export const QuickActionsPanel = withDashboardLazy(() => import("../components/QuickActionsPanel"));
export const TeamStatusPanel = withDashboardLazy(() => import("../components/TeamStatusPanel"));
export const ToolsPanel = withDashboardLazy(() => import("../components/ToolsPanel"));
export const MyStatusPanel = withDashboardLazy(() => import("../components/MyStatusPanel"));

// Re-export de componentes UI optimizados (ya están memoizados)
export { ActionButton, StatusCard, ShiftStatusCard, MetricGrid } from "./ui/index";

// Re-export de utilidades de lazy loading
export { useDashboardPreload, DashboardSkeleton } from "./withDashboardLazy";

// Re-export de tipos
export type * from "../types";
