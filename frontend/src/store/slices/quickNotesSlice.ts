import { StateCreator } from "zustand";
import { AppState } from "../types";

export interface QuickNotesSlice {
  isQuickNotesModalOpen: boolean;
  hasUnreadNotes: boolean;
  handleOpenQuickNotes: () => void;
  handleCloseQuickNotes: () => void;
  handleQuickNoteSocketEvent: (event: unknown) => void;
}

export const createQuickNotesSlice: StateCreator<AppState, [], [], QuickNotesSlice> = (
  set,
  get,
) => ({
  isQuickNotesModalOpen: false,
  hasUnreadNotes: false,

  handleOpenQuickNotes: () => {
    set({ isQuickNotesModalOpen: true, hasUnreadNotes: false });
  },

  handleCloseQuickNotes: () => {
    set({ isQuickNotesModalOpen: false });
  },

  handleQuickNoteSocketEvent: (data: unknown) => {
    const state = get();
    // Only care if it's a new note (not deletion) and modal is closed.
    // A deletion event carries no payload, so fall back to an empty object.
    const payload = (data ?? {}) as { id?: unknown };
    if (payload.id && Object.keys(payload).length > 1 && !state.isQuickNotesModalOpen) {
      set({ hasUnreadNotes: true });
    }
  },
});
