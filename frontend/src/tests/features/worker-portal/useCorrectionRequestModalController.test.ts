import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
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

describe("useCorrectionRequestModalController", () => {
  it("blocks submission when reason is empty", async () => {
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
        } as any,
        field: "entrada",
      }),
    );

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(addToastMock).toHaveBeenCalledWith("El motivo de la solicitud es requerido.", "warning");
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
        } as any,
        field: "entrada",
      }),
    );

    act(() => {
      result.current.setReason("Olvide marcar correctamente");
      result.current.setRequestedValue("2026-03-05T09:00");
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(addCorrectionRequestMock).toHaveBeenCalledTimes(1);
    expect(addCorrectionRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedValue: toDate("2026-03-05T09:00:00", {
          timeZone: "America/Santiago",
        }).toISOString(),
      }),
    );
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
        } as any,
        field: "entrada",
      }),
    );

    expect(result.current.requestedValue).toBe("2026-03-06T12:45");
  });
});
