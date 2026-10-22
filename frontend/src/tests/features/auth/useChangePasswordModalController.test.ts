import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChangePasswordModalController } from "../../../features/auth/hooks/useChangePasswordModalController";

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useUsersMock: vi.fn(),
  useToastsMock: vi.fn(),
  addToastMock: vi.fn(),
  changeOwnPasswordMock: vi.fn(),
  updateUserMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => mocks.useAuthMock(),
}));

vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => mocks.useUsersMock(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => mocks.useToastsMock(),
}));

const setup = ({ user, target }: { user: { id: string }; target?: Record<string, unknown> }) => {
  mocks.useAuthMock.mockReturnValue({ currentUser: user });
  mocks.useUsersMock.mockReturnValue({
    getUserById: mocks.getUserByIdMock,
    updateUser: mocks.updateUserMock,
    changeOwnPassword: mocks.changeOwnPasswordMock,
  });
  mocks.useToastsMock.mockReturnValue({ addToast: mocks.addToastMock });
  mocks.getUserByIdMock.mockReturnValue(target ?? null);
};

/**
 * Spec 036 T11 (AC1, AC2, AC3): el cambio de contraseña propio vive en
 * `useAppForm`. Lo que se fija aqui es lo que la migracion puede romper:
 *
 * 1. **El payload** sigue siendo `{ password }` (T13): `passwordConfirm` es
 *    solo de cliente y no viaja.
 * 2. **Los errores** son de campo (AC3): la confirmacion que no coincide se
 *    ve junto al input, no en un toast.
 * 3. Las reglas de **negocio** siguen siendo avisos del hook: el usuario
 *    identificado y el bloqueo de la cuenta `admin` por defecto.
 */
describe("useChangePasswordModalController", () => {
  it("envia { password } al cambiar la contraseña propia", async () => {
    setup({ user: { id: "u-1" }, target: { id: "u-1", username: "ana" } });
    mocks.changeOwnPasswordMock.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useChangePasswordModalController({ isOpen: true, onClose: mocks.onCloseMock }),
    );

    act(() => {
      result.current.handlePasswordChange("nueva-clave");
      result.current.handlePasswordConfirmChange("nueva-clave");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(mocks.changeOwnPasswordMock).toHaveBeenCalledWith({ newPassword: "nueva-clave" });
    });
    expect(mocks.updateUserMock).not.toHaveBeenCalled();
    expect(mocks.addToastMock).toHaveBeenCalledWith(
      "Contraseña para 'ana' actualizada con éxito.",
      "success",
    );
    expect(mocks.onCloseMock).toHaveBeenCalled();
  });

  it("actualiza al usuario objetivo cuando se cambia desde administracion", async () => {
    setup({ user: { id: "admin-002" } });
    mocks.getUserByIdMock.mockReturnValue({ id: "u-9", username: "bruno" });
    mocks.updateUserMock.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useChangePasswordModalController({
        isOpen: true,
        onClose: mocks.onCloseMock,
        userIdToUpdate: "u-9",
      }),
    );

    act(() => {
      result.current.handlePasswordChange("otra-clave");
      result.current.handlePasswordConfirmChange("otra-clave");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(mocks.updateUserMock).toHaveBeenCalledWith("u-9", { password: "otra-clave" });
    });
    expect(mocks.changeOwnPasswordMock).not.toHaveBeenCalled();
    expect(result.current.modalTitle).toBe("Cambiar Contraseña para bruno");
  });

  it("marca la confirmacion que no coincide como error de campo", async () => {
    setup({ user: { id: "u-1" }, target: { id: "u-1", username: "ana" } });

    const { result } = renderHook(() =>
      useChangePasswordModalController({ isOpen: true, onClose: mocks.onCloseMock }),
    );

    act(() => {
      result.current.handlePasswordChange("nueva-clave");
      result.current.handlePasswordConfirmChange("otra-clave");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.getError("passwordConfirm")).toBe(
        "Las nuevas contraseñas no coinciden.",
      );
    });
    expect(mocks.changeOwnPasswordMock).not.toHaveBeenCalled();
  });

  it("bloquea la cuenta admin por defecto", async () => {
    setup({ user: { id: "admin-001" }, target: { id: "admin-001", username: "admin" } });

    const { result } = renderHook(() =>
      useChangePasswordModalController({ isOpen: true, onClose: mocks.onCloseMock }),
    );

    act(() => {
      result.current.handlePasswordChange("nueva-clave");
      result.current.handlePasswordConfirmChange("nueva-clave");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(mocks.addToastMock).toHaveBeenCalledWith(
        "La contraseña del administrador por defecto (admin) no puede ser cambiada.",
        "error",
        7000,
      );
    });
    expect(mocks.changeOwnPasswordMock).not.toHaveBeenCalled();
  });
});
