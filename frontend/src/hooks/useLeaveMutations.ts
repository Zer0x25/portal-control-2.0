import { useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";
import { useToasts } from "./useToasts";
import { LeaveRecord } from "../types/scheduling";

export const useLeaveMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  type CreateLeavePayload = Omit<
    LeaveRecord,
    "id" | "lastModified" | "syncStatus" | "isDeleted"
  > & { id?: string };

  const createLeaveMutation = useMutation({
    mutationFn: (leave: CreateLeavePayload) => leaveService.createLeave(leave),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      addToast("Ausencia registrada exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (id: string) => leaveService.deleteLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      addToast("Ausencia finalizada exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  return {
    createLeave: createLeaveMutation.mutateAsync,
    deleteLeave: deleteLeaveMutation.mutateAsync,
    isPending: createLeaveMutation.isPending || deleteLeaveMutation.isPending,
  };
};
