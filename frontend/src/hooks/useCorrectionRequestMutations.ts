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
    onMutate: async ({ id, status, resolvedBy, rejectionReason }) => {
      await queryClient.cancelQueries({ queryKey: ["correctionRequests"] });

      const previousQueries = queryClient.getQueriesData<{
        pages: Array<{ requests: CorrectionRequest[]; total: number }>;
        pageParams: unknown[];
      }>({ queryKey: ["correctionRequests"] });

      const previousStats = queryClient.getQueryData<{
        pending: number;
        approved: number;
        rejected: number;
      }>(["correctionRequests", "stats"]);

      queryClient.setQueriesData<{
        pages: Array<{ requests: CorrectionRequest[]; total: number }>;
        pageParams: unknown[];
      }>({ queryKey: ["correctionRequests"] }, (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            requests: page.requests.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: status as CorrectionRequest["status"],
                    resolvedBy,
                    rejectionReason: rejectionReason ?? r.rejectionReason,
                    resolvedAt: Date.now(),
                  }
                : r,
            ),
          })),
        };
      });

      if (previousStats) {
        queryClient.setQueryData(
          ["correctionRequests", "stats"],
          (old: { pending: number; approved: number; rejected: number } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pending: Math.max(0, old.pending - 1),
              approved: status === "approved" ? old.approved + 1 : old.approved,
              rejected: status === "rejected" ? old.rejected + 1 : old.rejected,
            };
          },
        );
      }

      return { previousQueries, previousStats };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
      if (context?.previousStats) {
        queryClient.setQueryData(["correctionRequests", "stats"], context.previousStats);
      }
      addToast(`Error al actualizar solicitud: ${error.message}`, "error");
    },
    onSuccess: () => {
      addToast("Estado de solicitud actualizado", "success");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["correctionRequests"] });
    },
  });

  return {
    addCorrectionRequest: createMutation.mutateAsync,
    updateRequestStatus: updateStatusMutation.mutateAsync,
    isPending: createMutation.isPending || updateStatusMutation.isPending,
  };
};
