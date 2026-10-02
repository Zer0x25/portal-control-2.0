import { UserRole } from "./user";
import { Syncable } from "./common";

/**
 * 🎯 SUPERVISOR TYPES - Sistema de Types Consistente para Supervisor Dashboard
 * Define tipos específicos para funcionalidades de supervisor con validación granular
 */

// ============================================================================
// ROLES Y PERMISOS
// ============================================================================

export type SupervisorRole = Extract<UserRole, "Supervisor" | "Supervisor_Elevado">;

export interface SupervisorPermissions {
  // Permisos de visualización
  canViewAnalytics: boolean;
  canViewKPIs: boolean;
  canViewReports: boolean;
  canViewTimeRecords: boolean;

  // Permisos de acción
  canEditTimeRecords: boolean;
  canApproveCorrections: boolean;
  canBlockEmployees: boolean;
  canManageShifts: boolean;

  // Permisos administrativos (solo Supervisor_Elevado)
  canManageUsers: boolean;
  canConfigureSystem: boolean;
  canAccessAuditLogs: boolean;
}

// ============================================================================
// DASHBOARD Y ANALYTICS
// ============================================================================

export interface SupervisorDashboardConfig {
  id: string;
  supervisorId: string;
  theme: "light" | "dark" | "auto";
  language: "es" | "en";
  timezone: string;
  notifications: SupervisorNotificationSettings;
  widgets: SupervisorWidgetConfig[];
  layout: SupervisorLayoutConfig;
}

export interface SupervisorNotificationSettings {
  email: boolean;
  push: boolean;
  anomalies: boolean;
  overtime: boolean;
  absences: boolean;
  shiftChanges: boolean;
}

export interface SupervisorWidgetConfig {
  id: string;
  type: SupervisorWidgetType;
  position: { x: number; y: number; w: number; h: number };
  settings: Record<string, unknown>;
  enabled: boolean;
}

export type SupervisorWidgetType =
  | "attendance_overview"
  | "kpi_summary"
  | "recent_activity"
  | "employee_status"
  | "shift_schedule"
  | "alerts_notifications"
  | "time_tracking"
  | "performance_metrics";

export interface SupervisorLayoutConfig {
  columns: number;
  gap: number;
  responsive: boolean;
}

// ============================================================================
// ACCIONES Y OPERACIONES
// ============================================================================

export type SupervisorAction =
  | "view_dashboard"
  | "view_analytics"
  | "view_kpis"
  | "view_reports"
  | "edit_time_record"
  | "approve_correction"
  | "block_employee"
  | "manage_shift"
  | "manage_user"
  | "configure_system"
  | "access_audit";

export interface SupervisorActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: SupervisorError;
  timestamp: number;
  action: SupervisorAction;
}

