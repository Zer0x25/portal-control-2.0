import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useQuickNotesModalController } from "../../../features/dashboard/hooks/useQuickNotesModalController";

const { useQuickNotesMock, useAuthMock, addNoteMock, deleteNoteMock } = vi.hoisted(() => ({
  useQuickNotesMock: vi.fn(),
  useAuthMock: vi.fn(),
  addNoteMock: vi.fn(),
  deleteNoteMock: vi.fn(),
}));

vi.mock("../../../hooks/useQuickNotes", () => ({
  useQuickNotes: () => useQuickNotesMock(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

describe("useQuickNotesModalController", () => {
  it("adds note and clears input on success", async () => {
    addNoteMock.mockResolvedValue(true);
    useQuickNotesMock.mockReturnValue({
      notes: [],
      isLoadingNotes: false,
      addNote: addNoteMock,
      deleteNote: deleteNoteMock,
    });
    useAuthMock.mockReturnValue({ currentUser: { username: "ana", role: "Supervisor" } });

    const { result } = renderHook(() => useQuickNotesModalController());

    act(() => {
      result.current.setNewNoteContent("Nota importante");
      result.current.setSelectedColor("emerald");
    });

    await act(async () => {
      await result.current.handleAddNote({ preventDefault: vi.fn() } as any);
    });

    expect(addNoteMock).toHaveBeenCalledWith("Nota importante", "emerald");
    expect(result.current.newNoteContent).toBe("");
  });

  it("allows deletion for owner or admin", () => {
    useQuickNotesMock.mockReturnValue({
      notes: [],
      isLoadingNotes: false,
      addNote: addNoteMock,
      deleteNote: deleteNoteMock,
    });
    useAuthMock.mockReturnValue({ currentUser: { username: "admin", role: "Administrador" } });

    const { result } = renderHook(() => useQuickNotesModalController());

    expect(result.current.canDelete("other-user")).toBe(true);
    expect(result.current.canDelete("admin")).toBe(true);
  });
});
