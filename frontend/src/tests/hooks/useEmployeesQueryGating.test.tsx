import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

const { kioskFetch, usersQueryEnablement } = vi.hoisted(() => ({
  kioskFetch: vi.fn().mockResolvedValue([]),
  usersQueryEnablement: [] as boolean[],
}));

vi.mock("../../services/employeeService", () => ({
  employeeService: {
    getKioskEmployees: (...args: unknown[]) => kioskFetch(...args),
  },
}));

vi.mock("../../hooks/useUsers", () => ({
  useUsers: (options?: { enabled?: boolean }) => {
    usersQueryEnablement.push(options?.enabled ?? true);
    return {
      users: [],
      deleteUser: vi.fn(),
      addUser: vi.fn(),
      refetchUsers: vi.fn(async () => ({ data: [] })),
    };
  },
}));

vi.mock("../../hooks/queries/useEmployeesQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/queries/useEmployeesQuery")>();
  return {
    ...actual,
    useEmployeesQuery: () => ({ data: [], isLoading: false }),
  };
});

import { useEmployees } from "../../hooks/useEmployees";

describe("query pública de empleados para kiosco", () => {
  let client: QueryClient;

  beforeEach(() => {
    kioskFetch.mockClear();
    usersQueryEnablement.length = 0;
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  it("no consulta el endpoint público de kiosco desde una pantalla autenticada normal", () => {
    renderHook(() => useEmployees(), { wrapper });

    expect(kioskFetch).not.toHaveBeenCalled();
    expect(usersQueryEnablement).toEqual([false]);
  });

  it("mantiene la carga pública de kiosco sin requerir un token", async () => {
    renderHook(() => useEmployees(true), { wrapper });

    await waitFor(() => expect(kioskFetch).toHaveBeenCalledTimes(1));
    expect(usersQueryEnablement).toEqual([false]);
  });
});
