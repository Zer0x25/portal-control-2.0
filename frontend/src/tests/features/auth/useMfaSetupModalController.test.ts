import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMfaSetupModalController } from "../../../features/auth/hooks/useMfaSetupModalController";

const { addToastMock, setupMock, verifyMock, onSuccessMock, onCloseMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  setupMock: vi.fn(),
  verifyMock: vi.fn(),
  onSuccessMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../services/authService", () => ({
  authService: { setupMFA: setupMock, verifyMFASetup: verifyMock },
}));

/**
 * Spec 036 T11 (AC1, AC2, AC3): el alta de MFA vive en `useAppForm`. Lo que
 * se fija aqui es lo que la migracion puede romper:
 *
 * 1. **El payload** sigue siendo solo el token de 6 digitos (T13).
 * 2. **El error** es de campo (AC3): antes el modal volvia atras sin
 *    explicacion si el codigo no tenia 6 caracteres.
 * 3. El flujo de tres pasos (bienvenida -> QR -> verificacion) sigue
 *    funcionando (el estado de pantalla vive en el hook, no en la vista).
 */
describe("useMfaSetupModalController", () => {
  it("envia solo el token al verificar", async () => {
    verifyMock.mockResolvedValue({ message: "ok" });
    setupMock.mockResolvedValue({ qrCode: "data:img", secret: "ABCDE" });

    const { result } = renderHook(() =>
      useMfaSetupModalController({
        isOpen: true,
        onSuccess: onSuccessMock,
        onClose: onCloseMock,
      }),
    );

    act(() => {
      result.current.handleTokenChange("123456");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledWith("123456");
    });
    expect(onSuccessMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("explica el error si el codigo no tiene 6 digitos", async () => {
    const { result } = renderHook(() =>
      useMfaSetupModalController({
        isOpen: true,
        onSuccess: onSuccessMock,
        onClose: onCloseMock,
      }),
    );

    act(() => {
      result.current.handleTokenChange("12345");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.getError("token")).toBe(
        "El código debe contener exactamente 6 dígitos numéricos",
      );
    });
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("filtra el codigo a digitos y corta en 6", () => {
    const { result } = renderHook(() =>
      useMfaSetupModalController({
        isOpen: true,
        onSuccess: onSuccessMock,
        onClose: onCloseMock,
      }),
    );

    act(() => {
      result.current.handleTokenChange("a1b2c3d4e5f6");
    });

    expect(result.current.values.token).toBe("123456");
  });

  it("recorre el flujo de tres pasos", async () => {
    setupMock.mockResolvedValue({ qrCode: "data:img", secret: "ABCDE" });

    const { result } = renderHook(() =>
      useMfaSetupModalController({
        isOpen: true,
        onSuccess: onSuccessMock,
        onClose: onCloseMock,
      }),
    );

    expect(result.current.step).toBe("initial");

    await act(async () => {
      await result.current.handleStartSetup();
    });

    expect(result.current.step).toBe("scanning");
    expect(result.current.mfaData).toEqual({ qrCode: "data:img", secret: "ABCDE" });

    act(() => {
      result.current.goToVerifying();
    });

    expect(result.current.step).toBe("verifying");

    act(() => {
      result.current.goToScanning();
    });

    expect(result.current.step).toBe("scanning");
  });

  it("bloquea el doble envio", async () => {
    verifyMock.mockResolvedValue({ message: "ok" });

    const { result } = renderHook(() =>
      useMfaSetupModalController({
        isOpen: true,
        onSuccess: onSuccessMock,
        onClose: onCloseMock,
      }),
    );

    act(() => {
      result.current.handleTokenChange("123456");
    });

    await act(async () => {
      result.current.submit();
      result.current.submit();
    });

    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledTimes(1);
    });
  });
});
