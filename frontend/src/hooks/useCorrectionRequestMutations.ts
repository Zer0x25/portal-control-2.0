import { useMutation, useQueryClient } from "@tanstack/react-query";
import { correctionService } from "../services/correctionService";
import { useToasts } from "./useToasts";
import { CorrectionRequest } from "../types";

export const useCorrectionRequestMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const createMutation = useMutation({
    mutationFn: (request: Partial<CorrectionRequest>) =>
      correctionService.create(request as CorrectionRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correctionRequests"] });
      addToast("Solicitud enviada exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(`Error al enviar solicitud: ${error.message}`, "error");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      resolvedBy,
      rejectionReason,
    }: {
      id: string;
      status: string;
      resolvedBy: string;
      rejectionReason?: string;
    }) => correctionService.updateStatus(id, status, resolvedBy, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correctionRequests"] });
      addToast("Estado de solicitud actualizado", "success");
    },
    onError: (error: Error) => {
      addToast(`Error al actualizar solicitud: ${error.message}`, "error");
    },
  });

  return {
    addCorrectionRequest: createMutation.mutateAsync,
    updateRequestStatus: updateStatusMutation.mutateAsync,
    isPending: createMutation.isPending || updateStatusMutation.isPending,
  };
};
