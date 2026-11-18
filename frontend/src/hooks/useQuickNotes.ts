import { useStore } from "../store/useStore";
import { useNoteMutations } from "./useNoteMutations";
import { useNotesQuery } from "./queries/useNotesQuery";

export const useQuickNotes = ({ enabled = true }: { enabled?: boolean } = {}) => {
  // Current user from store
  const currentUser = useStore((state) => state.currentUser);

  // Data from TanStack Query
  const { data: notes = [], isLoading: isLoadingQuery } = useNotesQuery(enabled);

  const {
    createNote: createNoteMutation,
    archiveNote: archiveNoteMutation,
    deleteNote: deleteMutation,
    isPending,
  } = useNoteMutations();

  const addNote = async (content: string, color: string = "amber") => {
    if (!currentUser) return null;
    return createNoteMutation({
      content,
      authorUsername: currentUser.username,
      color,
      reminderEnabled: true,
    });
  };

  return {
    notes,
    isLoadingNotes: isLoadingQuery || isPending,
    addNote,
    archiveNote: archiveNoteMutation,
    deleteNote: deleteMutation,
  };
};
