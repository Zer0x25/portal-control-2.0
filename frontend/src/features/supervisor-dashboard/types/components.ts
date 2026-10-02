import {
  SupervisorPermissions,
  SupervisorAction,
  SupervisorFilterState,
} from "../../../types/supervisor";

/**
 * 🎯 SUPERVISOR REUSABLE COMPONENTS TYPES
 * Types específicos para componentes reutilizables del supervisor dashboard
 */

// ============================================================================
// SUPERVISOR CARD TYPES
// ============================================================================

export interface SupervisorCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  requiredPermission?: keyof SupervisorPermissions;
  className?: string;
  variant?: "default" | "elevated" | "outlined";
  size?: "sm" | "md" | "lg";
}

export type SupervisorCardVariant = "default" | "elevated" | "outlined";
export type SupervisorCardSize = "sm" | "md" | "lg";

// ============================================================================
// SUPERVISOR ACTION BUTTON TYPES
// ============================================================================

export interface SupervisorActionButtonProps {
  action: SupervisorAction;
  onClick: () => void;
  children: React.ReactNode;
  requiredPermission?: keyof SupervisorPermissions;
  variant?: SupervisorButtonVariant;
  size?: SupervisorButtonSize;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  tooltip?: string;
}

export type SupervisorButtonVariant = "primary" | "secondary" | "danger" | "success";
export type SupervisorButtonSize = "sm" | "md" | "lg";

// ============================================================================
// SUPERVISOR METRICS TYPES
// ============================================================================

export interface SupervisorMetric {
  id: string;
  label: string;
  value: string | number;
  change?: SupervisorMetricChange;
  icon?: React.ComponentType<{ className?: string }>;
  color?: SupervisorColor;
}

export interface SupervisorMetricChange {
  value: number;
  type: "increase" | "decrease" | "neutral";
}

export interface SupervisorMetricsGridProps {
  metrics: SupervisorMetric[];
  columns?: SupervisorGridColumns;
  className?: string;
}

export type SupervisorColor = "blue" | "green" | "red" | "yellow" | "purple" | "gray";
export type SupervisorGridColumns = 1 | 2 | 3 | 4;

// ============================================================================
// SUPERVISOR DATA TABLE TYPES
// ============================================================================

export interface SupervisorTableColumn<T = Record<string, unknown>> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

export interface SupervisorTableAction<T = Record<string, unknown>> {
  label: string;
  onClick: (row: T) => void;
  variant?: SupervisorButtonVariant;
  requiredPermission?: keyof SupervisorPermissions;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SupervisorDataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: SupervisorTableColumn<T>[];
  actions?: SupervisorTableAction<T>[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onSort?: (key: keyof T, direction: SupervisorSortDirection) => void;
  sortKey?: keyof T;
  sortDirection?: SupervisorSortDirection;
}

export type SupervisorSortDirection = "asc" | "desc";

// ============================================================================
// SUPERVISOR STATUS BADGE TYPES
// ============================================================================

export interface SupervisorStatusBadgeProps {
  status: SupervisorStatusType;
  children: React.ReactNode;
  size?: SupervisorBadgeSize;
  className?: string;
}

export type SupervisorStatusType = "success" | "warning" | "error" | "info" | "neutral";
export type SupervisorBadgeSize = "sm" | "md" | "lg";

// ============================================================================
// SUPERVISOR PERMISSION WRAPPER TYPES
// ============================================================================

export interface SupervisorPermissionWrapperProps {
  requiredPermission?: keyof SupervisorPermissions;
  requiredRole?: SupervisorRoleType;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showMessage?: boolean;
}

export type SupervisorRoleType = "Supervisor" | "Supervisor_Elevado";

// ============================================================================
// SUPERVISOR LOADING SKELETON TYPES
// ============================================================================

export interface SupervisorLoadingSkeletonProps {
  variant?: SupervisorSkeletonVariant;
  lines?: number;
  className?: string;
}

export type SupervisorSkeletonVariant = "card" | "table" | "metrics" | "text";

// ============================================================================
// SUPERVISOR ADVANCED COMPONENT TYPES
// ============================================================================

export interface SupervisorFilterProps {
  filters: SupervisorFilterState;
  onFiltersChange: (filters: SupervisorFilterState) => void;
  availableAreas?: string[];
  availableShifts?: string[];
  loading?: boolean;
  className?: string;
}

export interface SupervisorSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  showSuggestions?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  className?: string;
}

export interface SupervisorStatsCardProps {
  title: string;
  value: string | number;
  change?: SupervisorStatsChange;
  icon?: React.ComponentType<{ className?: string }>;
  color?: SupervisorColor;
  loading?: boolean;
  className?: string;
}

export interface SupervisorStatsChange {
  value: number;
  unit?: string;
  type: "positive" | "negative" | "neutral";
  period?: string;
}

// ============================================================================
// SUPERVISOR LAYOUT TYPES
// ============================================================================

export interface SupervisorLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: SupervisorMaxWidth;
  padding?: SupervisorSpacing;
}

export type SupervisorMaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "full";
export type SupervisorSpacing = "none" | "sm" | "md" | "lg" | "xl";

// ============================================================================
// SUPERVISOR FORM TYPES
// ============================================================================

export interface SupervisorFormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface SupervisorFormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// SUPERVISOR MODAL TYPES
// ============================================================================

export interface SupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: SupervisorModalSize;
  showCloseButton?: boolean;
  className?: string;
}

export type SupervisorModalSize = "sm" | "md" | "lg" | "xl" | "full";

// ============================================================================
// SUPERVISOR NOTIFICATION TYPES
// ============================================================================

export interface SupervisorNotificationProps {
  type: SupervisorNotificationType;
  title: string;
  message?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}

export type SupervisorNotificationType = "success" | "error" | "warning" | "info";

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SupervisorComponentSize = "sm" | "md" | "lg";
export type SupervisorComponentVariant =
  "default" | "primary" | "secondary" | "success" | "warning" | "danger";

// Type helpers
export type SupervisorComponentBaseProps = {
  className?: string;
  children?: React.ReactNode;
};

export type SupervisorComponentWithSize<T = Record<string, unknown>> = T & {
  size?: SupervisorComponentSize;
};

export type SupervisorComponentWithVariant<T = Record<string, unknown>> = T & {
  variant?: SupervisorComponentVariant;
};

// Generic component factory type
export type SupervisorComponentFactory<P = Record<string, unknown>> = React.FC<
  P & SupervisorComponentBaseProps
>;

// ============================================================================
// THEME AND STYLING TYPES
// ============================================================================

export interface SupervisorTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

export const SUPERVISOR_DEFAULT_THEME: SupervisorTheme = {
  colors: {
    primary: "#3B82F6",
    secondary: "#6B7280",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#06B6D4",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  borderRadius: {
    none: "0",
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
};
