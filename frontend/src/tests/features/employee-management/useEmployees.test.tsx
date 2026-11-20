import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEmployees } from "../../../hooks/useEmployees";
import { queryKeys } from "../../../lib/queryKeys";

const { updateEmployeeMock, deleteUserMock, createUserMock, addToastMock } = vi.hoisted(() => ({
  updateEmployeeMock: vi.fn(),
  deleteUserMock: vi.fn(),
  createUserMock: vi.fn(),
  addToastMock: vi.fn(),
}));

vi.mock("../../../services/employeeService", () => ({
  employeeService: {
    update: updateEmployeeMock,
  },
}));

vi.mock("../../../services/userService", () => ({
  userService: {
    delete: deleteUserMock,
    create: createUserMock,
  },
}));

vi.mock("../../../hooks/queries/useEmployeesQuery", () => ({
  useEmployeesQuery: () => ({ data: [], isLoading: false, isError: false }),
  useKioskEmployeesQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

describe("useEmployees archive/reactivate delegation (Spec 116 DUDA-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEmployeeMock.mockResolvedValue({ id: "e1" });
  });

  const createWrapper = (queryClient: QueryClient) =>
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };

  it("archiveEmployee delegates to employeeService.update and invalidates employees, users, and assignedShifts", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useEmployees(), {
      wrapper: createWrapper(queryClient),
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.archiveEmployee({
        id: "e1",
        name: "Ana Pérez",
        position: "Operador",
        area: "Ops",
        workdayType: "Full",
        status: "Activo",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      });
    });

    expect(ok).toBe(true);
    expect(updateEmployeeMock).toHaveBeenCalledWith(
      "e1",
      expect.objectContaining({ status: "Archivado" }),
    );
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.employees() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.users() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.assignedShifts() });
    expect(addToastMock).toHaveBeenCalledWith("Empleado archivado correctamente.", "success");
  });

  it("reactivateEmployee delegates to employeeService.update without recreating user in frontend", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useEmployees(), {
      wrapper: createWrapper(queryClient),
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.reactivateEmployee({
        id: "e1",
        name: "Ana Pérez",
        position: "Operador",
        area: "Ops",
        workdayType: "Full",
        status: "Archivado",
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
      });
    });

    expect(ok).toBe(true);
    expect(updateEmployeeMock).toHaveBeenCalledWith(
      "e1",
      expect.objectContaining({ status: "Activo" }),
    );
    expect(createUserMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.employees() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.users() });
    expect(addToastMock).toHaveBeenCalledWith("Empleado reactivado correctamente.", "success");
  });
});
