import React, { useState, useCallback } from "react";
import {
  SupervisorCard,
  SupervisorActionButton,
  SupervisorStatusBadge,
} from "./SupervisorReusableComponents";
import { SupervisorFilterState, SupervisorPermissions } from "../../../types/supervisor";
import { getChileDateISO } from "../../../utils/dateUtils";
import {
  SupervisorFilterProps,
  SupervisorSearchProps,
  SupervisorStatsCardProps,
} from "../types/components";

/**
 * 🎯 SUPERVISOR ADVANCED COMPONENTS
 * Componentes avanzados reutilizables para funcionalidades complejas
 */

// ============================================================================
// SUPERVISOR FILTER PANEL - Panel de filtros avanzado
// ============================================================================

export const SupervisorFilterPanel: React.FC<SupervisorFilterProps> = ({
  filters,
  onFiltersChange,
  availableAreas = [],
  availableShifts = [],
  loading = false,
  className = "",
}) => {
  const [localFilters, setLocalFilters] = useState<SupervisorFilterState>(filters);

  const handleFilterChange = useCallback(
    (
      key: keyof SupervisorFilterState,
      value: SupervisorFilterState[keyof SupervisorFilterState],
    ) => {
      const newFilters = { ...localFilters, [key]: value };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    },
    [localFilters, onFiltersChange],
  );

  const handleDateRangeChange = useCallback(
    (start: Date, end: Date) => {
      handleFilterChange("dateRange", { start, end });
    },
    [handleFilterChange],
  );

  const clearFilters = useCallback(() => {
    const emptyFilters: SupervisorFilterState = {
      dateRange: { start: new Date(), end: new Date() },
      employees: [],
      areas: [],
      shifts: [],
      status: [],
      search: "",
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  }, [onFiltersChange]);

  return (
    <SupervisorCard title="Filtros" className={`mb-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rango de Fechas */}
        <div>
          <label className="block text-sm font-medium text-token-text-secondary mb-1">
            Fecha Inicio
          </label>
          <input
            type="date"
            value={getChileDateISO(localFilters.dateRange.start)}
            onChange={(e) =>
              handleDateRangeChange(new Date(e.target.value), localFilters.dateRange.end)
            }
            className="w-full px-3 py-2 border border-token-border-technical bg-token-surface-card text-token-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-sap-blue"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-token-text-secondary mb-1">
            Fecha Fin
          </label>
          <input
            type="date"
            value={getChileDateISO(localFilters.dateRange.end)}
            onChange={(e) =>
              handleDateRangeChange(localFilters.dateRange.start, new Date(e.target.value))
            }
            className="w-full px-3 py-2 border border-token-border-technical bg-token-surface-card text-token-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-sap-blue"
            disabled={loading}
          />
        </div>

        {/* Áreas */}
        <div>
          <label className="block text-sm font-medium text-token-text-secondary mb-1">Áreas</label>
          <select
            multiple
            value={localFilters.areas}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (option) => option.value);
              handleFilterChange("areas", values);
            }}
            className="w-full px-3 py-2 border border-token-border-technical bg-token-surface-card text-token-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-sap-blue"
            disabled={loading}
          >
            {availableAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* Turnos */}
        <div>
          <label className="block text-sm font-medium text-token-text-secondary mb-1">Turnos</label>
          <select
            multiple
            value={localFilters.shifts}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (option) => option.value);
              handleFilterChange("shifts", values);
            }}
            className="w-full px-3 py-2 border border-token-border-technical bg-token-surface-card text-token-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-sap-blue"
            disabled={loading}
          >
            {availableShifts.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estados */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-token-text-secondary mb-2">Estados</label>
        <div className="flex flex-wrap gap-2">
          {(["present", "absent", "late", "on_break", "overtime", "off_duty"] as const).map(
            (status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.status.includes(status)}
                  onChange={(e) => {
                    const newStatus = e.target.checked
                      ? [...localFilters.status, status]
                      : localFilters.status.filter((s) => s !== status);
                    handleFilterChange("status", newStatus);
                  }}
                  className="mr-2"
                  disabled={loading}
                />
                <span className="text-sm capitalize">{status.replace("_", " ")}</span>
              </label>
            ),
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-6 flex justify-end gap-3">
        <SupervisorActionButton
          action="view_dashboard"
          onClick={clearFilters}
          variant="secondary"
          disabled={loading}
        >
          Limpiar Filtros
        </SupervisorActionButton>
      </div>
    </SupervisorCard>
  );
};

// ============================================================================
// SUPERVISOR SEARCH BAR - Barra de búsqueda avanzada
// ============================================================================

export const SupervisorSearchBar: React.FC<SupervisorSearchProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Buscar empleados...",
  loading = false,
  showSuggestions = true,
  suggestions = [],
  onSuggestionSelect,
  className = "",
}) => {
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setShowSuggestionsList(newValue.length > 0 && showSuggestions);
    },
    [onChange, showSuggestions],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onSearch?.(value);
        setShowSuggestionsList(false);
      }
    },
    [onSearch, value],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      onSuggestionSelect?.(suggestion);
      setShowSuggestionsList(false);
    },
    [onChange, onSuggestionSelect],
  );

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-token-border-technical bg-token-surface-card text-token-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-sap-blue focus:border-transparent"
          disabled={loading}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-token-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
            >
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
          ) : (
            <svg
              className="h-5 w-5 text-token-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg
              className="h-5 w-5 text-token-text-tertiary hover:text-token-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Sugerencias */}
      {showSuggestionsList && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-token-surface-card border border-token-border-technical rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-token-surface-hover focus:bg-token-surface-hover text-token-text-primary focus:outline-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUPERVISOR STATS CARD - Card de estadísticas con tendencias
// ============================================================================

export const SupervisorStatsCard: React.FC<SupervisorStatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = "blue",
  loading = false,
  className = "",
}) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    yellow: "text-yellow-600 bg-yellow-50",
    purple: "text-purple-600 bg-purple-50",
  };

  const changeColorClasses = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-token-text-secondary",
  };

  if (loading) {
    return (
      <SupervisorCard title={title} className={className}>
        <div className="animate-pulse">
          <div className="h-4 bg-token-surface-hover rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-token-surface-hover rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-token-surface-hover rounded w-1/4"></div>
        </div>
      </SupervisorCard>
    );
  }

  return (
    <SupervisorCard title={title} className={className}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-token-text-secondary">{title}</p>
          <p className="text-3xl font-bold text-token-text-primary">{value}</p>
          {change && (
            <div className="flex items-center mt-1">
              <span className={`text-sm font-medium ${changeColorClasses[change.type]}`}>
                {change.type === "positive" && "+"}
                {change.type === "negative" && "-"}
                {change.value}
                {change.unit && ` ${change.unit}`}
              </span>
              {change.period && (
                <span className="text-sm text-token-text-tertiary ml-1">vs {change.period}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </SupervisorCard>
  );
};

// ============================================================================
// SUPERVISOR QUICK ACTIONS - Acciones rápidas en grid
// ============================================================================

interface SupervisorQuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
  requiredPermission?: keyof SupervisorPermissions;
  disabled?: boolean;
}

interface SupervisorQuickActionsProps {
  actions: SupervisorQuickAction[];
  columns?: number;
  className?: string;
}

export const SupervisorQuickActions: React.FC<SupervisorQuickActionsProps> = ({
  actions,
  columns = 3,
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
      className={`grid gap-4 ${gridCols[columns as keyof typeof gridCols] || gridCols[3]} ${className}`}
    >
      {actions.map((action) => (
        <SupervisorCard
          key={action.id}
          title={action.label}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        >
          <button
            onClick={action.onClick}
            disabled={action.disabled}
            className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  action.variant === "primary"
                    ? "bg-blue-100 text-blue-600"
                    : action.variant === "success"
                      ? "bg-green-100 text-green-600"
                      : action.variant === "warning"
                        ? "bg-yellow-100 text-yellow-600"
                        : action.variant === "danger"
                          ? "bg-red-100 text-red-600"
                          : "bg-token-surface-stripe text-token-text-secondary"
                }`}
              >
                <action.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-token-text-primary">{action.label}</h3>
                {action.description && (
                  <p className="text-sm text-token-text-secondary">{action.description}</p>
                )}
              </div>
            </div>
          </button>
        </SupervisorCard>
      ))}
    </div>
  );
};