export interface SupervisorError {
  code: SupervisorErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

export type SupervisorErrorCode =
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "DATA_NOT_FOUND"
  | "OPERATION_FAILED"
  | "RATE_LIMITED"
  | "SYSTEM_MAINTENANCE";

// ============================================================================
// ESTADOS Y FILTROS
// ============================================================================

export interface SupervisorFilterState {
  dateRange: {
    start: Date;
    end: Date;
  };
  employees: string[];
  areas: string[];
  shifts: string[];
  status: SupervisorEmployeeStatus[];
  search: string;
}

export type SupervisorEmployeeStatus =
  | "present"
  | "absent"
  | "late"
  | "on_break"
  | "overtime"
  | "off_duty";

export interface SupervisorViewState {
  currentTab: SupervisorTab;
  filters: SupervisorFilterState;
  sortBy: SupervisorSortField;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const SUPERVISOR_TABS = {
  dashboard: "dashboard",
  analytics: "analytics",
  kpis: "kpis",
  reports: "reports",
  employees: "employees",
  shifts: "shifts",
} as const;

export type SupervisorTab = (typeof SUPERVISOR_TABS)[keyof typeof SUPERVISOR_TABS];

export type SupervisorSortField =
  | "name"
  | "status"
  | "lastActivity"
  | "totalHours"
  | "efficiency"
  | "createdAt";

// ============================================================================
// REPORTES Y ANALYTICS
// ============================================================================

export interface SupervisorReport extends Syncable {
  id: string;
  title: string;
  type: SupervisorReportType;
  supervisorId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: SupervisorFilterState;
  data: SupervisorReportData;
  generatedAt: number;
  expiresAt?: number;
}

export type SupervisorReportType =
  | "attendance_summary"
  | "efficiency_report"
  | "overtime_analysis"
  | "absence_patterns"
  | "shift_compliance"
  | "custom_report";

export interface SupervisorReportData {
  summary: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    overtimeHours: number;
  };
  charts: SupervisorChartData[];
  tables: SupervisorTableData[];
  insights: SupervisorInsight[];
}

export interface SupervisorChartData {
  id: string;
  type: "line" | "bar" | "pie" | "doughnut" | "area";
  title: string;
  data: unknown;
  config: Record<string, unknown>;
}

export interface SupervisorTableData {
  id: string;
  title: string;
  columns: SupervisorTableColumn[];
  rows: Record<string, unknown>[];
}

export interface SupervisorTableColumn {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "boolean" | "status";
  sortable: boolean;
}

export interface SupervisorInsight {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  description: string;
  actionable: boolean;
  priority: "low" | "medium" | "high" | "critical";
}

// ============================================================================
// HOOKS Y ESTADOS
// ============================================================================

export interface SupervisorHookState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: SupervisorError | null;
  lastUpdated: number | null;
}

export interface SupervisorMutationState {
  pending: boolean;
  error: SupervisorError | null;
  lastAttempt: number | null;
}

// ============================================================================
// VALIDACIÓN Y SCHEMAS
// ============================================================================

export const SUPERVISOR_ROLE_HIERARCHY: Record<SupervisorRole, number> = {
  Supervisor: 1,
  Supervisor_Elevado: 2,
};

export const SUPERVISOR_PERMISSIONS_BY_ROLE: Record<SupervisorRole, SupervisorPermissions> = {
  Supervisor: {
    canViewAnalytics: true,
    canViewKPIs: true,
    canViewReports: true,
    canViewTimeRecords: true,
    canEditTimeRecords: false,
    canApproveCorrections: false,
    canBlockEmployees: false,
    canManageShifts: false,
    canManageUsers: false,
    canConfigureSystem: false,
    canAccessAuditLogs: false,
  },
  Supervisor_Elevado: {
    canViewAnalytics: true,
    canViewKPIs: true,
    canViewReports: true,
    canViewTimeRecords: true,
    canEditTimeRecords: true,
    canApproveCorrections: true,
    canBlockEmployees: true,
    canManageShifts: true,
    canManageUsers: false,
    canConfigureSystem: false,
    canAccessAuditLogs: true,
  },
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SupervisorId = string;
export type SupervisorActionId = string;
export type SupervisorReportId = string;
export type SupervisorWidgetId = string;

// Type guards
export const isSupervisorRole = (role: UserRole): role is SupervisorRole => {
  return role === "Supervisor" || role === "Supervisor_Elevado";
};

export const hasSupervisorPermission = (
  role: SupervisorRole,
  permission: keyof SupervisorPermissions,
): boolean => {
  return SUPERVISOR_PERMISSIONS_BY_ROLE[role][permission];
};

// Helper para verificar jerarquía de roles
export const canSupervisorPerformAction = (
  userRole: SupervisorRole,
  requiredRole: SupervisorRole,
): boolean => {
  return SUPERVISOR_ROLE_HIERARCHY[userRole] >= SUPERVISOR_ROLE_HIERARCHY[requiredRole];
};

// ============================================================================
// BACKEND RESPONSE TYPES - Tipos para respuestas del backend
// ============================================================================

export interface BackendAnomaly {
  id: string;
  employeeName: string;
  date: string;
  status: string;
}

export interface BackendPendingCorrection {
  id: string;
  employeeId: string;
  timeRecordId: string;
}

export interface ValidateClosureResponse {
  allowed: boolean;
  details?: {
    anomalies: BackendAnomaly[];
    pendingCorrections: BackendPendingCorrection[];
    total: number;
  };
}
