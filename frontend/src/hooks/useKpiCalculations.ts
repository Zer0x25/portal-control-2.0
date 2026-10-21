import { useCallback, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useStore } from "../store/useStore";
import { Employee, KpiDetails } from "../types/index";
import { isDateRangeValid } from "../utils/validation";
import { runKpiCalculation } from "../services/kpiService";
import { queryKeys } from "../lib/queryKeys";

interface KpiFilters {
  employees: Employee[];
  startDate: string | null;
  endDate: string | null;
}

const defaultKpis = {
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
 * KPIs del panel de supervisor (spec 034, T19, AC7).
 *
 * Antes: `useState` + una llamada manual a `runKpiCalculation` disparada por
 * el consumidor, sin cache, sin deduplicacion y sin cancelacion: dos cambios
 * de filtro rapidos lanzaban dos peticiones y la segunda podia "ganar" con
 * datos viejos.
 *
 * Ahora: `useQuery` con la raiz canonica `["kpis", ...]`. La cache evita el
 * refetch si el usuario vuelve a los mismos filtros, TanStack cancela la
 * peticion anterior cuando la clave cambia, y `keepPreviousData` mantiene los
 * KPIs visibles mientras llega el nuevo calculo.
 */
export const useKpiCalculations = () => {
  const [filters, setFilters] = useState<KpiFilters>({
    employees: [],
    startDate: null,
    endDate: null,
  });

  const { startDate, endDate } = filters;

  /**
   * La clave usa **ids** ordenados (no los objetos `Employee`): el objeto
   * completo inflaria la clave y haria que un reordenamiento de la lista
   * invalide la cache sin cambiar el resultado.
   */
  const employeeIds = useMemo(
    () => filters.employees.map((employee) => employee.id).sort(),
    [filters.employees],
  );

  const isRangeUsable = useMemo(() => {
    if (!startDate || !endDate) return false;
    if (filters.employees.length === 0) return false;
    return isDateRangeValid(startDate, endDate);
  }, [filters.employees.length, startDate, endDate]);

  const query = useQuery({
    queryKey: queryKeys.kpis({ startDate: startDate ?? "", endDate: endDate ?? "", employeeIds }),
    queryFn: () => {
      if (!startDate || !endDate) {
        throw new Error("Rango de fechas incompleto para el calculo de KPIs");
      }
      return runKpiCalculation({
        filters: { employees: filters.employees, startDate, endDate },
      });
    },
    enabled: isRangeUsable,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

  // Indicador global de "procesando" (lo consumia el fetch manual).
  useEffect(() => {
    if (!query.isFetching) return;
    const { incrementProcessing, decrementProcessing } = useStore.getState();
    incrementProcessing();
    return () => decrementProcessing();
  }, [query.isFetching]);

  /** Aplica los filtros: la query se invalida sola al cambiar la clave. */
  const calculateKpis = useCallback((nextFilters: KpiFilters) => {
    setFilters(nextFilters);
  }, []);

  // Sin filtros utilizables (rango vacio, invalido o sin empleados) los KPIs
  // valen cero: es el mismo contrato que devolvia el fetch manual.
  const kpis = isRangeUsable ? (query.data?.kpis ?? defaultKpis) : defaultKpis;
  const kpiDetails = isRangeUsable
    ? (query.data?.kpiDetails ?? defaultKpiDetails)
    : defaultKpiDetails;

  return {
    kpis,
    kpiDetails,
    isLoadingKpis: query.isFetching,
    calculateKpis,
  };
};
