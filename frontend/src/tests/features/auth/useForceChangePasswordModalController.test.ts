import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
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

describe("useForceChangePasswordModalController", () => {
  it("shows error toast when passwords do not match", async () => {
    useUsersMock.mockReturnValue({ changeOwnPassword: changeOwnPasswordMock });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    const { result } = renderHook(() =>
      useForceChangePasswordModalController({ isOpen: true, onClose: onCloseMock }),
    );

    act(() => {
      result.current.setNewPassword("abcdef");
      result.current.setConfirmPassword("abcxyz");
    });

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as any);
    });

    expect(addToastMock).toHaveBeenCalledWith("Las nuevas contraseñas no coinciden.", "error");
    expect(changeOwnPasswordMock).not.toHaveBeenCalled();
  });

  it("updates password and closes modal on success", async () => {
    changeOwnPasswordMock.mockResolvedValue(true);
    useUsersMock.mockReturnValue({ changeOwnPassword: changeOwnPasswordMock });
    useToastsMock.mockReturnValue({ addToast: addToastMock });

    const { result } = renderHook(() =>
      useForceChangePasswordModalController({ isOpen: true, onClose: onCloseMock }),
    );

    act(() => {
      result.current.setNewPassword("abcdef");
      result.current.setConfirmPassword("abcdef");
    });

    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as any);
    });

    expect(changeOwnPasswordMock).toHaveBeenCalledWith({ newPassword: "abcdef" });
    expect(addToastMock).toHaveBeenCalledWith("Contraseña actualizada con éxito.", "success");
    expect(onCloseMock).toHaveBeenCalled();
  });
});
