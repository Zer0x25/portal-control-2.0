import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

const { kioskFetch, portalEmployeesFetch } = vi.hoisted(() => ({
  kioskFetch: vi.fn().mockResolvedValue([]),
  portalEmployeesFetch: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../services/employeeService", () => ({
  employeeService: {
    getKioskEmployees: (...args: unknown[]) => kioskFetch(...args),
    getAll: (...args: unknown[]) => portalEmployeesFetch(...args),
  },
}));

vi.mock("../../hooks/queries/useEmployeesQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/queries/useEmployeesQuery")>();
  return {
    ...actual,
    useEmployeesQuery: (enabled = true) => {
      if (enabled) {
        portalEmployeesFetch();
      }
      return { data: [], isLoading: false };
    },
  };
});

import { useEmployees } from "../../hooks/useEmployees";

describe("query pública de empleados para kiosco", () => {
  let client: QueryClient;

  beforeEach(() => {
    kioskFetch.mockClear();
    portalEmployeesFetch.mockClear();
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

  it("mantiene la carga pública de kiosco sin requerir un token ni disparar GET /api/employees", async () => {
    renderHook(() => useEmployees(true), { wrapper });

    await waitFor(() => expect(kioskFetch).toHaveBeenCalledTimes(1));
    expect(portalEmployeesFetch).not.toHaveBeenCalled();
  });

  it("expone isError real y refetchKioskEmployees cuando falla la carga pública de kiosco", async () => {
    kioskFetch.mockRejectedValueOnce(new Error("Fallo de red"));
    const { result } = renderHook(() => useEmployees(true), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    kioskFetch.mockResolvedValueOnce([]);
    await result.current.refetchKioskEmployees();
    await waitFor(() => expect(result.current.isError).toBe(false));
  });
});
