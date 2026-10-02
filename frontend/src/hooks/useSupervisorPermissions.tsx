import React, { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  SupervisorRole,
  SupervisorPermissions,
  SupervisorAction,
  SUPERVISOR_PERMISSIONS_BY_ROLE,
  isSupervisorRole,
  canSupervisorPerformAction,
  SupervisorError,
} from "../types/supervisor";

/**
 * 🎯 useSupervisorPermissions - Hook para gestión de permisos de supervisor
 * Proporciona una API consistente para verificar permisos basados en roles
 */
export const useSupervisorPermissions = () => {
  const { currentUser } = useAuth();

  const supervisorData = useMemo(() => {
    if (!currentUser || !isSupervisorRole(currentUser.role)) {
      return {
        isSupervisor: false,
        role: null as SupervisorRole | null,
        permissions: null as SupervisorPermissions | null,
        canPerformAction: () => false,
        hasPermission: () => false,
      };
    }

    const role = currentUser.role;
    const permissions = SUPERVISOR_PERMISSIONS_BY_ROLE[role];

    return {
      isSupervisor: true,
      role,
      permissions,
      canPerformAction: (action: SupervisorAction, requiredRole?: SupervisorRole): boolean => {
        if (requiredRole) {
          return canSupervisorPerformAction(role, requiredRole);
        }

        // Map actions to permissions
        const actionPermissionMap: Record<SupervisorAction, keyof SupervisorPermissions> = {
          view_dashboard: "canViewAnalytics",
          view_analytics: "canViewAnalytics",
          view_kpis: "canViewKPIs",
          view_reports: "canViewReports",
          edit_time_record: "canEditTimeRecords",
          approve_correction: "canApproveCorrections",
          block_employee: "canBlockEmployees",
          manage_shift: "canManageShifts",
          manage_user: "canManageUsers",
          configure_system: "canConfigureSystem",
          access_audit: "canAccessAuditLogs",
        };

        const requiredPermission = actionPermissionMap[action];
        return requiredPermission ? permissions[requiredPermission] : false;
      },
      hasPermission: (permission: keyof SupervisorPermissions): boolean => {
        return permissions[permission];
      },
    };
  }, [currentUser]);

  return supervisorData;
};

/**
 * 🎯 useSupervisorAction - Hook para ejecutar acciones con validación de permisos
 * Maneja la lógica de permisos y errores de manera consistente
 */
export const useSupervisorAction = () => {
  const { canPerformAction, isSupervisor } = useSupervisorPermissions();

  const executeAction = async <T = unknown,>(
    action: SupervisorAction,
    actionFn: () => Promise<T>,
    options: {
      requiredRole?: SupervisorRole;
      onPermissionDenied?: () => void;
      onError?: (error: SupervisorError) => void;
    } = {},
  ): Promise<{ success: boolean; data?: T; error?: SupervisorError }> => {
    try {
      // Verificar si es supervisor
      if (!isSupervisor) {
        const error: SupervisorError = {
          code: "PERMISSION_DENIED",
          message: "Solo usuarios con rol de supervisor pueden realizar esta acción",
          recoverable: false,
        };
        options.onPermissionDenied?.();
        options.onError?.(error);
        return { success: false, error };
      }

      // Verificar permisos específicos
      if (!canPerformAction(action, options.requiredRole)) {
        const error: SupervisorError = {
          code: "PERMISSION_DENIED",
          message: "No tienes permisos suficientes para realizar esta acción",
          recoverable: false,
        };
        options.onPermissionDenied?.();
        options.onError?.(error);
        return { success: false, error };
      }

      // Ejecutar la acción
      const data = await actionFn();
      return { success: true, data };
    } catch (error) {
      const supervisorError: SupervisorError = {
        code: "OPERATION_FAILED",
        message: error instanceof Error ? error.message : "Error desconocido",
        recoverable: true,
        details: { originalError: error },
      };
      options.onError?.(supervisorError);
      return { success: false, error: supervisorError };
    }
  };

  return { executeAction };
};

/**
 * 🎯 useSupervisorGuard - Hook para proteger componentes basado en permisos
 * Útil para conditionally render components basado en permisos
 */
export const useSupervisorGuard = (requiredPermission?: keyof SupervisorPermissions) => {
  const { isSupervisor, hasPermission, role } = useSupervisorPermissions();

  const canAccess = useMemo(() => {
    if (!isSupervisor) return false;
    if (!requiredPermission) return true;
    return hasPermission(requiredPermission);
  }, [isSupervisor, hasPermission, requiredPermission]);

  return {
    canAccess,
    isSupervisor,
    role,
    hasPermission,
  };
};

/**
 * 🎯 SupervisorPermissionGate - Componente para proteger contenido
 * Renderiza children solo si el usuario tiene los permisos requeridos
 */
interface SupervisorPermissionGateProps {
  permission?: keyof SupervisorPermissions;
  requiredRole?: SupervisorRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const SupervisorPermissionGate: React.FC<SupervisorPermissionGateProps> = ({
  permission,
  fallback = null,
  children,
}) => {
  const { canAccess } = useSupervisorGuard(permission);

  if (!canAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
