import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "../../../services/apiClient";
import LoginPage from "../../../features/auth/pages/LoginPage";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  addToast: vi.fn(),
  navigate: vi.fn(),
  authState: {
    isAuthenticated: false,
    currentUser: null as {
      id: string;
      username: string;
      role: string;
      mustChangePassword?: boolean;
    } | null,
    mfaRequired: false,
  },
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    login: mocks.login,
    logout: mocks.logout,
    isAuthenticated: mocks.authState.isAuthenticated,
    currentUser: mocks.authState.currentUser,
    mfaRequired: mocks.authState.mfaRequired,
  }),
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useControlInternoEnabledQuery: () => ({ data: true }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: mocks.addToast }),
}));

vi.mock("../../../store/useStore", () => ({
  useStore: Object.assign(() => undefined, {
    getState: () => ({ currentUser: mocks.authState.currentUser }),
  }),
}));

vi.mock("../../../components/ui/SimpleConnectionIndicator", () => ({
  default: () => null,
}));

vi.mock("../../../components/ui/BrandLogo", () => ({
  default: () => null,
}));

vi.mock("../../../features/auth/components/MFALoginModal.container", () => ({
  default: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: (user?: unknown) => void }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() =>
          onSuccess({
            id: "u-mfa",
            username: "mfa-admin",
            role: "Super_Administrador",
            mustChangePassword: false,
          })
        }
      >
        TRIGGER-MFA-SUCCESS
      </button>
    ) : null,
}));

describe("LoginPage auth contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authState.isAuthenticated = false;
    mocks.authState.currentUser = null;
    mocks.authState.mfaRequired = false;
  });

  it("no duplica toast cuando login falla con 429 (cause ApiHttpError)", async () => {
    const rateLimitError = new Error("Demasiados intentos", {
      cause: new ApiHttpError("Demasiados intentos", 429, "/api/auth/login"),
    });
    mocks.login.mockRejectedValue(rateLimitError);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
    expect(mocks.addToast).not.toHaveBeenCalled();
  });

  it("no navega ni desmonta LoginPage cuando mustChangePassword es true", async () => {
    mocks.login.mockResolvedValue({
      id: "u-force",
      username: "pepe",
      role: "Usuario",
      mustChangePassword: true,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "pepe" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("login-submit"));

    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("usa el usuario recibido en handleMFASuccess para bienvenida y redireccion sin closure stale", () => {
    mocks.authState.mfaRequired = true;

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("TRIGGER-MFA-SUCCESS"));

    expect(mocks.addToast).toHaveBeenCalledWith("¡Bienvenido, mfa-admin!", "success");
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});
