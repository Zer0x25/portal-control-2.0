import React, { useState, useEffect, FC } from "react";
import { useEmployees } from "../../../hooks/useEmployees";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { usePeriodNavigator } from "../../../hooks/usePeriodNavigator";
import { getBusinessDateRangePreset, getChileDateISO } from "../../../utils/dateUtils";
import {
  FunnelIcon,
  UsersIcon,
  MapPinIcon,
  CalendarDaysIcon,
} from "../../../components/ui/icons/index";
import { Employee } from "../../../types/index";
import CalendarMonthSelector from "../../../components/ui/CalendarMonthSelector";
import FilterSelect from "../../../components/ui/FilterSelect";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

interface KpiFilterPanelProps {
  onFiltersChange: (filters: {
    employees: Employee[];
    startDate: string | null;
    endDate: string | null;
  }) => void;
  isLoading?: boolean;
}

/**
 * 🛠️ KpiFilterPanel: Sistema de Filtrado Analítico
 * Refactorizado bajo el estándar Industrial-Elegant
 */
const KpiFilterPanel: FC<KpiFilterPanelProps> = ({ onFiltersChange, isLoading }) => {
  const businessNow = useBusinessNow({ tickMs: null });
  const periodNavigator = usePeriodNavigator("month");
  const { activeEmployees, isLoadingEmployees } = useEmployees();

  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedWorkdayType, setSelectedWorkdayType] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  type PeriodMode = "month" | "quarter" | "semester" | "year" | "custom";
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [customStartDate, setCustomStartDate] = useState<string>(getChileDateISO());
  const [customEndDate, setCustomEndDate] = useState<string>(getChileDateISO());

  const { startDate, endDate } = (() => {
    switch (periodMode) {
      case "custom":
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      case "quarter":
        return getBusinessDateRangePreset("quarter", businessNow);
      case "semester":
        return getBusinessDateRangePreset("semester", businessNow);
      case "year":
        return getBusinessDateRangePreset("year", businessNow);
      default: {
        return getBusinessDateRangePreset("month", periodNavigator.currentDate);
      }
    }
  })();

  useEffect(() => {
    setSelectedWorkdayType("");
    setSelectedArea("");
    setSelectedEmployeeId("");
  }, [startDate, endDate]);

  const employeesInDateRange = activeEmployees;

  const availableWorkdayTypes = Array.from(
    new Set(employeesInDateRange.map((e) => e.workdayType).filter(Boolean)),
  ).sort((a, b) => String(a).localeCompare(String(b))) as string[];

  const employeesAfterWorkdayTypeFilter = (() => {
    if (!selectedWorkdayType) return employeesInDateRange;
    return employeesInDateRange.filter((e) => e.workdayType === selectedWorkdayType);
  })();

  const availableAreas = Array.from(
    new Set(employeesAfterWorkdayTypeFilter.map((e) => e.area).filter(Boolean)),
  ).sort((a, b) => String(a).localeCompare(String(b))) as string[];

  const employeesForEmployeeDropdown = (() => {
    if (!selectedArea) return employeesAfterWorkdayTypeFilter;
    return employeesAfterWorkdayTypeFilter.filter((e) => e.area === selectedArea);
  })();

  const employeesToAnalyze = (() => {
    if (!selectedEmployeeId) return employeesForEmployeeDropdown;
    return employeesForEmployeeDropdown.filter((emp) => emp.id === selectedEmployeeId);
  })();

  const handleApplyFilters = () => {
    onFiltersChange({
      employees: employeesToAnalyze,
      startDate,
      endDate,
    });
  };

  const handleMonthChange = (newDate: Date) => {
    periodNavigator.setCurrentDate(newDate);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(periodNavigator.currentDate);
    newDate.setUTCMonth(newDate.getUTCMonth() - 1);
    handleMonthChange(newDate);
  };

  const handleNextMonth = () => {
    if (periodNavigator.isViewingCurrentPeriod) return;
    periodNavigator.handleNext();
  };

  if (isLoadingEmployees)
    return (
      <div className="p-8 text-center text-token-text-tertiary font-black uppercase tracking-widest text-[10px] animate-pulse">
        Sincronizando parámetros de equipo...
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Search Header and Period Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-token-border-subtle pb-6 gap-6">
        <h2 className="text-[11px] font-black text-token-accent-brand uppercase tracking-[0.2em] flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-token-accent-brand animate-pulse" />
          Análisis Operativo Estratégico
        </h2>

        <div className="flex flex-wrap bg-token-surface-stripe p-1 rounded-sm border border-token-border-technical">
          {(["month", "quarter", "semester", "year", "custom"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={periodMode === mode}
              onClick={() => setPeriodMode(mode)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm ${
                periodMode === mode
                  ? "bg-token-accent-brand text-token-text-onAccent shadow-sm"
                  : "text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-active"
              }`}
            >
              {mode === "month" && "Mensual"}
              {mode === "quarter" && "Trimestral"}
              {mode === "semester" && "Semestral"}
              {mode === "year" && "Anual"}
              {mode === "custom" && "Personalizado"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-end gap-10">
        <div className="min-w-0 shrink-0">
          {periodMode === "month" ? (
            <CalendarMonthSelector
              currentDate={periodNavigator.currentDate}
              onChange={handleMonthChange}
              label="VENTANA CRONOLÓGICA"
              viewMode="month"
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
            />
          ) : periodMode === "custom" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-token-surface-card p-5 rounded-sm border border-token-accent-brand/20 shadow-sm animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="min-w-0 space-y-1.5">
                <label
                  htmlFor="kpi-custom-start"
                  className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest ml-1"
                >
                  Inicio
                </label>
                <input
                  id="kpi-custom-start"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-token-surface-stripe border border-token-border-technical rounded-sm px-4 py-2 text-[11px] font-bold text-token-text-primary focus:ring-1 focus:ring-token-accent-brand outline-none transition-all uppercase"
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <label
                  htmlFor="kpi-custom-end"
                  className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest ml-1"
                >
                  Término
                </label>
                <input
                  id="kpi-custom-end"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-token-surface-stripe border border-token-border-technical rounded-sm px-4 py-2 text-[11px] font-bold text-token-text-primary focus:ring-1 focus:ring-token-accent-brand outline-none transition-all uppercase"
                />
              </div>
            </div>
          ) : (
            <div className="bg-token-accent-brand/3 border border-token-accent-brand/10 p-5 rounded-sm flex flex-col justify-center min-w-[200px] h-[78px] animate-in fade-in duration-500">
              <span className="text-[10px] font-black text-token-accent-brand uppercase tracking-widest opacity-60">
                Periodo Automático
              </span>
              <span className="text-[13px] font-bold text-token-text-primary uppercase mt-1">
                {periodMode === "quarter" && "Trimestre Actual"}
                {periodMode === "semester" && "Semestre Actual"}
                {periodMode === "year" && `Año Fiscal ${businessNow.getFullYear()}`}
              </span>
            </div>
          )}
        </div>

        <div className="grow grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <FilterSelect
            id="kpi-workday-type"
            label="Tipo de Jornada"
            icon={<FunnelIcon className="w-4 h-4" />}
            value={selectedWorkdayType}
            onChange={(e) => setSelectedWorkdayType(e.target.value)}
            options={[
              { value: "", label: "Todas las Jornadas" },
              ...availableWorkdayTypes.map((t) => ({ value: t, label: t })),
            ]}
          />

          <FilterSelect
            id="kpi-area"
            label="Filtrar por Área"
            icon={<MapPinIcon className="w-4 h-4" />}
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            options={[
              { value: "", label: "Todas las Áreas" },
              ...availableAreas.map((a) => ({ value: a, label: a })),
            ]}
          />

          <FilterSelect
            id="kpi-employee"
            label="Especificar Colaborador"
            icon={<UsersIcon className="w-4 h-4" />}
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            containerClassName="md:col-span-1 xl:col-span-2"
            options={[
              { value: "", label: "Todos los Empleados" },
              ...employeesForEmployeeDropdown.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleApplyFilters}
          disabled={isLoading}
          className={`group relative flex items-center gap-3 px-8 py-3.5 rounded-sm font-black text-[12px] uppercase tracking-[0.15em] shadow-lg transition duration-300 ${
            isLoading
              ? "bg-token-accent-brand text-token-text-onAccent cursor-not-allowed shadow-none opacity-60"
              : "bg-token-accent-brand text-token-text-onAccent shadow-token-accent-brand/20 hover:bg-token-accent-brand/90 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
          {isLoading ? (
            <LoadingSpinner size="xs" variant="onAccent" />
          ) : (
            <CalendarDaysIcon className="w-4 h-4" />
          )}
          {isLoading ? "Calculando..." : "Calcular Métricas"}
          <div
            className={`w-1.5 h-1.5 rounded-full bg-white ml-1 ${
              isLoading ? "animate-bounce" : "animate-pulse"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default KpiFilterPanel;
