import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useKpiCalculations } from "../../hooks/useKpiCalculations";
import { queryKeys } from "../../lib/queryKeys";
import type { Employee } from "../../types";

const { runKpiCalculationMock } = vi.hoisted(() => ({
  runKpiCalculationMock: vi.fn(),
}));

vi.mock("../../services/kpiService", () => ({
  runKpiCalculation: runKpiCalculationMock,
}));

/**
 * Spec 034, T19 (AC7): los KPIs pasan de `useState` + fetch manual a `useQuery`
 * con la raiz canonica `["kpis", ...]`.
 */
describe("useKpiCalculations sobre useQuery (spec 034 T19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runKpiCalculationMock.mockResolvedValue({
      kpis: { tardinessCount: 3, absenceCount: 1 },
      kpiDetails: {
        tardyRecords: [{ id: "t-1" }],
        absentEmployees: [],
        vacationRecords: [],
        medicalLeaveRecords: [],
        specialPermitRecords: [],
      },
    });
  });

  const employee = { id: "e-1", name: "Ana" } as unknown as Employee;

  const setup = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  it("carga los KPIs con la raiz canonica `kpis`", async () => {
    const { queryClient, wrapper } = setup();

    const { result } = renderHook(() => useKpiCalculations(), { wrapper });

    await act(async () => {
      result.current.calculateKpis({
        employees: [employee],
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      });
    });

    await waitFor(() => expect(result.current.kpis.tardinessCount).toBe(3));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys.some((key) => key[0] === "kpis")).toBe(true);
    expect(
      queryKeys.kpis({ startDate: "2026-03-01", endDate: "2026-03-31", employeeIds: ["e-1"] })[0],
    ).toBe("kpis");
  });

  it("no vuelve a pedir los mismos filtros (cache de la query)", async () => {
    const { wrapper } = setup();

    const { result } = renderHook(() => useKpiCalculations(), { wrapper });

    const filters = {
      employees: [employee],
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    };

    await act(async () => {
      result.current.calculateKpis(filters);
    });
    await waitFor(() => expect(result.current.kpis.tardinessCount).toBe(3));

    await act(async () => {
      result.current.calculateKpis(filters);
    });

    expect(runKpiCalculationMock).toHaveBeenCalledTimes(1);
  });

  it("rango invalido: deja los KPIs en cero y no llama al backend", async () => {
    const { wrapper } = setup();

    const { result } = renderHook(() => useKpiCalculations(), { wrapper });

    await act(async () => {
      result.current.calculateKpis({
        employees: [employee],
        startDate: "2026-03-31",
        endDate: "2026-03-01",
      });
    });

    expect(runKpiCalculationMock).not.toHaveBeenCalled();
    expect(result.current.kpis.tardinessCount).toBe(0);
    expect(result.current.kpiDetails.tardyRecords).toEqual([]);
  });

  it("sin empleados no dispara la query", async () => {
    const { wrapper } = setup();

    const { result } = renderHook(() => useKpiCalculations(), { wrapper });

    await act(async () => {
      result.current.calculateKpis({
        employees: [],
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      });
    });

    expect(runKpiCalculationMock).not.toHaveBeenCalled();
    expect(result.current.isLoadingKpis).toBe(false);
  });
});
