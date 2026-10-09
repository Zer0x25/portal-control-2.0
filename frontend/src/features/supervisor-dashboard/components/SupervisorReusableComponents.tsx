import React from "react";
import { SupervisorPermissions, SupervisorAction } from "../../../types/supervisor";
import { useAuth } from "../../../hooks/useAuth";

/**
 * 🎯 SUPERVISOR REUSABLE COMPONENTS
 * Componentes reutilizables con props tipadas para Supervisor Dashboard
 */

// ============================================================================
// SUPERVISOR CARD - Card genérica con permisos
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

export const SupervisorCard: React.FC<SupervisorCardProps> = ({
  title,
  children,
  icon: Icon,
  className = "",
  variant = "default",
  size = "md",
}) => {
  const variantClasses = {
    default: "bg-token-surface-card border border-token-border-technical shadow-sm",
    elevated: "bg-token-surface-card border border-token-border-technical shadow-lg",
    outlined: "bg-transparent border-2 border-token-border-technical",
  };

  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={`rounded-lg ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center gap-3 mb-4">
          {Icon && <Icon className="w-5 h-5 text-token-text-secondary" />}
          {title && <h3 className="text-lg font-semibold text-token-text-primary">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
};

// ============================================================================
// SUPERVISOR ACTION BUTTON - Botón con validación de permisos
// ============================================================================

export interface SupervisorActionButtonProps {
  action: SupervisorAction;
  onClick: () => void;
  children: React.ReactNode;
  requiredPermission?: keyof SupervisorPermissions;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  tooltip?: string;
}

export const SupervisorActionButton: React.FC<SupervisorActionButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  tooltip,
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-token-surface-stripe text-token-text-primary hover:bg-token-surface-hover focus:ring-sap-blue border border-token-border-technical",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const disabledClasses =
    disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      title={tooltip}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

// ============================================================================
// SUPERVISOR METRICS GRID - Grid de métricas responsive
// ============================================================================

export interface SupervisorMetric {
  id: string;
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
  };
  icon?: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
}

export interface SupervisorMetricsGridProps {
  metrics: SupervisorMetric[];
  columns?: number;
  className?: string;
}

export const SupervisorMetricsGrid: React.FC<SupervisorMetricsGridProps> = ({
  metrics,
  columns = 4,
  className = "",
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div
      className={`grid gap-4 ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} ${className}`}
    >
      {metrics.map((metric) => (
        <SupervisorMetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
};

// Componente interno para cada métrica
interface SupervisorMetricCardProps {
  metric: SupervisorMetric;
}

const SupervisorMetricCard: React.FC<SupervisorMetricCardProps> = ({ metric }) => {
  const { label, value, change, icon: Icon, color = "blue" } = metric;

  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    green: "text-green-600 bg-green-50 border-green-200",
    red: "text-red-600 bg-red-50 border-red-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    gray: "text-token-text-secondary bg-token-surface-stripe border-token-border-subtle",
  };

  const changeColorClasses = {
    increase: "text-green-600",
    decrease: "text-red-600",
    neutral: "text-token-text-secondary",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-token-text-secondary">{label}</p>
          <p className="text-2xl font-bold text-token-text-primary">{value}</p>
          {change && (
            <p className={`text-sm font-medium ${changeColorClasses[change.type]}`}>
              {change.type === "increase" && "+"}
              {change.type === "decrease" && "-"}
              {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="shrink-0">
            <Icon className="w-8 h-8 opacity-75" />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUPERVISOR DATA TABLE - Tabla de datos con acciones
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
  variant?: "primary" | "secondary" | "danger";
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
  onSort?: (key: keyof T, direction: "asc" | "desc") => void;
  sortKey?: keyof T;
  sortDirection?: "asc" | "desc";
}

export const SupervisorDataTable = <T extends Record<string, unknown>>({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = "No hay datos disponibles",
  className = "",
  onSort,
  sortKey,
  sortDirection,
}: SupervisorDataTableProps<T>) => {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-token-surface-hover rounded w-full mb-2"></div>
        <div className="h-4 bg-token-surface-hover rounded w-5/6 mb-2"></div>
        <div className="h-4 bg-token-surface-hover rounded w-4/6"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-token-text-tertiary">{emptyMessage}</div>;
  }

  const handleSort = (key: keyof T) => {
    if (!onSort) return;

    const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, newDirection);
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-token-border-subtle">
        <thead className="bg-token-surface-stripe">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-6 py-3 text-left text-xs font-medium text-token-text-tertiary uppercase tracking-wider ${column.className || ""}`}
              >
                <div
                  className={`flex items-center ${column.sortable ? "cursor-pointer hover:text-token-text-primary" : ""}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.label}
                  {column.sortable && sortKey === column.key && (
                    <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
            ))}
            {actions.length > 0 && (
              <th className="px-6 py-3 text-right text-xs font-medium text-token-text-tertiary uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-token-surface-card divide-y divide-token-border-subtle">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-token-surface-hover">
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={`px-6 py-4 whitespace-nowrap text-sm text-token-text-primary ${column.className || ""}`}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key] || "")}
                </td>
              ))}
              {actions.length > 0 && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {actions.map((action, actionIndex) => (
                      <SupervisorActionButton
                        key={actionIndex}
                        action={action.label as SupervisorAction}
                        onClick={() => action.onClick(row)}
                        variant={action.variant || "secondary"}
                        size="sm"
                      >
                        {action.icon && <action.icon className="w-4 h-4 mr-1" />}
                        {action.label}
                      </SupervisorActionButton>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// SUPERVISOR STATUS BADGE - Badge de estado con colores
// ============================================================================

export type SupervisorStatusType = "success" | "warning" | "error" | "info" | "neutral";

export interface SupervisorStatusBadgeProps {
  status: SupervisorStatusType;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SupervisorStatusBadge: React.FC<SupervisorStatusBadgeProps> = ({
  status,
  children,
  size = "md",
  className = "",
}) => {
  const statusClasses = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    neutral: "bg-token-surface-stripe text-token-text-primary border-token-border-subtle",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${statusClasses[status]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};

// ============================================================================
// SUPERVISOR PERMISSION WRAPPER - Wrapper para proteger contenido
// ============================================================================

export interface SupervisorPermissionWrapperProps {
  requiredPermission?: keyof SupervisorPermissions;
  requiredRole?: "Supervisor" | "Supervisor_Elevado";
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showMessage?: boolean;
}

export const SupervisorPermissionWrapper: React.FC<SupervisorPermissionWrapperProps> = ({
  requiredPermission,
  requiredRole,
  fallback,
  children,
  showMessage = true,
}) => {
  const { currentUser } = useAuth();

  const userRole = currentUser?.role;
  const isSupervisorOrAdmin =
    userRole === "Supervisor" || userRole === "Supervisor_Elevado" || userRole === "Administrador";

  let hasPermission = isSupervisorOrAdmin;
  if (requiredRole) {
    if (requiredRole === "Supervisor_Elevado") {
      hasPermission = userRole === "Supervisor_Elevado" || userRole === "Administrador";
    } else {
      hasPermission = isSupervisorOrAdmin;
    }
  }

  if (!hasPermission) {
    if (fallback) return <>{fallback}</>;

    if (showMessage) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Permisos insuficientes</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  No tienes los permisos necesarios para acceder a esta funcionalidad.
                  {requiredPermission && ` Se requiere: ${requiredPermission}`}
                  {requiredRole && ` Rol mínimo: ${requiredRole}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
};

