/**
 * 🎯 SUPERVISOR DASHBOARD COMPONENTS INDEX
 * Punto de entrada único para todos los componentes reutilizables del supervisor
 */

// Componentes básicos reutilizables
export {
  SupervisorCard,
  SupervisorActionButton,
  SupervisorMetricsGrid,
  SupervisorDataTable,
  SupervisorStatusBadge,
  SupervisorPermissionWrapper,
  SupervisorLoadingSkeleton,
  SupervisorEmptyState,
} from "./SupervisorReusableComponents";

// Componentes avanzados
export {
  SupervisorFilterPanel,
  SupervisorSearchBar,
  SupervisorStatsCard,
  SupervisorQuickActions,
  SupervisorEmployeeCard,
} from "./SupervisorAdvancedComponents";

// Tipos de componentes
export type {
  // Básicos
  SupervisorCardProps,
  SupervisorActionButtonProps,
  SupervisorMetricsGridProps,
  SupervisorDataTableProps,
  SupervisorStatusBadgeProps,
  SupervisorPermissionWrapperProps,
  SupervisorLoadingSkeletonProps,

  // Avanzados
  SupervisorFilterProps,
  SupervisorSearchProps,
  SupervisorStatsCardProps,

  // Utility types
  SupervisorComponentSize,
  SupervisorComponentVariant,
  SupervisorColor,
  SupervisorButtonVariant,
  SupervisorButtonSize,
  SupervisorBadgeSize,
  SupervisorGridColumns,
  SupervisorSortDirection,
  SupervisorStatusType,
  SupervisorSkeletonVariant,
  SupervisorModalSize,
  SupervisorMaxWidth,
  SupervisorSpacing,
} from "../types/components";

// Tipos del sistema supervisor
export type {
  SupervisorRole,
  SupervisorPermissions,
  SupervisorAction,
  SupervisorTab,
  SupervisorError,
  SupervisorActionResult,
  SupervisorReport,
  SupervisorDashboardConfig,
  SupervisorFilterState,
  SupervisorViewState,
  SupervisorPermissions as SchemaSupervisorPermissions,
} from "../../../types/supervisor";

// Hooks del supervisor
export {
  useSupervisorPermissions,
  useSupervisorAction,
  useSupervisorGuard,
  SupervisorPermissionGate,
} from "../../../hooks/useSupervisorPermissions";

// Servicios
export { supervisorService } from "../../../services/supervisorService";

// Constantes y utilidades
export {
  SUPERVISOR_TABS,
  SUPERVISOR_ROLE_HIERARCHY,
  SUPERVISOR_PERMISSIONS_BY_ROLE,
} from "../../../types/supervisor";

// Funciones de utilidad
export {
  isSupervisorRole,
  hasSupervisorPermission,
  canSupervisorPerformAction,
} from "../../../types/supervisor";
