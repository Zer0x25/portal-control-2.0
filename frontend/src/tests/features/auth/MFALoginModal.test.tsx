import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MFALoginModal from "../../../features/auth/components/MFALoginModal.container";

const addToastMock = vi.fn();
const validateMFACodeMock = vi.fn();

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ validateMFACode: validateMFACodeMock }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

/**
 * Spec 036 T11 (AC1, AC2, AC3): el codigo MFA vive en `useAppForm`, la regla
 * (exactamente 6) vive en el schema y el error sale junto al campo.
 */
describe("MFALoginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explica el error junto al campo si el codigo esta incompleto", async () => {
    render(<MFALoginModal isOpen={true} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(screen.getByText(/al menos 6 caracteres/i)).toBeInTheDocument();
    });
    expect(validateMFACodeMock).not.toHaveBeenCalled();
  });

  it("filtra el codigo a digitos y corta en 6", () => {
    render(<MFALoginModal isOpen={true} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "ab12cd34567" },
    });

    expect(screen.getByPlaceholderText("000000")).toHaveValue("123456");
  });

  it("llama al flujo de exito con un codigo valido", async () => {
    const onSuccess = vi.fn();
    validateMFACodeMock.mockResolvedValue(undefined);

    render(<MFALoginModal isOpen={true} onSuccess={onSuccess} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(validateMFACodeMock).toHaveBeenCalledWith("123456");
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("muestra el mensaje del backend si el codigo es invalido", async () => {
    validateMFACodeMock.mockRejectedValue(new Error("Código inválido"));

    render(<MFALoginModal isOpen={true} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith("Código inválido", "error");
    });
  });
});
