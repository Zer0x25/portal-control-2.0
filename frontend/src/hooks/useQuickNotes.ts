import { useStore } from "../store/useStore";
import { useNoteMutations } from "./useNoteMutations";
import { useNotesQuery } from "./queries/useNotesQuery";
import { idFactory } from "../utils/idFactory";
import { QuickNote } from "../types/index";

export const useQuickNotes = ({ enabled = true }: { enabled?: boolean } = {}) => {
  // Current user from store
  const currentUser = useStore((state) => state.currentUser);

  // Data from TanStack Query
  const { data: notes = [], isLoading: isLoadingQuery } = useNotesQuery(enabled);

  const {
    createNote: createNoteMutation,
    deleteNote: deleteMutation,
    isPending,
  } = useNoteMutations();

  const addNote = async (content: string, color: string = "amber") => {
    if (!currentUser) return null;
    return createNoteMutation({
      id: idFactory.ulid(),
      content,
      authorUsername: currentUser.username,
      createdAt: Date.now(),
      syncStatus: "synced",
      isDeleted: false,
      color,
      reminderEnabled: true,
    } as unknown as QuickNote);
  };

  return {
    notes,
    isLoadingNotes: isLoadingQuery || isPending,
    addNote,
    deleteNote: deleteMutation,
  };
};
