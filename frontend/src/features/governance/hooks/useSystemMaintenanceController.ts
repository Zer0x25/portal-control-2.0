import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  healthService,
  type AdminStats,
  type AutoCloseDiagnosis,
} from "../../../services/healthService";
import { useStore } from "../../../store/useStore";
import { useShallow } from "zustand/react/shallow";
import { queryKeys } from "../../../lib/queryKeys";

export const useSystemMaintenanceController = () => {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [diagnosis, setDiagnosis] = useState<AutoCloseDiagnosis | null>(null);
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
      setStats(await healthService.getAdminStats());
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
      const result = await healthService.diagnoseAutoClose();
      setDiagnosis(result);
      addToast("Diagnóstico completado", "success");
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Error en diagnóstico", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutoClose = async () => {
    if (!window.confirm("¿Estás seguro de gatillar el cierre automático masivo?")) return;
    setLoading(true);
    addToast("Ejecutando proceso de cierre masivo...", "info");
    try {
      const result = await healthService.triggerAutoClose();
      addToast(`${result.data?.closedCount ?? 0} registros cerrados`, "success");
      await handleDiagnose();
      await fetchStats();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Error al ejecutar cierre", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    setIsRunningBackup(true);
    addToast("Iniciando respaldo de base de datos...", "info");
    try {
      await healthService.triggerBackup();
      addToast("Snapshot manual capturado exitosamente", "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.systemHealth() });
      await fetchStats();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Error ejecutando backup", "error");
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handlePurgeSessions = async () => {
    if (!window.confirm("Se purgaran sesiones activas. Deseas continuar?")) return;
    setIsPurgingSessions(true);
    try {
      const result = await healthService.purgeSessions(purgeUsername.trim() || undefined);
      addToast(result.data?.message || "Sesiones purgadas", "success");
      await fetchStats();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Error purgando sesiones", "error");
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
      const result = await healthService.resetPassword(resetUsername.trim(), newPassword);
      addToast(result.data?.message || "Password actualizado", "success");
      setNewPassword("");
      await fetchStats();
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Error reseteando password", "error");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleMasterReset = async () => {
    if (!window.confirm("Esta accion elimina datos del servidor. Continuar?")) return;
    setIsResettingDatabase(true);
    try {
      await healthService.clearDatabase();
      addToast("Reset de base de datos completado.", "success");
      await fetchStats();
    } catch (error: unknown) {
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
      const result = await healthService.triggerAccountingAutoClose();
      addToast(result.data?.message || "Cierre contable ejecutado.", "success");
    } catch (error: unknown) {
      addToast(error instanceof Error ? error.message : "Error en cierre contable.", "error");
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