// ============================================================================
// SUPERVISOR LOADING SKELETON - Skeleton para estados de carga
// ============================================================================

export interface SupervisorLoadingSkeletonProps {
  variant?: "card" | "table" | "metrics" | "text";
  lines?: number;
  className?: string;
}

export const SupervisorLoadingSkeleton: React.FC<SupervisorLoadingSkeletonProps> = ({
  variant = "card",
  lines = 3,
  className = "",
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case "card":
        return (
          <div className="animate-pulse">
            <div className="h-4 bg-token-surface-hover rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-token-surface-hover rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-token-surface-hover rounded w-5/6"></div>
          </div>
        );

      case "table":
        return (
          <div className="animate-pulse">
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="flex space-x-4 mb-2">
                <div className="h-4 bg-token-surface-hover rounded flex-1"></div>
                <div className="h-4 bg-token-surface-hover rounded w-1/4"></div>
                <div className="h-4 bg-token-surface-hover rounded w-1/6"></div>
              </div>
            ))}
          </div>
        );

      case "metrics":
        return (
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-token-surface-stripe rounded-lg p-4">
                <div className="h-4 bg-token-surface-hover rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-token-surface-hover rounded w-1/2"></div>
              </div>
            ))}
          </div>
        );

      case "text":
        return (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className={`h-4 bg-token-surface-hover rounded ${i === lines - 1 ? "w-3/4" : "w-full"}`}
              ></div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return <div className={className}>{renderSkeleton()}</div>;
};

// ============================================================================
// SUPERVISOR EMPTY STATE - Estado vacío con acciones
// ============================================================================

export interface SupervisorEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  className?: string;
}

export const SupervisorEmptyState: React.FC<SupervisorEmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  action,
  className = "",
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="mx-auto h-12 w-12 text-token-text-tertiary">
          <Icon className="h-full w-full" />
        </div>
      )}
      <h3 className="mt-2 text-sm font-medium text-token-text-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-token-text-secondary">{description}</p>}
      {action && (
        <div className="mt-6">
          <SupervisorActionButton
            action="view_dashboard" // Generic action for empty states
            onClick={action.onClick}
            variant={action.variant || "primary"}
          >
            {action.label}
          </SupervisorActionButton>
        </div>
      )}
    </div>
  );
};
