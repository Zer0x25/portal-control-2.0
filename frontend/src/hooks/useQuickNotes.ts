import { useStore } from "../store/useStore";
import { useShallow } from "zustand/react/shallow";
import { useNoteMutations } from "./useNoteMutations";
import { useNotesQuery } from "./queries/useNotesQuery";
import { idFactory } from "../utils/idFactory";
import { QuickNote } from "../types/index";

export const useQuickNotes = () => {
  // Current user from store
  const currentUser = useStore((state) => state.currentUser);

  // UI State from Zustand (Modal & Unread only). useShallow: the object
  // selector returns a fresh reference per snapshot; without shallow
  // comparison this loops (Maximum update depth) under rapid store writes
  // such as the initial-sync progress ticks (React #185 -> ErrorBoundary).
  const { isModalOpen, handleOpenQuickNotes, handleCloseQuickNotes, hasUnreadNotes } = useStore(
    useShallow((state) => ({
      isModalOpen: state.isQuickNotesModalOpen,
      handleOpenQuickNotes: state.handleOpenQuickNotes,
      handleCloseQuickNotes: state.handleCloseQuickNotes,
      hasUnreadNotes: state.hasUnreadNotes,
    })),
  );

  // Data from TanStack Query
  const { data: notes = [], isLoading: isLoadingQuery } = useNotesQuery();

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
    isModalOpen,
    handleOpenQuickNotes,
    handleCloseQuickNotes,
    hasUnreadNotes,
  };
};
