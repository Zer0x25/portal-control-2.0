import { StateCreator } from "zustand";
import { AppState } from "../types";

export interface QuickNotesSlice {
  hasUnreadNotes: boolean;
  clearQuickNotesUnread: () => void;
  handleQuickNoteSocketEvent: (event: unknown) => void;
}

export const createQuickNotesSlice: StateCreator<AppState, [], [], QuickNotesSlice> = (set) => ({
  hasUnreadNotes: false,
  clearQuickNotesUnread: () => set({ hasUnreadNotes: false }),

  handleQuickNoteSocketEvent: (data: unknown) => {
    // Created invalidation contains no note data.
    const created =
      typeof data === "object" && data !== null && "created" in data && data.created === true;
    if (created) set({ hasUnreadNotes: true });
  },
});
