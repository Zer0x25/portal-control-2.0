import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEditTimestampModalController } from "../../../features/time-control/hooks/useEditTimestampModalController";

const {
  useStoreMock,
  useTimestampEditorMock,
  storeState,
  editorState,
  closeEditTimestampModalMock,
  setNewTimestampValueMock,
} = vi.hoisted(() => ({
  useStoreMock: vi.fn(),
  useTimestampEditorMock: vi.fn(),
  closeEditTimestampModalMock: vi.fn(),
  setNewTimestampValueMock: vi.fn(),
  storeState: {
    isEditTimestampModalOpen: true,
    editingRecordInfo: { field: "entrada" },
    newTimestampValue: "08:30",
  },
  editorState: {
    handleSave: vi.fn(),
    isLoading: false,
    maxTimeForExit: "20:00",
  },
}));

vi.mock("../../../store/useStore", () => ({
  useStore: (selector: (s: any) => unknown) =>
    useStoreMock(
      selector({
        ...storeState,
        closeEditTimestampModal: closeEditTimestampModalMock,
        setNewTimestampValue: setNewTimestampValueMock,
      }),
    ),
}));

vi.mock("../../../hooks/useTimestampEditor", () => ({
  useTimestampEditor: () => useTimestampEditorMock(),
}));

describe("useEditTimestampModalController", () => {
  it("maps store and editor state into the controller shape", () => {
    useStoreMock.mockImplementation((result) => result);
    useTimestampEditorMock.mockReturnValue(editorState);

    const { result } = renderHook(() => useEditTimestampModalController());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.value).toBe("08:30");
    expect(result.current.fieldLabel).toBe("Inicio Jornada");
    expect(result.current.handleSave).toBe(editorState.handleSave);
    expect(result.current.maxTimeForExit).toBe("20:00");
  });

  it("falls back to generic label when field is unknown", () => {
    useStoreMock.mockImplementation((result) => result);
    useTimestampEditorMock.mockReturnValue(editorState);
    storeState.editingRecordInfo = { field: "unknown" };

    const { result } = renderHook(() => useEditTimestampModalController());

    expect(result.current.fieldLabel).toBe("Marcaje");
  });
});
