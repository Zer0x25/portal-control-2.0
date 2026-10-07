import { expect, it } from "vitest";
import { createQuickNotesSlice, type QuickNotesSlice } from "../../store/slices/quickNotesSlice";
it("marks unread from a created invalidation without receiving note content", () => {
  let state: QuickNotesSlice;
  const set = (patch: Partial<QuickNotesSlice>) => {
    state = { ...state, ...patch };
  };
  state = createQuickNotesSlice(set as never, (() => state) as never, {} as never);
  state.handleQuickNoteSocketEvent({ changed: true });
  expect(state.hasUnreadNotes).toBe(false);
  state.handleQuickNoteSocketEvent({ changed: true, created: true });
  expect(state.hasUnreadNotes).toBe(true);
  state.handleOpenQuickNotes();
  expect(state.hasUnreadNotes).toBe(false);
  state.handleQuickNoteSocketEvent({ changed: true, created: true });
  expect(state.hasUnreadNotes).toBe(false);
});
