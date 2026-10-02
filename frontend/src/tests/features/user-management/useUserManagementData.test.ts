import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUserManagementData } from "../../../features/user-management/hooks/useUserManagementData";

const {
  addToastMock,
  addUserMock,
  updateUserMock,
  deleteUserMock,
  refreshUsersMock,
  resetEmployeePinMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  addUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  deleteUserMock: vi.fn(),
  refreshUsersMock: vi.fn(),
  resetEmployeePinMock: vi.fn(),
}));

let mockCurrentUser: { id: string; role: string } | null = { id: "u-admin", role: "Administrador" };

vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [
      {
        id: "u-admin",
        username: "admin",
        role: "Administrador",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
      {
        id: "u2",
        username: "ana",
        role: "Usuario",
        employeeId: "e1",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
    addUser: addUserMock,
    updateUser: updateUserMock,
    deleteUser: deleteUserMock,
    refreshUsers: refreshUsersMock,
    isLoadingUsers: false,
  }),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    activeEmployees: [{ id: "e1", name: "Ana", area: "Ops", position: "Operador" }],
    resetEmployeePin: resetEmployeePinMock,
  }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
}));

vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("../../../hooks/useIntersectionObserver", () => ({
  useIntersectionObserver: () => null,
}));

describe("useUserManagementData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = { id: "u-admin", role: "Administrador" };
  });

  it("enforces canManageUser and blocks edit when unauthorized", () => {
    mockCurrentUser = { id: "u2", role: "Usuario" };

    const { result } = renderHook(() => useUserManagementData());

    const targetUser = {
      id: "u3",
      username: "test",
      role: "Usuario",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    };

    expect(result.current.canManageUser(targetUser as never)).toBe(false);

    act(() => {
      result.current.handleEditUser(targetUser as never);
    });

    expect(addToastMock).toHaveBeenCalledWith(
      "No tiene permisos para editar este usuario.",
      "error",
    );
    expect(result.current.isFormVisible).toBe(false);
  });

  it("requires password for new users and handles reset password flow", async () => {
    const { result } = renderHook(() => useUserManagementData());

    await act(async () => {
      await result.current.handleSaveUser({ username: "nuevo", role: "Usuario" as never });
    });

    expect(addUserMock).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith("La contraseña es requerida.", "warning");

    act(() => {
      result.current.setUserToResetPassword({
        id: "u2",
        username: "ana",
        role: "Usuario",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      } as never);
    });

    await act(async () => {
      await result.current.handleConfirmResetPassword();
    });

    expect(updateUserMock).toHaveBeenCalledWith("u2", {
      password: "123456",
      mustChangePassword: true,
    });
    expect(refreshUsersMock).toHaveBeenCalled();
  });
});
