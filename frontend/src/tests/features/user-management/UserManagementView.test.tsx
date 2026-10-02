import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserManagementView } from "../../../features/user-management/views/UserManagement.view";

vi.mock("../../../features/user-management/components/UserForm", () => ({
  default: () => <div>USER-FORM</div>,
}));
vi.mock("../../../features/auth/components/MFASetupModal", () => ({
  default: () => <div>MFA-MODAL</div>,
}));
vi.mock("../../../components/ui/CinematicModal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../../components/ui/PremiumSearchInput", () => ({
  default: (props: { onChange: (value: string) => void }) => (
    <button onClick={() => props.onChange("ana")}>SEARCH-CHANGE</button>
  ),
}));
vi.mock("../../../components/ui/RoleBadge", () => ({
  default: () => <span>ROLE-BADGE</span>,
}));

describe("UserManagementView", () => {
  const baseProps = {
    isEmbedded: false,
    allUsers: [
      {
        id: "u1",
        username: "admin",
        role: "Administrador",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
    activeEmployees: [
      {
        id: "e1",
        name: "Ana",
        area: "Ops",
        position: "Operador",
        workdayType: "Full",
        status: "Activo",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
    currentUser: {
      id: "u1",
      username: "admin",
      role: "Administrador",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
    isLoadingUsers: false,
    isFormVisible: false,
    editingUser: null,
    userToDelete: null,
    userToResetPin: null,
    userToResetPassword: null,
    searchTerm: "",
    isMFASetupOpen: false,
    isMobile: false,
    paginatedUsers: [
      {
        id: "u2",
        username: "ana",
        role: "Usuario",
        employeeId: "e1",
        mfaEnabled: false,
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
    hasNextPage: false,
    sentinelRef: { current: null },
    setScrollRoot: vi.fn(),
    canManageUser: vi.fn(() => true),
    setSearchTerm: vi.fn(),
    handleOpenNewForm: vi.fn(),
    handleEditUser: vi.fn(),
    handleSaveUser: vi.fn(),
    setIsFormVisible: vi.fn(),
    setIsMFASetupOpen: vi.fn(),
    setUserToDelete: vi.fn(),
    setUserToResetPin: vi.fn(),
    setUserToResetPassword: vi.fn(),
    handleDeleteUser: vi.fn(),
    handleConfirmResetPassword: vi.fn(),
    handleConfirmResetPin: vi.fn(),
    refreshUsers: vi.fn(),
  } as unknown as React.ComponentProps<typeof UserManagementView>;

  it("renders list and delegates core actions", () => {
    render(<UserManagementView {...baseProps} />);

    expect(screen.getByText("Gestión de Accesos")).toBeInTheDocument();
    expect(screen.getByText("ana")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Nuevo Usuario/i }));
    expect(baseProps.handleOpenNewForm).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "SEARCH-CHANGE" }));
    expect(baseProps.setSearchTerm).toHaveBeenCalledWith("ana");
  });

  it("hides header when embedded mode is enabled", () => {
    render(<UserManagementView {...baseProps} isEmbedded={true} />);
    expect(screen.queryByText("Gestión de Accesos")).not.toBeInTheDocument();
  });
});
