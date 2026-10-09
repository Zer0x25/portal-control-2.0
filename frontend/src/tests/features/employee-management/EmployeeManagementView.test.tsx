import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmployeeManagementView } from "../../../features/employee-management/views/EmployeeManagement.view";

vi.mock("../../../features/employee-management/components/EmployeeForm", () => ({
  default: () => <div>EMPLOYEE-FORM</div>,
}));
vi.mock("../../../features/employee-management/components/EmployeeListCard", () => ({
  default: () => <div>EMPLOYEE-LIST</div>,
}));
vi.mock("../../../components/ui/ImportModal", () => ({
  default: () => <div>IMPORT-MODAL</div>,
}));
vi.mock("../../../components/ui/ShiftHistoryModal", () => ({
  default: () => <div>SHIFT-HISTORY-MODAL</div>,
}));
vi.mock("../../../components/ui/CinematicModal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../../components/ui/PremiumSearchInput", () => ({
  default: (props: { onChange: (value: string) => void }) => (
    <button onClick={() => props.onChange("ana")}>EMP-SEARCH</button>
  ),
}));

describe("EmployeeManagementView", () => {
  const baseProps = {
    isEmbedded: false,
    areaList: ["Ops"],
    workdayTypeList: ["Full"],
    isLoadingEmployees: false,
    isLoadingConfig: false,
    isFormVisible: false,
    editingEmployee: null,
    employeeToArchive: null,
    employeeData: {},
    nextId: "E-100",
    searchTermTable: "",
    view: "active",
    isExportMenuOpen: false,
    exportMenuRef: { current: null },
    historyModalEmployee: null,
    isImportModalOpen: false,
    isMobile: false,
    hasOpenRecord: false,
    processedEmployees: [
      {
        id: "e1",
        name: "Ana",
        rut: "1-9",
        position: "Operador",
        area: "Ops",
        workdayType: "Full",
        status: "Activo",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ],
    hasNextPage: false,
    sentinelRef: { current: null },
    setScrollRoot: vi.fn(),
    importSchema: {},
    canArchive: vi.fn(() => true),
    canEdit: vi.fn(() => true),
    setSearchTermTable: vi.fn(),
    handleViewChange: vi.fn(),
    handleOpenNewForm: vi.fn(),
    handleReactivate: vi.fn(),
    setIsExportMenuOpen: vi.fn(),
    handleEdit: vi.fn(),
    handleCancel: vi.fn(),
    handleSave: vi.fn(async () => true),
    requestSort: vi.fn(),
    handleExport: vi.fn(),
    setIsImportModalOpen: vi.fn(),
    handleImportEmployees: vi.fn(async () => true),
    setEmployeeData: vi.fn(),
    setEmployeeToArchive: vi.fn(),
    handleConfirmArchive: vi.fn(),
    setHistoryModalEmployee: vi.fn(),
    handleSelectEmployeeToArchive: vi.fn(),
  } as unknown as React.ComponentProps<typeof EmployeeManagementView>;

  it("renders main view and delegates top actions", () => {
    render(<EmployeeManagementView {...baseProps} />);

    expect(screen.getByText("Gestión de Empleados")).toBeInTheDocument();
    expect(screen.getByText("EMPLOYEE-LIST")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Nuevo Registro/i })[0]);
    expect(baseProps.handleOpenNewForm).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "EMP-SEARCH" }));
    expect(baseProps.setSearchTermTable).toHaveBeenCalledWith("ana");

    fireEvent.click(screen.getByRole("button", { name: "Archivados" }));
    expect(baseProps.handleViewChange).toHaveBeenCalledWith("archived");
  });

  it("renders loading state when employees/config are loading", () => {
    render(<EmployeeManagementView {...baseProps} isLoadingEmployees={true} />);
    expect(screen.getByText("Cargando base de datos de personal...")).toBeInTheDocument();
  });

  it("renders within canonical wide Container with data-ui-protected", () => {
    render(<EmployeeManagementView {...baseProps} />);
    const container = screen.getByTestId("page-container");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("max-w-[1440px]");
    expect(container).toHaveAttribute("data-ui-protected");
  });
});
