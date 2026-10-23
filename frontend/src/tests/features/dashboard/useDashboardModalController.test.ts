import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useStore } from "../../../store/useStore";
import { useDashboardModalController } from "../../../features/dashboard/hooks/useDashboardModalController";

vi.mock("../../../features/dashboard/hooks/useDashboardClockActions", () => ({
  useDashboardClockActions: () => ({ confirmResponsibleClockOut: vi.fn() }),
}));

describe("useDashboardModalController", () => {
  const originalState = useStore.getState();

  afterEach(() => {
    useStore.setState(originalState, true);
  });

  it("owns quick notes modal state and clears unread signal on open", () => {
    useStore.setState({ hasUnreadNotes: false });
    const { result } = renderHook(() => useDashboardModalController());

    act(() => useStore.getState().handleQuickNoteSocketEvent({ created: true }));
    expect(result.current.hasUnreadNotes).toBe(true);

    act(() => result.current.actions.openQuickNotes());
    expect(result.current.isQuickNotesModalOpen).toBe(true);
    expect(useStore.getState().hasUnreadNotes).toBe(false);

    act(() => useStore.getState().handleQuickNoteSocketEvent({ created: true }));
    expect(useStore.getState().hasUnreadNotes).toBe(false);

    act(() => result.current.actions.closeQuickNotes());
    act(() => useStore.getState().handleQuickNoteSocketEvent({ created: true }));
    expect(result.current.isQuickNotesModalOpen).toBe(false);
    expect(result.current.hasUnreadNotes).toBe(true);
  });
});
