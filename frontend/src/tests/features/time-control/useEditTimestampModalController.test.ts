import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { DailyTimeRecord, TimeRecordField } from "../../../types";
import { useEditTimestampModalController } from "../../../features/time-control/hooks/useEditTimestampModalController";

const { useTimestampEditorMock, editorState, closeEditTimestampModalMock } = vi.hoisted(() => ({
  useTimestampEditorMock: vi.fn(),
  closeEditTimestampModalMock: vi.fn(),
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

vi.mock("../../../hooks/useTimestampEditor", () => ({
  useTimestampEditor: (...args: unknown[]) => useTimestampEditorMock(...args),
}));

const controllerProps = {
  isOpen: true,
  onClose: closeEditTimestampModalMock,
  editingInfo: {
    record: {
      id: "r1",
      employeeName: "Ana",
      date: "2026-03-01",
      entrada: "2026-03-01T08:00:00.000Z",
    } as DailyTimeRecord,
    field: "entrada" as TimeRecordField,
  },
};

describe("useEditTimestampModalController", () => {
  it("maps controlled modal props and editor state into the controller shape", () => {
    useTimestampEditorMock.mockReturnValue(editorState);

    const { result } = renderHook(() => useEditTimestampModalController(controllerProps));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.value).toBe("08:30");
    expect(result.current.fieldLabel).toBe("Inicio Jornada");
    expect(result.current.formProps).toBe(editorState.formProps);
    expect(result.current.maxTimeForExit).toBe("20:00");
  });

  it("exposes the field error so the view can paint it next to the input", () => {
    useTimestampEditorMock.mockReturnValue({ ...editorState, error: "La hora es obligatoria." });

    const { result } = renderHook(() => useEditTimestampModalController(controllerProps));

    expect(result.current.error).toBe("La hora es obligatoria.");
  });

  it("falls back to generic label when field is unknown", () => {
    useTimestampEditorMock.mockReturnValue(editorState);
    const unknownFieldProps = {
      ...controllerProps,
      editingInfo: { ...controllerProps.editingInfo, field: "unknown" as TimeRecordField },
    };

    const { result } = renderHook(() => useEditTimestampModalController(unknownFieldProps));

    expect(result.current.fieldLabel).toBe("Marcaje");
  });
});
