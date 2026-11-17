import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCorrectionRequestModalController } from "../../../features/worker-portal/hooks/useCorrectionRequestModalController";

const { addToastMock, addCorrectionRequestMock, onCloseMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  addCorrectionRequestMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/useScheduling", () => ({
  useScheduling: () => ({ addCorrectionRequest: addCorrectionRequestMock }),
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

  it("rechaza datetime con formato inválido junto al campo, sin llamar al backend", async () => {
    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: makeRecord(),
        field: "entrada",
      }),
    );

    act(() => {
      result.current.handleReasonChange("Motivo válido");
      result.current.handleRequestedValueChange("no-es-fecha");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.getError("requestedValue")).toBe(
        "Formato de fecha y hora inválido (YYYY-MM-DDTHH:mm)",
      );
    });
    expect(addCorrectionRequestMock).not.toHaveBeenCalled();
  });

  it("AC6: el controlador no ofrece ni conserva manejo de adjuntos", async () => {
    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: makeRecord(),
        field: "entrada",
      }),
    );

    expect(result.current).not.toHaveProperty("handleFileChange");
    expect(result.current).not.toHaveProperty("attachment");
  });

  it("rechaza valor futuro sin llamar al backend (spec 030)", async () => {
    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: makeRecord(),
        field: "entrada",
      }),
    );

    // businessNow mockeado: 2026-03-06T15:45Z → pedir 2026-03-07 es futuro.
    act(() => {
      result.current.handleReasonChange("Motivo válido");
      result.current.handleRequestedValueChange("2026-03-07T09:00");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(
        "No se puede solicitar una corrección con fecha futura.",
        "warning",
      );
    });
    expect(addCorrectionRequestMock).not.toHaveBeenCalled();
  });

  it("expone maxRequestedValue acotado a hoy para el input", async () => {
    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: makeRecord(),
        field: "entrada",
      }),
    );

    expect(result.current.maxRequestedValue).toMatch(/^2026-03-06T/);
  });
});
