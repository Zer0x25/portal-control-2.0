import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MFALoginModal from "../../../features/auth/components/MFALoginModal";

const addToastMock = vi.fn();
const validateMFACodeMock = vi.fn();

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ validateMFACode: validateMFACodeMock }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

describe("MFALoginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps submit disabled while code is incomplete", () => {
    render(<MFALoginModal isOpen={true} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123" } });
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it("calls success flow with valid code", async () => {
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
});
