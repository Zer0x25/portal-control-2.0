import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Employee } from "../../types";
import { useStore } from "../../store/useStore";

const mocks = vi.hoisted(() => ({
  employeeUpdate: vi.fn(async () => undefined),
  getAssignments: vi.fn(async () => ({
    data: [
      { id: "assignment-1", employeeId: "employee-1", startDate: "2026-01-01", endDate: null },
    ],
  })),
  updateAssignment: vi.fn(async () => undefined),
  addToast: vi.fn(),
}));

vi.mock("../../hooks/useUsers", () => ({
  useUsers: () => ({ users: [], deleteUser: vi.fn(), addUser: vi.fn() }),
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: mocks.addToast }),
}));

vi.mock("../../hooks/queries/useEmployeesQuery", () => ({
  useEmployeesQuery: () => ({ data: [], isLoading: false }),
  useKioskEmployeesQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../services/employeeService", () => ({
  employeeService: { update: mocks.employeeUpdate },
}));

vi.mock("../../services/shiftService", () => ({
  shiftService: {
    getAssignments: mocks.getAssignments,
    updateAssignment: mocks.updateAssignment,
    deleteAssignment: vi.fn(),
  },
}));

import { useEmployees } from "../../hooks/useEmployees";

describe("useEmployees archive timezone helper", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const employee = {
    id: "employee-1",
    name: "Empleado de prueba",
    position: "Operador",
    area: "Operaciones",
    workdayType: "Full-Time",
    status: "Activo",
    lastModified: 0,
    syncStatus: "synced",
    isDeleted: false,
  } satisfies Employee;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T15:45:00.000Z"));
    useStore.setState({ serverTimeOffset: 0 });
    mocks.employeeUpdate.mockClear();
    mocks.getAssignments.mockClear();
    mocks.updateAssignment.mockClear();
    mocks.addToast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    client.clear();
  });

  it("loads the business date helper when archiving active assignments", async () => {
    const { result } = renderHook(() => useEmployees(), { wrapper });
    let archived = false;

    await act(async () => {
      archived = await result.current.archiveEmployee(employee);
    });

    expect(archived).toBe(true);
    expect(mocks.updateAssignment).toHaveBeenCalledWith(
      "assignment-1",
      expect.objectContaining({ endDate: "2026-10-23" }),
    );
  });
});
