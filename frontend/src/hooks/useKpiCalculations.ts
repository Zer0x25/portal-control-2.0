import { useState } from "react";
import { useStore } from "../store/useStore";
import { Employee } from "../types/index";
import { isDateRangeValid } from "../utils/validation";
import { runKpiCalculation } from "../services/kpiService";

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

const defaultKpiDetails: import("../types/index").KpiDetails = {
  tardyRecords: [],
  absentEmployees: [],
  vacationRecords: [],
  medicalLeaveRecords: [],
  specialPermitRecords: [],
};

export const useKpiCalculations = () => {
  const [kpis, setKpis] = useState(defaultKpis);
  const [kpiDetails, setKpiDetails] = useState(defaultKpiDetails);
  const [isLoadingKpis, setIsLoadingKpis] = useState(false);

  const calculateKpis = async (filters: KpiFilters) => {
    const { employees, startDate, endDate } = filters;
    if (!employees.length || !startDate || !endDate) {
      setKpis(defaultKpis);
      setKpiDetails(defaultKpiDetails);
      setIsLoadingKpis(false);
      return;
    }

    const startDateStr = startDate;
    const endDateStr = endDate;

    if (!isDateRangeValid(startDateStr, endDateStr)) {
      setKpis(defaultKpis);
      setKpiDetails(defaultKpiDetails);
      setIsLoadingKpis(false);
      return;
    }

    setIsLoadingKpis(true);
    const { incrementProcessing, decrementProcessing } = useStore.getState();
    incrementProcessing();

    try {
      // Calling the service which now hits the backend API
      // We don't need to pass all scheduling data anymore, just filters
      const result = await runKpiCalculation({
        filters: { employees, startDate, endDate },
      });

      setKpis(result.kpis);
      setKpiDetails(result.kpiDetails);
    } catch (error) {
      console.error("Failed to fetch/calculate KPIs:", error);
      setKpis(defaultKpis);
      setKpiDetails(defaultKpiDetails);
    } finally {
      setIsLoadingKpis(false);
      decrementProcessing();
    }
  };

  return { kpis, kpiDetails, isLoadingKpis, calculateKpis };
};
