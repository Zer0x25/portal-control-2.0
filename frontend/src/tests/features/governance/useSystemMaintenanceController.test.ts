import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSystemMaintenanceController } from "../../../features/governance/hooks/useSystemMaintenanceController";

const { addToastMock, getAdminStatsMock, purgeSessionsMock, resetPasswordMock, confirmMock } =
  vi.hoisted(() => ({
    addToastMock: vi.fn(),
    getAdminStatsMock: vi.fn(),
    purgeSessionsMock: vi.fn(),
    resetPasswordMock: vi.fn(),
    confirmMock: vi.fn(),
  }));

const STORE_STATE = { addToast: addToastMock };

/** Evento de envio falso: la vista llama al `onSubmit` que entrega la capa. */
const SUBMIT_EVENT = { preventDefault: () => {} };

vi.mock("../../../store/useStore", () => ({
  useStore: (selector: (state: typeof STORE_STATE) => unknown) => selector(STORE_STATE),
}));

vi.mock("../../../services/healthService", () => ({
  healthService: {
    getAdminStats: (...args: unknown[]) => getAdminStatsMock(...args),
    purgeSessions: (...args: unknown[]) => purgeSessionsMock(...args),
    resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

/**
 * Spec 036 T12 (AC1, AC2, T13): el panel de mantenimiento tiene dos
 * formularios (`purgeSessionsFormSchema` y `adminResetPasswordFormSchema`).
 * Lo que se fija aqui es lo que la migracion puede romper:
 *
 * 1. **El payload**: la purga sigue mandando `username` opcional (vacio =
 *    todas las sesiones) y el reseteo sigue recortando el usuario y mandando
 *    la contrasena sin tocar (T13).
 * 2. **La regla de reseteo** ya no es un `if` delante del `fetch`: vive en el
 *    schema y el aviso sale por `onInvalid` con el mensaje del campo.
 * 3. Tras un reseteo exitoso solo se limpia la contrasena.
 */
describe("useSystemMaintenanceController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminStatsMock.mockResolvedValue({ usersCount: 1 });
    purgeSessionsMock.mockResolvedValue({ data: { message: "Sesiones purgadas" } });
    resetPasswordMock.mockResolvedValue({ data: { message: "Password actualizado" } });
    confirmMock.mockReturnValue(true);
    vi.spyOn(window, "confirm").mockImplementation(confirmMock);
  });

  it("resetea la contrasena recortando el usuario y sin tocar la clave", async () => {
    const { result } = renderHook(() => useSystemMaintenanceController());

    act(() => {
      result.current.setResetUsername("  ana  ");
      result.current.setNewPassword("  secreto123  ");
    });

    await act(async () => {
      result.current.resetFormProps.onSubmit(SUBMIT_EVENT);
    });

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith("ana", "  secreto123  ");
    });
    expect(result.current.resetUsername).toBe("  ana  ");
    expect(result.current.newPassword).toBe("");
  });

  it("senala el usuario vacio y no llama al backend", async () => {
    const { result } = renderHook(() => useSystemMaintenanceController());

    act(() => {
      result.current.setNewPassword("secreto123");
    });

    await act(async () => {
      result.current.resetFormProps.onSubmit(SUBMIT_EVENT);
    });

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(
        "El usuario debe tener al menos 1 caracteres.",
        "error",
      );
    });
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("senala una contrasena corta y no llama al backend", async () => {
    const { result } = renderHook(() => useSystemMaintenanceController());

    act(() => {
      result.current.setResetUsername("ana");
      result.current.setNewPassword("12345");
    });

    await act(async () => {
      result.current.resetFormProps.onSubmit(SUBMIT_EVENT);
    });

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith(
        "La nueva contraseña debe tener al menos 6 caracteres.",
        "error",
      );
    });
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it("purga todas las sesiones cuando el usuario viene vacio", async () => {
    const { result } = renderHook(() => useSystemMaintenanceController());

    await act(async () => {
      result.current.purgeFormProps.onSubmit(SUBMIT_EVENT);
    });

    await waitFor(() => {
      expect(purgeSessionsMock).toHaveBeenCalledWith(undefined);
    });
    expect(confirmMock).toHaveBeenCalled();
  });

  it("purga solo el usuario indicado", async () => {
    const { result } = renderHook(() => useSystemMaintenanceController());

    act(() => {
      result.current.setPurgeUsername("  ana  ");
    });

    await act(async () => {
      result.current.purgeFormProps.onSubmit(SUBMIT_EVENT);
    });

    await waitFor(() => {
      expect(purgeSessionsMock).toHaveBeenCalledWith("ana");
    });
  });
});
