import { useState, useCallback, useMemo } from "react";
import { useKpiCalculations } from "../../../hooks/useKpiCalculations";
import { Employee, DailyTimeRecord } from "../../../types";
import { isDateRangeValid } from "../../../utils/validation";

export interface KpisFilters {
  employees: Employee[];
  startDate: string | null;
  endDate: string | null;
}

export interface ModalData {
  title: string;
  data: (DailyTimeRecord | Employee | { id: string; employeeName: string; date: string })[];
  type: "record" | "employee" | "justification";
}

export const useKpisLogic = () => {
  const [filters, setFilters] = useState<KpisFilters>({
    employees: [],
    startDate: null,
    endDate: null,
  });

  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const { kpis, kpiDetails, isLoadingKpis, calculateKpis } = useKpiCalculations();

  const handleFiltersChange = useCallback(
    (newFilters: KpisFilters) => {
      let isValid = true;
      if (newFilters.startDate && newFilters.endDate) {
        isValid = isDateRangeValid(newFilters.startDate, newFilters.endDate);
        setIsDateRangeInvalid(!isValid);
      } else {
        setIsDateRangeInvalid(false);
      }
      setFilters(newFilters);

      if (isValid) {
        calculateKpis(newFilters);
      }
    },
    [calculateKpis],
  );

  const hasDetailData =
    kpiDetails.tardyRecords.length > 0 ||
    kpiDetails.absentEmployees.length > 0 ||
    kpiDetails.vacationRecords.length > 0 ||
    kpiDetails.medicalLeaveRecords.length > 0 ||
    kpiDetails.specialPermitRecords.length > 0;

  const hasAggregateData =
    kpis.tardinessCount > 0 ||
    kpis.absenceCount > 0 ||
    kpis.vacationCount > 0 ||
    kpis.medicalLeaveCount > 0 ||
    kpis.specialPermitCount > 0;

  const isNoDataPeriod =
    !isLoadingKpis &&
    Boolean(filters.startDate && filters.endDate) &&
    !hasDetailData &&
    !hasAggregateData;

  const handleKpiClick = useCallback(
    (
      title: string,
      data: (DailyTimeRecord | Employee | { id: string; employeeName: string; date: string })[],
      type: "record" | "employee" | "justification",
    ) => {
      if (data.length > 0) {
        setModalData({ title, data, type });
        setIsDetailsModalOpen(true);
      }
    },
    [],
  );

  const closeModal = useCallback(() => {
    setIsDetailsModalOpen(false);
  }, []);

  // ⚡ Bolt: Memoize kpiMetrics to prevent unnecessary re-renders of KpisTab and KpiStat components
  const kpiMetrics = useMemo(
    () => [
      { value: `${kpis.totalAbsenteeismRate.toFixed(2)}%`, label: "Tasa Ausentismo Total" },
      { value: `${kpis.unjustifiedAbsenceRate.toFixed(2)}%`, label: "Ausencias Injustificadas" },
      { value: `${kpis.justifiedAbsenceRate.toFixed(2)}%`, label: "Ausencias Justificadas" },
      { value: `${kpis.vacationRate.toFixed(2)}%`, label: "├─ Vacaciones" },
      { value: `${kpis.medicalLeaveRate.toFixed(2)}%`, label: "├─ Licencias Médicas" },
      { value: `${kpis.specialPermitRate.toFixed(2)}%`, label: "└─ Permisos Especiales" },
      { value: `${kpis.tardinessRate.toFixed(2)}%`, label: "Tasa de Atrasos" },
      { value: `${kpis.overtimePercentage.toFixed(2)}%`, label: "Incidencia Horas Extra" },
      { value: kpis.avgWeeklyHours.toFixed(2), label: "Promedio Horas Semanales" },
    ],
    [
      kpis.totalAbsenteeismRate,
      kpis.unjustifiedAbsenceRate,
      kpis.justifiedAbsenceRate,
      kpis.vacationRate,
      kpis.medicalLeaveRate,
      kpis.specialPermitRate,
      kpis.tardinessRate,
      kpis.overtimePercentage,
      kpis.avgWeeklyHours,
    ],
  );

  return {
    // Estado
    filters,
    isDateRangeInvalid,
    isDetailsModalOpen,
    modalData,
    isLoadingKpis,
    isNoDataPeriod,

    // Datos calculados
    kpis,
    kpiDetails,
    kpiMetrics,

    // Handlers
    handleFiltersChange,
    handleKpiClick,
    closeModal,
  };
};
