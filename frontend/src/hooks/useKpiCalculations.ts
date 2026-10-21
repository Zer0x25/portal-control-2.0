import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "../store/useStore";
import { Employee, KpiDetails, KpiData } from "../types/index";
import { isDateRangeValid } from "../utils/validation";
import { runKpiCalculation } from "../services/kpiService";

export interface KpiFilters {
  employees: Employee[];
  startDate: string | null;
  endDate: string | null;
}

const defaultKpis: KpiData = {
  tardinessCount: 0,
  absenceCount: 0,
  vacationCount: 0,
  medicalLeaveCount: 0,
  specialPermitCount: 0,
  overtimePercentage: 0,
  avgWeeklyHours: 0,
  tardinessRate: 0,
  unjustifiedAbsenceRate: 0,
  justifiedAbsenceRate: 0,
  vacationRate: 0,
  medicalLeaveRate: 0,
  specialPermitRate: 0,
  totalAbsenteeismRate: 0,
  absenceRate: 0,
};

const defaultKpiDetails: KpiDetails = {
  tardyRecords: [],
  absentEmployees: [],
  vacationRecords: [],
  medicalLeaveRecords: [],
  specialPermitRecords: [],
};

/**
 * Hook de cálculo de KPIs migrado a TanStack Query (Spec 034 / AC7 / T19).
 * Raíz canónica: ["kpis", "summary", filters].
 */
export const useKpiCalculations = () => {
  const [activeFilters, setActiveFilters] = useState<KpiFilters | null>(null);

  const isValidFilter =
    !!activeFilters &&
    activeFilters.employees.length > 0 &&
    !!activeFilters.startDate &&
    !!activeFilters.endDate &&
    isDateRangeValid(activeFilters.startDate, activeFilters.endDate);

  const filterParam = activeFilters
    ? {
        employeeIds: activeFilters.employees.map((e) => e.id),
        startDate: activeFilters.startDate,
        endDate: activeFilters.endDate,
      }
    : null;

  const { data, isFetching } = useQuery({
    queryKey: ["kpis", "summary", filterParam],
    queryFn: async () => {
      if (!activeFilters) return { kpis: defaultKpis, kpiDetails: defaultKpiDetails };
      const { incrementProcessing, decrementProcessing } = useStore.getState();
      incrementProcessing();
      try {
        return await runKpiCalculation({ filters: activeFilters });
      } finally {
        decrementProcessing();
      }
    },
    enabled: isValidFilter,
    staleTime: 1000 * 60 * 5,
  });

  const calculateKpis = useCallback(async (filters: KpiFilters) => {
    setActiveFilters(filters);
  }, []);

  return {
    kpis: data?.kpis ?? defaultKpis,
    kpiDetails: data?.kpiDetails ?? defaultKpiDetails,
    isLoadingKpis: isFetching,
    calculateKpis,
  };
};
