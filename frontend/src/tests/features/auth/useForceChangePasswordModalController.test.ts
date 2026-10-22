import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useForceChangePasswordModalController } from "../../../features/auth/hooks/useForceChangePasswordModalController";

const { useUsersMock, useToastsMock, addToastMock, changeOwnPasswordMock, onCloseMock } =
  vi.hoisted(() => ({
    useUsersMock: vi.fn(),
    useToastsMock: vi.fn(),
    addToastMock: vi.fn(),
    changeOwnPasswordMock: vi.fn(),
    onCloseMock: vi.fn(),
  }));

vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => useUsersMock(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => useToastsMock(),
}));

/**
 * Spec 036 T11 (AC1, AC2, AC3, AC4): el cambio de contraseña forzado vive en
 * `useAppForm`. Lo que se fija aqui es lo que la migracion puede romper:
 *
 * 1. **El payload** sigue siendo `{ password }` (T13): el `passwordConfirm`
 *    es solo de cliente y no viaja.
 * 2. **Los errores** son de campo (AC3): la confirmacion que no coincide y la
 *    contraseña corta se ven junto al input, no en un toast.
 * 3. **El doble envio** esta bloqueado (AC4).
 */
describe("useForceChangePasswordModalController", () => {
  it("marca la confirmacion como error de campo si no coincide", async () => {
    useUsersMock.mockReturnValue({ changeOwnPassword: changeOwnPasswordMock });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    const { result } = renderHook(() =>
      useForceChangePasswordModalController({ isOpen: true, onClose: onCloseMock }),
    );

    act(() => {
      result.current.handlePasswordChange("abcdef");
      result.current.handlePasswordConfirmChange("abcxyz");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.getError("passwordConfirm")).toBe(
        "Las nuevas contraseñas no coinciden.",
      );
    });
    expect(changeOwnPasswordMock).not.toHaveBeenCalled();
  });

  it("marca la contraseña corta como error de campo", async () => {
    useUsersMock.mockReturnValue({ changeOwnPassword: changeOwnPasswordMock });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    const { result } = renderHook(() =>
      useForceChangePasswordModalController({ isOpen: true, onClose: onCloseMock }),
    );

    act(() => {
      result.current.handlePasswordChange("abc");
      result.current.handlePasswordConfirmChange("abc");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.getError("password")).toContain("al menos 6 caracteres");
    });
    expect(changeOwnPasswordMock).not.toHaveBeenCalled();
  });

  it("entrega el payload { password } y cierra el modal en el exito", async () => {
    changeOwnPasswordMock.mockResolvedValue(true);
    useUsersMock.mockReturnValue({ changeOwnPassword: changeOwnPasswordMock });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    const { result } = renderHook(() =>
      useForceChangePasswordModalController({ isOpen: true, onClose: onCloseMock }),
    );

    act(() => {
      result.current.handlePasswordChange("abcdef");
      result.current.handlePasswordConfirmChange("abcdef");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(changeOwnPasswordMock).toHaveBeenCalledWith({ newPassword: "abcdef" });
    });
    expect(addToastMock).toHaveBeenCalledWith("Contraseña actualizada con éxito.", "success");
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("bloquea el doble envio", async () => {
    changeOwnPasswordMock.mockResolvedValue(true);
    useUsersMock.mockReturnValue({ changeOwnPassword: changeOwnPasswordMock });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    const { result } = renderHook(() =>
      useForceChangePasswordModalController({ isOpen: true, onClose: onCloseMock }),
    );

    act(() => {
      result.current.handlePasswordChange("abcdef");
      result.current.handlePasswordConfirmChange("abcdef");
    });

    await act(async () => {
      result.current.submit();
      result.current.submit();
    });

    await waitFor(() => {
      expect(changeOwnPasswordMock).toHaveBeenCalledTimes(1);
    });
  });
});
