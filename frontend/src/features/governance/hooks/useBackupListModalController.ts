import { useEffect, useState } from "react";
import { healthService } from "../../../services/healthService";
import type { BackupFile } from "../../../types";
import { useStore } from "../../../store/useStore";
import { useShallow } from "zustand/react/shallow";

interface BackupListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const useBackupListModalController = ({ isOpen, onClose }: BackupListModalProps) => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useStore(
    useShallow((s) => ({
      addToast: s.addToast,
    })),
  );

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  const fetchBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthService.getBackups();
      setBackups(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar backups";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (
      !window.confirm(
        `ADVERTENCIA: ¿Estás seguro de restaurar el backup ${filename}?\n\nEsta acción ELIMINARÁ todos los datos actuales y los reemplazará con el contenido del respaldo.\n\nEsta acción NO se puede deshacer.`,
      )
    ) {
      return;
    }

    if (!window.confirm("CONFIRMACIÓN FINAL: ¿Realmente deseas sobrescribir la base de datos?")) {
      return;
    }

    setRestoring(filename);
    try {
      addToast(
        "Iniciando restauración... El sistema puede no responder por unos segundos.",
        "info",
      );
      await healthService.restoreBackup(filename);
      addToast(
        "Restauración completada. Se cerrarán las sesiones activas y el backend se reiniciará automáticamente.",
        "success",
      );
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al restaurar backup";
      addToast(message, "error");
    } finally {
      setRestoring(null);
    }
  };

  return {
    backups,
    loading,
    restoring,
    error,
    handleRestore,
  };
};
