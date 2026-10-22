import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { toDate } from "date-fns-tz";
import { useCorrectionRequestModalController } from "../../../features/worker-portal/hooks/useCorrectionRequestModalController";

const {
  useToastsMock,
  useSchedulingMock,
  addToastMock,
  addCorrectionRequestMock,
  onCloseMock,
  fileToBase64Mock,
} = vi.hoisted(() => ({
  useToastsMock: vi.fn(),
  useSchedulingMock: vi.fn(),
  addToastMock: vi.fn(),
  addCorrectionRequestMock: vi.fn(),
  onCloseMock: vi.fn(),
  fileToBase64Mock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => useToastsMock(),
}));

vi.mock("../../../hooks/useScheduling", () => ({
  useScheduling: () => useSchedulingMock(),
}));

vi.mock("../../../utils/fileUtils", () => ({
  fileToBase64: (...args: unknown[]) => fileToBase64Mock(...args),
}));

vi.mock("../../../hooks/useBusinessNow", () => ({
  getBusinessNow: () => new Date("2026-03-06T15:45:00.000Z"),
}));

/**
 * Spec 036 T11 (AC1, AC2, AC3, T13): el formulario de solicitud de
 * correccion vive en `useAppForm`. Lo que se fija aqui es lo que la
 * migracion puede romper:
 *
 * 1. **El motivo** ahora es error de campo (AC3), no un toast lejano.
 * 2. **El payload** conserva exactamente los mismos campos (T13), con
 *    `requestedValue` convertido a ISO-8601 con offset.
 * 3. El valor inicial sigue saliendo del registro (o de la hora de negocio).
 */
describe("useCorrectionRequestModalController", () => {
  it("marca el motivo vacio como error de campo", async () => {
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useSchedulingMock.mockReturnValue({ addCorrectionRequest: addCorrectionRequestMock });

    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: {
          id: "r1",
          employeeId: "e1",
          entrada: "2026-03-05T08:00:00.000Z",
        } as unknown as import("../../../types").DailyTimeRecord,
        field: "entrada",
      }),
    );

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.getError("reason")).toBe("El motivo es obligatorio.");
    });
    expect(addCorrectionRequestMock).not.toHaveBeenCalled();
  });

  it("submits request and closes on success", async () => {
    addCorrectionRequestMock.mockResolvedValue(true);
    fileToBase64Mock.mockResolvedValue("base64-data");
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useSchedulingMock.mockReturnValue({ addCorrectionRequest: addCorrectionRequestMock });

    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: {
          id: "r1",
          employeeId: "e1",
          entrada: "2026-03-05T08:00:00.000Z",
        } as unknown as import("../../../types").DailyTimeRecord,
        field: "entrada",
      }),
    );

    act(() => {
      result.current.handleReasonChange("Olvide marcar correctamente");
      result.current.handleRequestedValueChange("2026-03-05T09:00");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(addCorrectionRequestMock).toHaveBeenCalledTimes(1);
    });
    // T13: mismo shape y mismos nombres de campo que antes de la migracion.
    expect(addCorrectionRequestMock).toHaveBeenCalledWith({
      employeeId: "e1",
      timeRecordId: "r1",
      recordField: "entrada",
      originalValue: "2026-03-05T08:00:00.000Z",
      requestedValue: toDate("2026-03-05T09:00:00", {
        timeZone: "America/Santiago",
      }).toISOString(),
      reason: "Olvide marcar correctamente",
      attachment: undefined,
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("uses synchronized business now when there is no original value", () => {
    useToastsMock.mockReturnValue({ addToast: addToastMock });
    useSchedulingMock.mockReturnValue({ addCorrectionRequest: addCorrectionRequestMock });

    const { result } = renderHook(() =>
      useCorrectionRequestModalController({
        isOpen: true,
        onClose: onCloseMock,
        record: {
          id: "r1",
          employeeId: "e1",
          entrada: undefined,
        } as unknown as import("../../../types").DailyTimeRecord,
        field: "entrada",
      }),
    );

    expect(result.current.values.requestedValue).toBe("2026-03-06T12:45");
  });
});