// ============================================================================
// SUPERVISOR EMPLOYEE CARD - Card de empleado con estado
// ============================================================================

interface SupervisorEmployee {
  id: string;
  name: string;
  position: string;
  area: string;
  status: "present" | "absent" | "late" | "on_break" | "overtime" | "off_duty";
  avatar?: string;
  lastActivity?: string;
}

interface SupervisorEmployeeCardProps {
  employee: SupervisorEmployee;
  onClick?: (employee: SupervisorEmployee) => void;
  showActions?: boolean;
  className?: string;
}

export const SupervisorEmployeeCard: React.FC<SupervisorEmployeeCardProps> = ({
  employee,
  onClick,
  showActions = false,
  className = "",
}) => {
  const statusLabels = {
    present: "Presente",
    absent: "Ausente",
    late: "Tarde",
    on_break: "En descanso",
    overtime: "Horas extra",
    off_duty: "Fuera de turno",
  };

  const statusColors = {
    present: "success",
    absent: "error",
    late: "warning",
    on_break: "info",
    overtime: "success",
    off_duty: "neutral",
  } as const;

  return (
    <div
      className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`}
      onClick={() => onClick?.(employee)}
    >
      <SupervisorCard title={employee.name}>
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-token-surface-hover flex items-center justify-center">
                <span className="text-sm font-medium text-token-text-primary">
                  {employee.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-token-text-primary truncate">
              {employee.name}
            </h3>
            <p className="text-sm text-token-text-secondary truncate">
              {employee.position} • {employee.area}
            </p>
            <div className="mt-1">
              <SupervisorStatusBadge status={statusColors[employee.status]}>
                {statusLabels[employee.status]}
              </SupervisorStatusBadge>
            </div>
            {employee.lastActivity && (
              <p className="text-xs text-token-text-tertiary mt-1">
                Última actividad: {employee.lastActivity}
              </p>
            )}
          </div>

          {showActions && (
            <div className="shrink-0">
              <svg
                className="w-5 h-5 text-token-text-tertiary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          )}
        </div>
      </SupervisorCard>
    </div>
  );
};
