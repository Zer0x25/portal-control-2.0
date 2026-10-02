import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "../../../services/authService";
import { API_BASE_URL } from "../../../services/apiBase";
import { healthService } from "../../../services/healthService";
import { useStore } from "../../../store/useStore";
import { useShallow } from "zustand/react/shallow";

interface MaintenanceStats {
  usersCount: number;
  employeesCount: number;
  activeEmployeesCount: number;
  recordsCount: number;
  todayRecordsCount: number;
  auditLogsCount: number;
  criticalLogsCount: number;
  mfaStats: {
    enabled: number;
    disabled: number;
  };
}

interface DiagnosisResult {
  success: boolean;
  message?: string;
  summary: {
    needingAction: number;
    totalChecked: number;
  };
}

export const useSystemMaintenanceController = () => {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [isPurgingSessions, setIsPurgingSessions] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isResettingDatabase, setIsResettingDatabase] = useState(false);
  const [isTriggeringAccountingAutoClose, setIsTriggeringAccountingAutoClose] = useState(false);
  const [purgeUsername, setPurgeUsername] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isBackupListOpen, setIsBackupListOpen] = useState(false);

  const { addToast } = useStore(
    useShallow((s) => ({
      addToast: s.addToast,
    })),
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: authService.getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      addToast("Error al cargar estadísticas", "error");
    }
  }, [addToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDiagnose = async () => {
    setLoading(true);
    addToast("Iniciando diagnóstico huerfano...", "info");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/diagnose-autoclose`, {
        headers: authService.getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) {
        setDiagnosis(data.data);
        addToast("Diagnóstico completado", "success");
      } else {
        addToast(data.data?.message || data.message || "Error en diagnóstico", "error");
      }
    } catch {
      addToast("Error al ejecutar diagnóstico", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutoClose = async () => {
    if (!window.confirm("¿Estás seguro de gatillar el cierre automático masivo?")) return;
    setLoading(true);
    addToast("Ejecutando proceso de cierre masivo...", "info");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/trigger-autoclose`, {
        method: "POST",
        headers: authService.getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) {
        addToast(`${data.data.closedCount} registros cerrados`, "success");
        await handleDiagnose();
        await fetchStats();
      } else {
        addToast(data.data?.message || data.message || "Error al ejecutar cierre", "error");
      }
    } catch {
      addToast("Error al ejecutar cierre", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    setIsRunningBackup(true);
    addToast("Iniciando respaldo de base de datos...", "info");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/trigger-backup`, {
        method: "POST",
        headers: authService.getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) {
        addToast("Snapshot manual capturado exitosamente", "success");
        queryClient.invalidateQueries({ queryKey: ["system", "health"] });
        await fetchStats();
      } else {
        addToast(data.data?.message || data.message || "Error ejecutando backup", "error");
      }
    } catch {
      addToast("Error ejecutando backup", "error");
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handlePurgeSessions = async () => {
    if (!window.confirm("Se purgaran sesiones activas. Deseas continuar?")) return;
    setIsPurgingSessions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/purge-sessions`, {
        method: "POST",
        headers: {
          ...authService.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: purgeUsername.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addToast(data.data?.message || "Sesiones purgadas", "success");
        await fetchStats();
      } else {
        addToast(data.data?.message || data.message || "Error purgando sesiones", "error");
      }
    } catch {
      addToast("Error purgando sesiones", "error");
    } finally {
      setIsPurgingSessions(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUsername.trim() || newPassword.length < 6) {
      addToast("Usuario y password >= 6 caracteres son obligatorios", "error");
      return;
    }
    setIsResettingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reset-password`, {
        method: "POST",
        headers: {
          ...authService.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: resetUsername.trim(),
          newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addToast(data.data?.message || "Password actualizado", "success");
        setNewPassword("");
        await fetchStats();
      } else {
        addToast(data.data?.message || data.message || "Error reseteando password", "error");
      }
    } catch {
      addToast("Error reseteando password", "error");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleMasterReset = async () => {
    if (!window.confirm("Esta accion elimina datos del servidor. Continuar?")) return;
    setIsResettingDatabase(true);
    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/clear-database`, {
        method: "DELETE",
        headers: authService.getAuthHeader(),
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || "Error de servidor en reset.");
      }
      addToast("Reset de base de datos completado.", "success");
      await fetchStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error en reseteo de base de datos.";
      addToast(message, "error");
    } finally {
      setIsResettingDatabase(false);
    }
  };

  const handleTriggerAccountingAutoClose = async () => {
    if (!window.confirm("¿Disparar cierre contable automático ahora?")) return;
    setIsTriggeringAccountingAutoClose(true);
    addToast("Ejecutando cierre contable automático...", "info");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/trigger-accounting-autoclose`, {
        method: "POST",
        headers: authService.getAuthHeader(),
      });
      const data = await response.json();
      if (data.success) {
        addToast(data.data?.message || "Cierre contable ejecutado.", "success");
      } else {
        addToast(data.data?.message || data.message || "Error en cierre contable.", "error");
      }
    } catch {
      addToast("Error en cierre contable.", "error");
    } finally {
      setIsTriggeringAccountingAutoClose(false);
    }
  };

  const handleRestartBackend = async () => {
    if (
      !window.confirm("¿Reiniciar el servidor backend? Esto interrumpirá brevemente el servicio.")
    ) {
      return;
    }

    try {
      addToast("Enviando señal de reinicio...", "info");
      await healthService.restartBackend();
      addToast("Reiniciando... Espera unos segundos.", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      addToast(`Error al reiniciar: ${message}`, "error");
    }
  };

  return {
    stats,
    diagnosis,
    loading,
    isRunningBackup,
    isPurgingSessions,
    isResettingPassword,
    isResettingDatabase,
    isTriggeringAccountingAutoClose,
    purgeUsername,
    resetUsername,
    newPassword,
    isBackupListOpen,
    setPurgeUsername,
    setResetUsername,
    setNewPassword,
    setIsBackupListOpen,
    handleDiagnose,
    handleTriggerAutoClose,
    handleTriggerBackup,
    handlePurgeSessions,
    handleResetPassword,
    handleMasterReset,
    handleTriggerAccountingAutoClose,
    handleRestartBackend,
  };
};
