import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEmployeeManagementData } from "../../../features/employee-management/hooks/useEmployeeManagementData";

const {
  addToastMock,
  addEmployeeMock,
  updateEmployeeMock,
  createBulkEmployeesMock,
  refreshEmployeesMock,
  exportToCSVMock,
  exportToPDFMock,
  downloadEmployeesExcelMock,
  checkOpenRecordMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  addEmployeeMock: vi.fn(),
  updateEmployeeMock: vi.fn(),
  createBulkEmployeesMock: vi.fn(),
  refreshEmployeesMock: vi.fn(),
  exportToCSVMock: vi.fn(),
  exportToPDFMock: vi.fn(),
  downloadEmployeesExcelMock: vi.fn(),
  checkOpenRecordMock: vi.fn(),
}));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    employees: [
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
    archivedEmployees: [],
    isLoadingEmployees: false,
    addEmployee: addEmployeeMock,
    updateEmployee: updateEmployeeMock,
    getNextEmployeeId: () => "E-100",
    createBulkEmployees: createBulkEmployeesMock,
    archiveEmployee: vi.fn(),
    reactivateEmployee: vi.fn(),
    checkOpenRecord: checkOpenRecordMock,
    refreshEmployees: refreshEmployeesMock,
  }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: {
      id: "u1",
      role: "Administrador",
      username: "admin",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
    },
  }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useAreaListQuery: () => ({ data: ["Ops"], isLoading: false }),
  useWorkdayTypeListQuery: () => ({ data: ["Full"], isLoading: false }),
}));

vi.mock("../../../utils/export/index", () => ({
  exportToCSV: exportToCSVMock,
  exportToPDF: exportToPDFMock,
}));

vi.mock("../../../services/exportService", () => ({
  exportService: {
    downloadEmployeesExcel: downloadEmployeesExcelMock,
  },
}));

vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("../../../hooks/useIntersectionObserver", () => ({
  useIntersectionObserver: () => null,
}));

describe("useEmployeeManagementData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows info toast when exporting with no loaded employees", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);

    const { result } = renderHook(() => useEmployeeManagementData());

    act(() => {
      result.current.handleViewChange("archived");
    });

    act(() => {
      result.current.handleExport("csv");
    });

    expect(addToastMock).toHaveBeenCalledWith("No hay datos cargados para exportar.", "info");
    expect(exportToCSVMock).not.toHaveBeenCalled();
  });

  it("imports employees and validates open-record check before archive", async () => {
    createBulkEmployeesMock.mockResolvedValue(true);
    checkOpenRecordMock.mockResolvedValue(true);

    const { result } = renderHook(() => useEmployeeManagementData());

    const importOk = await result.current.handleImportEmployees([
      {
        id: "e2",
        name: "Luis",
        rut: "2-7",
        position: "Supervisor",
        area: "Ops",
        workdayType: "Full",
        pin: "1234",
      },
    ] as never);

    expect(importOk).toBe(true);
    expect(refreshEmployeesMock).toHaveBeenCalled();

    await act(async () => {
      await result.current.handleSelectEmployeeToArchive({
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
      } as never);
    });

    expect(checkOpenRecordMock).toHaveBeenCalledWith("e1");
    expect(result.current.hasOpenRecord).toBe(true);
    expect(result.current.employeeToArchive?.id).toBe("e1");
  });

  it("sends createUserAccount in employee save payload", async () => {
    addEmployeeMock.mockResolvedValue({ id: "e2", name: "Luis" });

    const { result } = renderHook(() => useEmployeeManagementData());

    act(() => {
      result.current.setEmployeeData({
        name: "Luis",
        rut: "2-7",
        position: "Supervisor",
        area: "Ops",
        workdayType: "Full",
        createUserAccount: true,
      });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(addEmployeeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Luis",
        createUserAccount: true,
      }),
    );
  });
});
