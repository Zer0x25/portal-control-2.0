import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  healthService,
  type AdminStats,
  type AutoCloseDiagnosis,
} from "../../../services/healthService";
import { useAppForm } from "../../../hooks/useAppForm";
import { useStore } from "../../../store/useStore";
import { useShallow } from "zustand/react/shallow";
import { queryKeys } from "../../../lib/queryKeys";
import {
  adminResetPasswordFormSchema,
  purgeSessionsFormSchema,
  type AdminResetPasswordFormValues,
  type PurgeSessionsFormValues,
} from "../../../schemas/forms/auth";

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

  /**
   * Spec 036 T12 (AC1, AC2): los dos campos de texto del panel de
   * mantenimiento pasan a `useAppForm`.
   *
   * Antes `purgeUsername`, `resetUsername` y `newPassword` eran tres
   * `useState` y la regla de reseteo era un `if` delante del `fetch`: si
   * faltaba algo salia un toast generico y ningun campo lo senalaba.
   * Ahora el estado vive en los formularios y las reglas en los schemas
   * (`purgeSessionsFormSchema` y `adminResetPasswordFormSchema`).
   *
   * Los flags `isPurgingSessions`/`isResettingPassword` siguen siendo estado
   * de **accion** (no de formulario): el `window.confirm` se resuelve antes
   * de marcarlos, igual que antes.
   */
  const purgeForm = useAppForm<PurgeSessionsFormValues>({
    schema: purgeSessionsFormSchema,
    defaultValues: { username: "" },
    onSubmit: async (values) => {
      if (!window.confirm("Se purgaran sesiones activas. Deseas continuar?")) return;
      setIsPurgingSessions(true);
      try {
        const result = await healthService.purgeSessions(values.username);
        addToast(result.data?.message || "Sesiones purgadas", "success");
        await fetchStats();
      } catch (error: unknown) {
        addToast(error instanceof Error ? error.message : "Error purgando sesiones", "error");
      } finally {
        setIsPurgingSessions(false);
      }
    },
  });

  const resetForm = useAppForm<AdminResetPasswordFormValues>({
    schema: adminResetPasswordFormSchema,
    defaultValues: { username: "", newPassword: "" },
    // La contrasena no se recorta (spec 036 T13); el usuario si, como se
    // hacia antes (`resetUsername.trim()`), y eso vive en `serialize`.
    normalize: (values) => values,
    serialize: (values) => ({
      username: values.username.trim(),
      newPassword: values.newPassword,
    }),
    // El aviso por toast se conserva (era la señal que existia antes de la
    // migracion) y ahora lleva el mensaje del schema; la vista pinta ademas
    // el error al lado de cada campo (spec 036 AC3).
    onInvalid: (errors) =>
      addToast(
        errors.username ??
          errors.newPassword ??
          "Usuario y password >= 6 caracteres son obligatorios",
        "error",
      ),
    onSubmit: async (values) => {
      setIsResettingPassword(true);
      try {
        const result = await healthService.resetPassword(values.username, values.newPassword);
        addToast(result.data?.message || "Password actualizado", "success");
        // Solo se limpia la contrasena; el usuario se queda como se escribio.
        resetForm.reset({ username: resetForm.values.username, newPassword: "" });
        await fetchStats();
      } catch (error: unknown) {
        addToast(error instanceof Error ? error.message : "Error reseteando password", "error");
      } finally {
        setIsResettingPassword(false);
      }
    },
  });

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
    purgeUsername: purgeForm.values.username ?? "",
    resetUsername: resetForm.values.username,
    newPassword: resetForm.values.newPassword,
    purgeUsernameError: purgeForm.getError("username"),
    resetUsernameError: resetForm.getError("username"),
    newPasswordError: resetForm.getError("newPassword"),
    isBackupListOpen,
    setPurgeUsername: (value: string) => purgeForm.setValue("username", value),
    setResetUsername: (value: string) => resetForm.setValue("username", value),
    setNewPassword: (value: string) => resetForm.setValue("newPassword", value),
    setIsBackupListOpen,
    purgeFormProps: purgeForm.formProps,
    resetFormProps: resetForm.formProps,
    handleDiagnose,
    handleTriggerAutoClose,
    handleTriggerBackup,
    handleMasterReset,
    handleTriggerAccountingAutoClose,
    handleRestartBackend,
  };
};
