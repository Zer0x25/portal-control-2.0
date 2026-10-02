import React from "react";
import {
  useSupervisorPermissions,
  useSupervisorAction,
  SupervisorPermissionGate,
} from "../../../hooks/useSupervisorPermissions";
import { SUPERVISOR_TABS } from "../../../types/supervisor";

/**
 * 🎯 SupervisorDashboardExample - Ejemplo de uso del Sistema de Types Consistente
 * Demuestra cómo usar los nuevos tipos y hooks de manera consistente
 */
export const SupervisorDashboardExample: React.FC = () => {
  const { isSupervisor, role, canPerformAction, hasPermission } = useSupervisorPermissions();
  const { executeAction } = useSupervisorAction();

  // Ejemplo de verificación de permisos
  const canViewAnalytics = hasPermission("canViewAnalytics");
  const canEditRecords = canPerformAction("edit_time_record");

  // Ejemplo de ejecución de acción con validación
  const handleEditRecord = async (recordId: string) => {
    const result = await executeAction(
      "edit_time_record",
      async () => {
        // Lógica real de edición
        return { success: true, recordId };
      },
      {
        onPermissionDenied: () => {
          console.warn("Permisos insuficientes para editar registro");
        },
        onError: (error) => {
          console.error("Error al editar registro:", error);
        },
      },
    );

    if (result.success) {
      console.warn("Registro editado exitosamente:", result.data);
    }
  };

  // Si no es supervisor, mostrar mensaje
  if (!isSupervisor) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-red-600">Acceso Denegado</h2>
        <p className="text-gray-600 mt-2">
          Solo usuarios con rol de supervisor pueden acceder a esta funcionalidad.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Sistema de Types Consistente - Supervisor Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información del Supervisor */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Información del Supervisor</h3>
            <p className="text-blue-800">
              <strong>Rol:</strong> {role}
            </p>
            <p className="text-blue-800">
              <strong>Permisos de Analytics:</strong> {canViewAnalytics ? "✅" : "❌"}
            </p>
            <p className="text-blue-800">
              <strong>Puede editar registros:</strong> {canEditRecords ? "✅" : "❌"}
            </p>
          </div>

          {/* Acciones Disponibles */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Acciones Disponibles</h3>
            <div className="space-y-2">
              <SupervisorPermissionGate permission="canViewAnalytics">
                <button className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Ver Analytics
                </button>
              </SupervisorPermissionGate>

              <SupervisorPermissionGate permission="canEditTimeRecords">
                <button
                  onClick={() => handleEditRecord("example-record")}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Editar Registro de Tiempo
                </button>
              </SupervisorPermissionGate>

              <SupervisorPermissionGate
                permission="canManageUsers"
                fallback={<div className="text-red-600 text-sm">Requiere permisos elevados</div>}
              >
                <button className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                  Gestionar Usuarios
                </button>
              </SupervisorPermissionGate>
            </div>
          </div>
        </div>

        {/* Lista de Tabs Disponibles */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Tabs Disponibles</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(
              Object.values(
                SUPERVISOR_TABS,
              ) as (typeof SUPERVISOR_TABS)[keyof typeof SUPERVISOR_TABS][]
            ).map((tab) => (
              <SupervisorPermissionGate
                key={tab}
                permission={
                  tab === "analytics"
                    ? "canViewAnalytics"
                    : tab === "kpis"
                      ? "canViewKPIs"
                      : tab === "reports"
                        ? "canViewReports"
                        : "canViewAnalytics" // fallback
                }
                fallback={
                  <div className="bg-gray-100 p-3 rounded text-center text-gray-500">
                    {tab} (Sin permisos)
                  </div>
                }
              >
                <div className="bg-white border border-gray-200 p-3 rounded text-center hover:bg-gray-50 cursor-pointer">
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </div>
              </SupervisorPermissionGate>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboardExample;
