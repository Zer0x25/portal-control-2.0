import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEditTimestampModalController } from "../../../features/time-control/hooks/useEditTimestampModalController";

const {
  useStoreMock,
  useTimestampEditorMock,
  storeState,
  editorState,
  closeEditTimestampModalMock,
} = vi.hoisted(() => ({
  useStoreMock: vi.fn(),
  useTimestampEditorMock: vi.fn(),
  closeEditTimestampModalMock: vi.fn(),
  storeState: {
    isEditTimestampModalOpen: true,
    editingRecordInfo: { field: "entrada" },
  },
  editorState: {
    value: "08:30",
    setValue: vi.fn(),
    error: undefined as string | undefined,
    formProps: {
      id: "edit-timestamp-form",
      noValidate: true as const,
      onSubmit: vi.fn(),
      "data-app-form": "edit-timestamp-form",
    },
    isLoading: false,
    maxTimeForExit: "20:00",
  },
}));

vi.mock("../../../store/useStore", () => ({
  useStore: (selector: (s: unknown) => unknown) =>
    useStoreMock(
      selector({
        ...storeState,
        closeEditTimestampModal: closeEditTimestampModalMock,
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
    expect(result.current.formProps).toBe(editorState.formProps);
    expect(result.current.maxTimeForExit).toBe("20:00");
  });

  it("exposes the field error so the view can paint it next to the input", () => {
    useStoreMock.mockImplementation((result) => result);
    useTimestampEditorMock.mockReturnValue({ ...editorState, error: "La hora es obligatoria." });

    const { result } = renderHook(() => useEditTimestampModalController());

    expect(result.current.error).toBe("La hora es obligatoria.");
  });

  it("falls back to generic label when field is unknown", () => {
    useStoreMock.mockImplementation((result) => result);
    useTimestampEditorMock.mockReturnValue(editorState);
    storeState.editingRecordInfo = { field: "unknown" };

    const { result } = renderHook(() => useEditTimestampModalController());

    expect(result.current.fieldLabel).toBe("Marcaje");
  });
});
