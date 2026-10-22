import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
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

const setup = () => {
  addNoteMock.mockResolvedValue(true);
  useQuickNotesMock.mockReturnValue({
    notes: [],
    isLoadingNotes: false,
    addNote: addNoteMock,
    deleteNote: deleteNoteMock,
  });
  useAuthMock.mockReturnValue({ currentUser: { username: "ana", role: "Supervisor" } });
};

/**
 * Spec 036 T11 (AC1, AC2, AC3, T13): el formulario de nota rapida vive en
 * `useAppForm`. Antes un texto vacio volvia atras **sin decir nada** (el
 * boton estaba deshabilitado); ahora el contenido vacio es un error de campo.
 */
describe("useQuickNotesModalController", () => {
  it("adds note and clears input on success", async () => {
    setup();

    const { result } = renderHook(() => useQuickNotesModalController());

    act(() => {
      result.current.handleContentChange("Nota importante");
      result.current.handleColorChange("emerald");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(addNoteMock).toHaveBeenCalledWith("Nota importante", "emerald");
    });
    expect(result.current.values.content).toBe("");
    expect(result.current.values.color).toBe("emerald");
  });

  it("marca el contenido vacio como error de campo", async () => {
    setup();

    const { result } = renderHook(() => useQuickNotesModalController());

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.getError("content")).toBe("El contenido es obligatorio.");
    });
    expect(addNoteMock).not.toHaveBeenCalled();
  });

  it("allows deletion for owner or admin", () => {
    setup();
    useAuthMock.mockReturnValue({ currentUser: { username: "admin", role: "Administrador" } });

    const { result } = renderHook(() => useQuickNotesModalController());

    expect(result.current.canDelete("other-user")).toBe(true);
    expect(result.current.canDelete("admin")).toBe(true);
  });
});
