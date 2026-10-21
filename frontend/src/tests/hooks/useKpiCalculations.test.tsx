import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, afterEach } from "vitest";

import { useKpiCalculations } from "../../hooks/useKpiCalculations";
import { queryKeys } from "../../lib/queryKeys";
import { recordRequests, type RequestRecorder } from "../mocks/requests";
import type { Employee } from "../../types";

/**
 * Spec 035, T4 (AC3): los tests de hooks dejan de mockear el **modulo** del
 * service y hablan con el backend por MSW.
 *
 * El test verifica el contrato de red real (POST /api/kpis/summary con el
 * cuerpo que manda `kpiService`), no una funcion de JavaScript sustituida: un
 * cambio en el service que rompa la peticion rompe este test.
 */
describe("useKpiCalculations sobre MSW (spec 035 T4)", () => {
  let recorder: RequestRecorder;

  afterEach(() => {
    recorder?.stop();
  });

  const setup = () => {
    recorder = recordRequests();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  const employee = { id: "e-1", name: "Ana" } as unknown as Employee;

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

    expect(recorder.countOf("POST", "/api/kpis/summary")).toBe(1);
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

    expect(recorder.total()).toBe(0);
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

    expect(recorder.total()).toBe(0);
    expect(result.current.isLoadingKpis).toBe(false);
  });
});
