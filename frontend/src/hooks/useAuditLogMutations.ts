import { useMutation, useQueryClient } from "@tanstack/react-query";
import { auditLogService } from "../services/auditLogService";
import { useToasts } from "./useToasts";

export const useAuditLogMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const verifyIntegrity = useMutation({
    mutationFn: () => auditLogService.verifyIntegrity(),
    onSuccess: (data) => {
      addToast(data.message || "Auditoría de integridad iniciada correctamente", "success");
      queryClient.invalidateQueries({ queryKey: ["integrityStatus"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    },
    onError: (error: Error) => {
      addToast(error.message || "Error al iniciar auditoría de integridad", "error");
    },
  });

  const cleanupLogs = useMutation({
    mutationFn: (months: number) => auditLogService.cleanup(months),
    onSuccess: (data) => {
      addToast(data.message || "Limpieza de logs completada", "success");
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    },
    onError: (error: Error) => {
      addToast(error.message || "Error al limpiar logs", "error");
    },
  });

  return {
    verifyIntegrity,
    cleanupLogs,
  };
};
