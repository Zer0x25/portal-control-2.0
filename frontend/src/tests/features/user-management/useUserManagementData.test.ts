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

  it("enables Supervisor_Elevado to create and manage non-Administrador users only", () => {
    mockCurrentUser = { id: "u-sup", role: "Supervisor_Elevado" };

    const { result } = renderHook(() => useUserManagementData());

    expect(result.current.canCreateUsers).toBe(true);
    expect(
      result.current.canManageUser({
        id: "u-admin",
        username: "admin",
        role: "Administrador",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      } as never),
    ).toBe(false);
    expect(
      result.current.canManageUser({
        id: "u-sup",
        username: "sup",
        role: "Supervisor_Elevado",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      } as never),
    ).toBe(false);
    expect(
      result.current.canManageUser({
        id: "u2",
        username: "ana",
        role: "Usuario",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      } as never),
    ).toBe(true);
  });

  it("creates user with default temporary password, sends employeeId: null on unlink, and keeps modal open on failure", async () => {
    addUserMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "u-new", username: "nuevo" });
    updateUserMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const { result } = renderHook(() => useUserManagementData());

    act(() => {
      result.current.handleOpenNewForm();
    });

    await act(async () => {
      await result.current.handleSaveUser({ username: "nuevo", role: "Usuario" as never });
    });

    expect(addUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "nuevo",
        password: "123456",
        role: "Usuario",
      }),
    );
    expect(result.current.isFormVisible).toBe(true);

    await act(async () => {
      await result.current.handleSaveUser({ username: "nuevo", role: "Usuario" as never });
    });
    expect(result.current.isFormVisible).toBe(false);

    // Edit and unlink employeeId
    act(() => {
      result.current.handleEditUser({
        id: "u2",
        username: "ana",
        role: "Usuario",
        employeeId: "e1",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      } as never);
    });

    await act(async () => {
      await result.current.handleSaveUser({
        username: "ana",
        role: "Supervisor" as never,
        employeeId: "",
      });
    });

    expect(updateUserMock).toHaveBeenCalledWith("u2", {
      role: "Supervisor",
      employeeId: null,
    });
    expect(result.current.isFormVisible).toBe(true);

    await act(async () => {
      await result.current.handleSaveUser({
        username: "ana",
        role: "Supervisor" as never,
        employeeId: "",
      });
    });
    expect(result.current.isFormVisible).toBe(false);
  });

  it("does not close modals or show success toast when delete or reset password fails", async () => {
    updateUserMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    deleteUserMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const { result } = renderHook(() => useUserManagementData());

    act(() => {
      result.current.setUserToResetPassword({
        id: "u2",
        username: "ana",
        role: "Usuario",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      } as never);
      result.current.setUserToDelete({
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
      await result.current.handleDeleteUser();
    });

    expect(result.current.userToResetPassword).not.toBeNull();
    expect(result.current.userToDelete).not.toBeNull();
    expect(addToastMock).not.toHaveBeenCalledWith(expect.any(String), "success");

    await act(async () => {
      await result.current.handleConfirmResetPassword();
      await result.current.handleDeleteUser();
    });

    expect(result.current.userToResetPassword).toBeNull();
    expect(result.current.userToDelete).toBeNull();
    expect(updateUserMock).toHaveBeenCalledWith("u2", {
      password: "123456",
      mustChangePassword: true,
    });
    expect(refreshUsersMock).toHaveBeenCalled();
  });
});
