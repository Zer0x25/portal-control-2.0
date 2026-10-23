import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

const { kioskFetch } = vi.hoisted(() => ({
  kioskFetch: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../services/employeeService", () => ({
  employeeService: {
    getKioskEmployees: (...args: unknown[]) => kioskFetch(...args),
  },
}));

vi.mock("../../hooks/useUsers", () => ({
  useUsers: () => ({ users: [], deleteUser: vi.fn(), addUser: vi.fn() }),
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
  });

  it("mantiene la carga pública de kiosco sin requerir un token", async () => {
    renderHook(() => useEmployees(true), { wrapper });

    await waitFor(() => expect(kioskFetch).toHaveBeenCalledTimes(1));
  });
});
