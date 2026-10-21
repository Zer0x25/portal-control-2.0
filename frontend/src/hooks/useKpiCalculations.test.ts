import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useKpiCalculations } from "./useKpiCalculations";
import * as kpiService from "../services/kpiService";

describe("useKpiCalculations migrated to TanStack Query (AC7 / T19)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it("retorna valores por defecto inicialmente sin ejecutar queries", () => {
    const { result } = renderHook(() => useKpiCalculations(), { wrapper });
    expect(result.current.kpis.tardinessCount).toBe(0);
    expect(result.current.kpiDetails.tardyRecords).toEqual([]);
    expect(result.current.isLoadingKpis).toBe(false);
  });

  it("ejecuta cálculo de KPIs mediante TanStack Query al proporcionar filtros válidos", async () => {
    vi.spyOn(kpiService, "runKpiCalculation").mockResolvedValue({
      kpis: {
        tardinessCount: 5,
        absenceCount: 2,
        vacationCount: 0,
        medicalLeaveCount: 0,
        specialPermitCount: 0,
        overtimePercentage: 10,
        avgWeeklyHours: 40,
        tardinessRate: 5,
        unjustifiedAbsenceRate: 2,
        justifiedAbsenceRate: 0,
        vacationRate: 0,
        medicalLeaveRate: 0,
        specialPermitRate: 0,
        totalAbsenteeismRate: 2,
        absenceRate: 2,
      },
      kpiDetails: {
        tardyRecords: [{ id: "t-1" } as never],
        absentEmployees: [],
        vacationRecords: [],
        medicalLeaveRecords: [],
        specialPermitRecords: [],
      },
    });

    const { result } = renderHook(() => useKpiCalculations(), { wrapper });

    act(() => {
      result.current.calculateKpis({
        employees: [{ id: "emp-1", name: "Juan" } as never],
        startDate: "2026-10-01",
        endDate: "2026-10-15",
      });
    });

    await waitFor(() => {
      expect(result.current.kpis.tardinessCount).toBe(5);
    });

    expect(result.current.kpis.absenceCount).toBe(2);
    expect(result.current.kpiDetails.tardyRecords.length).toBe(1);
    expect(kpiService.runKpiCalculation).toHaveBeenCalledTimes(1);
  });
});
