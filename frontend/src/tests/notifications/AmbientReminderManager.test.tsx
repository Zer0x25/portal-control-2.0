import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuickNote } from "../../types/index";
import AmbientReminderManager from "../../notifications/components/AmbientReminderManager";

const { useQuickNotesMock, playMock } = vi.hoisted(() => ({
  useQuickNotesMock: vi.fn(),
  playMock: vi.fn(),
}));

vi.mock("../../hooks/useQuickNotes", () => ({
  useQuickNotes: (options?: { enabled?: boolean }) => useQuickNotesMock(options),
}));

vi.mock("../../hooks/useAudio", () => ({
  useAudio: () => ({ play: playMock }),
}));

const STORAGE_KEY = "portal_reminder_next_trigger";
const now = new Date("2026-10-23T12:00:00.000Z");

describe("AmbientReminderManager notes query timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    localStorage.clear();
    useQuickNotesMock.mockReset();
    playMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers the query until one minute before the next reminder", async () => {
    localStorage.setItem(STORAGE_KEY, String(now.getTime() + 120_000));
    useQuickNotesMock.mockReturnValue({ notes: [], isLoadingNotes: false });

    render(<AmbientReminderManager />);
    expect(useQuickNotesMock).toHaveBeenLastCalledWith({ enabled: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999);
    });
    expect(useQuickNotesMock).toHaveBeenLastCalledWith({ enabled: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(useQuickNotesMock).toHaveBeenLastCalledWith({ enabled: true });
  });

  it("keeps a due reminder until its notes query finishes", async () => {
    const triggerAt = now.getTime() + 20_000;
    localStorage.setItem(STORAGE_KEY, String(triggerAt));
    let isLoadingNotes = true;
    let notes: QuickNote[] = [];
    useQuickNotesMock.mockImplementation((options?: { enabled?: boolean }) => ({
      notes: options?.enabled ? notes : [],
      isLoadingNotes: Boolean(options?.enabled && isLoadingNotes),
    }));

    const { rerender } = render(<AmbientReminderManager />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(useQuickNotesMock).toHaveBeenLastCalledWith({ enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(Number(localStorage.getItem(STORAGE_KEY))).toBe(triggerAt);
    expect(screen.queryByText("Recordatorio listo")).not.toBeInTheDocument();

    notes = [
      {
        id: "note-1",
        content: "Recordatorio listo",
        authorUsername: "ana",
        createdAt: now.getTime(),
        reminderEnabled: true,
      } as QuickNote,
    ];
    isLoadingNotes = false;
    rerender(<AmbientReminderManager />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("Recordatorio listo")).toBeInTheDocument();
    expect(Number(localStorage.getItem(STORAGE_KEY))).toBe(triggerAt);
    expect(playMock).toHaveBeenCalledWith("pop");
  });
});
