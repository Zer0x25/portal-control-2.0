import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authTokenStore } from "../../../services/authToken";
import { useEmployeeManagementData } from "../../../features/employee-management/hooks/useEmployeeManagementData";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

const {
  addToastMock,
  addEmployeeMock,
  updateEmployeeMock,
  createBulkEmployeesMock,
  refreshEmployeesMock,
  exportToCSVMock,
  checkOpenRecordMock,
  archiveEmployeeMock,
  reactivateEmployeeMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  addEmployeeMock: vi.fn(),
  updateEmployeeMock: vi.fn(),
  createBulkEmployeesMock: vi.fn(),
  refreshEmployeesMock: vi.fn(),
  exportToCSVMock: vi.fn(),
  checkOpenRecordMock: vi.fn(),
  archiveEmployeeMock: vi.fn(),
  reactivateEmployeeMock: vi.fn(),
}));

let mockArchivedEmployees: Array<Record<string, unknown>> = [];

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
    archivedEmployees: mockArchivedEmployees,
    allEmployees: [
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
      ...mockArchivedEmployees,
    ],
    isLoadingEmployees: false,
    addEmployee: addEmployeeMock,
    updateEmployee: updateEmployeeMock,
    getNextEmployeeId: () => "E-100",
    createBulkEmployees: createBulkEmployeesMock,
    archiveEmployee: archiveEmployeeMock,
    reactivateEmployee: reactivateEmployeeMock,
    checkOpenRecord: checkOpenRecordMock,
    refreshEmployees: refreshEmployeesMock,
  }),
}));

vi.mock("../../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [{ id: "u-linked", username: "ana", role: "Usuario", employeeId: "e1" }],
  }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    currentUser: { id: "u1", username: "admin", role: "Super_Administrador" },
  }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../hooks/useIntersectionObserver", () => ({
  useIntersectionObserver: () => null,
}));

vi.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

describe("useEmployeeManagementData", () => {
  beforeEach(() => {
    authTokenStore.setToken("fixture");
    vi.clearAllMocks();
    mockArchivedEmployees = [];
    server.use(
      http.get(
        "http://localhost:4000/api/employees/export",
        () =>
          new HttpResponse(new Blob(["mock"], { type: "application/vnd.ms-excel" }), {
            status: 200,
            headers: { "content-disposition": 'attachment; filename="lista_empleados.xlsx"' },
          }),
      ),
    );
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("shows info toast when exporting with no loaded employees", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);

    const { result } = renderHook(() => useEmployeeManagementData(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useEmployeeManagementData(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useEmployeeManagementData(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.handleSave({
        name: "Luis",
        rut: "2-7",
        position: "Supervisor",
        area: "Ops",
        workdayType: "Full",
        createUserAccount: true,
      });
    });

    expect(addEmployeeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Luis",
        createUserAccount: true,
      }),
    );
  });

  it("resolves handleReactivate from archivedEmployees even outside processedEmployees", async () => {
    mockArchivedEmployees = [
      {
        id: "e-arch",
        name: "Carlos",
        rut: "3-5",
        position: "Operador",
        area: "Ops",
        workdayType: "Full",
        status: "Archivado",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      },
    ];
    reactivateEmployeeMock.mockResolvedValue(true);

    const { result } = renderHook(() => useEmployeeManagementData(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.handleReactivate("e-arch");
    });

    expect(reactivateEmployeeMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e-arch", name: "Carlos" }),
    );
  });

  it("awaits archiveEmployee result before clearing employeeToArchive", async () => {
    archiveEmployeeMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const { result } = renderHook(() => useEmployeeManagementData(), { wrapper: createWrapper() });

    act(() => {
      result.current.setEmployeeToArchive({
        id: "e1",
        name: "Ana",
      } as never);
    });

    let ok = true;
    await act(async () => {
      ok = await result.current.handleConfirmArchive();
    });
    expect(ok).toBe(false);
    expect(result.current.employeeToArchive).not.toBeNull();

    await act(async () => {
      ok = await result.current.handleConfirmArchive();
    });
    expect(ok).toBe(true);
    expect(result.current.employeeToArchive).toBeNull();
  });
});
