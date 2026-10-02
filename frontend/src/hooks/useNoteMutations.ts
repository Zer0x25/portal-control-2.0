import { useMutation, useQueryClient } from "@tanstack/react-query";
import { noteService } from "../services/noteService";
import { useToasts } from "./useToasts";
import { QuickNote } from "../types/index";

export const useNoteMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  const createNoteMutation = useMutation({
    mutationFn: (note: QuickNote) => noteService.create(note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      addToast("Nota creada exitosamente", "success");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => noteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      addToast("Nota eliminada", "info");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  const archiveNoteMutation = useMutation({
    mutationFn: (id: string) => noteService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      addToast("Nota archivada", "info");
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  return {
    createNote: createNoteMutation.mutateAsync,
    archiveNote: archiveNoteMutation.mutateAsync,
    deleteNote: deleteNoteMutation.mutateAsync,
    isPending:
      createNoteMutation.isPending || archiveNoteMutation.isPending || deleteNoteMutation.isPending,
  };
};
