import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useChangePasswordModalController } from "../../../features/auth/hooks/useChangePasswordModalController";
import { authTokenStore } from "../../../services/authToken";
import { server } from "../../mocks/server";

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useToastsMock: vi.fn(),
  addToastMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => mocks.useAuthMock(),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => mocks.useToastsMock(),
}));

const setup = ({ user }: { user: { id: string; username: string; role: string } | null }) => {
  mocks.useAuthMock.mockReturnValue({ currentUser: user });
  mocks.useToastsMock.mockReturnValue({ addToast: mocks.addToastMock });
};

/**
 * Spec 036 T11 (AC1, AC2, AC3): el cambio de contraseña propio vive en
 * `useAppForm` y llama directamente a `PUT /api/users/:id` sin consultar
 * `GET /api/users` (habilitado para cualquier rol, incluido `Usuario`).
 */
describe("useChangePasswordModalController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authTokenStore.setToken("jwt-user");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("envia { password } sin mustChangePassword ni GET /api/users para un Usuario", async () => {
    setup({ user: { id: "u-1", username: "ana", role: "Usuario" } });
    let getUsersCalled = false;
    let capturedBody: Record<string, unknown> | null = null;
    let capturedId = "";

    server.use(
      http.get("http://localhost:4000/api/users", () => {
        getUsersCalled = true;
        return HttpResponse.json([]);
      }),
      http.put("http://localhost:4000/api/users/:id", async ({ params, request }) => {
        capturedId = String(params.id);
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: capturedId, username: "ana", role: "Usuario" });
      }),
    );

    const { result } = renderHook(() =>
      useChangePasswordModalController({ isOpen: true, onClose: mocks.onCloseMock }),
    );

    expect(result.current.modalTitle).toBe("Cambiar Mi Contraseña");

    act(() => {
      result.current.handlePasswordChange("nueva-clave");
      result.current.handlePasswordConfirmChange("nueva-clave");
    });

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(mocks.onCloseMock).toHaveBeenCalled();
    });
    expect(getUsersCalled).toBe(false);
    expect(capturedId).toBe("u-1");
    expect(capturedBody).toEqual({ password: "nueva-clave" });
    expect(capturedBody).not.toHaveProperty("mustChangePassword");
    expect(mocks.addToastMock).toHaveBeenCalledWith(
      "Contraseña para 'ana' actualizada con éxito.",
      "success",
    );
  });

  it("muestra toast de error si el backend rechaza el cambio de contraseña", async () => {
    setup({ user: { id: "u-1", username: "ana", role: "Usuario" } });
    server.use(
      http.put("http://localhost:4000/api/users/:id", () =>
        HttpResponse.json({ message: "Contraseña rechazada" }, { status: 403 }),
      ),
    );

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
      expect(mocks.addToastMock).toHaveBeenCalledWith("Contraseña rechazada", "error");
    });
    expect(mocks.onCloseMock).not.toHaveBeenCalled();
  });

  it("marca la confirmacion que no coincide como error de campo", async () => {
    setup({ user: { id: "u-1", username: "ana", role: "Usuario" } });

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
    expect(mocks.onCloseMock).not.toHaveBeenCalled();
  });

  it("bloquea la cuenta admin por defecto", async () => {
    setup({ user: { id: "admin-001", username: "admin", role: "Administrador" } });

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
    expect(mocks.onCloseMock).not.toHaveBeenCalled();
  });
});
