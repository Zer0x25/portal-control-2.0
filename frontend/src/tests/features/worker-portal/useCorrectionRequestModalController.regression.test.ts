import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCorrectionRequestModalController } from "../../../features/worker-portal/hooks/useCorrectionRequestModalController";

const { addToastMock, addCorrectionRequestMock, onCloseMock, fileToBase64Mock } = vi.hoisted(
  () => ({
    addToastMock: vi.fn(),
    addCorrectionRequestMock: vi.fn(),
    onCloseMock: vi.fn(),
    fileToBase64Mock: vi.fn(),
  }),
);

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/useScheduling", () => ({
  useScheduling: () => ({ addCorrectionRequest: addCorrectionRequestMock }),
}));

vi.mock("../../../utils/fileUtils", () => ({
  fileToBase64: (...args: unknown[]) => fileToBase64Mock(...args),
}));

vi.mock("../../../hooks/useBusinessNow", () => ({
  getBusinessNow: () => new Date("2026-03-06T15:45:00.000Z"),
}));

function makeRecord() {
  return {
    id: "r1",
    employeeId: "e1",
    entrada: "2026-03-05T08:00:00.000Z",
  } as unknown as import("../../../types").DailyTimeRecord;
}

describe("useCorrectionRequestModalController antiregresión (spec 028)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza datetime con formato inválido sin llamar al backend", async () => {
    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: makeRecord(),
        field: "entrada",
      }),
    );

    act(() => {
      result.current.setReason("Motivo válido");
      result.current.setRequestedValue("no-es-fecha");
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(addToastMock).toHaveBeenCalledWith(
      "La fecha y hora solicitadas no tienen un formato válido.",
      "warning",
    );
    expect(addCorrectionRequestMock).not.toHaveBeenCalled();
  });

  it("rechaza archivo mayor a 5MB y limpia el input", async () => {
    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: makeRecord(),
        field: "entrada",
      }),
    );

    const bigFile = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });
    const target = { value: "algo" } as unknown as HTMLInputElement;
    const event = {
      target: { ...target, files: [bigFile], value: "algo" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(event);
    });

    expect(addToastMock).toHaveBeenCalledWith("El archivo no debe exceder los 5MB.", "error");
    expect(result.current.attachment).toBeNull();
  });

  it("muestra error si falla la conversión a base64 y no envía", async () => {
    addCorrectionRequestMock.mockResolvedValue(true);
    fileToBase64Mock.mockRejectedValueOnce(new Error("booom"));
    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: makeRecord(),
        field: "entrada",
      }),
    );

    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    const event = {
      target: { files: [file], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    act(() => {
      result.current.handleFileChange(event);
    });

    act(() => {
      result.current.setReason("Motivo válido");
      result.current.setRequestedValue("2026-03-05T09:00");
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(addToastMock).toHaveBeenCalledWith("Error al procesar el archivo adjunto.", "error");
    expect(addCorrectionRequestMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
