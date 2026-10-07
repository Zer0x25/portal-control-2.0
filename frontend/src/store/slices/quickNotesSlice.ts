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
    // Created invalidation contains no note data.
    const created =
      typeof data === "object" && data !== null && "created" in data && data.created === true;
    if (created && !state.isQuickNotesModalOpen) {
      set({ hasUnreadNotes: true });
    }
  },
});
